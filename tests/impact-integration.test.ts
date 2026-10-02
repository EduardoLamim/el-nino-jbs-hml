import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { criarHandler } from '../supabase/functions/impacto-jbs/handler';
import { ImpactoStore, type ImpactBackend } from '../src/services/impact';
import type { ComandoImpacto } from '../src/domain/impact';

it('integra store → handler real → RPC PostgreSQL → histórico; dois clientes reconciliam', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated;');
    await db.exec(readFileSync('supabase/migrations/202610020001_impactos_jbs.sql','utf8'));
    const token = randomBytes(48).toString('hex'); const pin = randomUUID(); const apikey = 'publica-simulada';
    await db.query('insert into jbs_private.backend_credential(token_sha256) values($1)', [createHash('sha256').update(token).digest('hex')]);
    const handler = criarHandler({ pin, apikey, origin: 'https://teste.example' }, {
      tentar: async () => (await db.query<{ ok: boolean }>('select public.jbs_impacto_tentativa($1) ok', [token])).rows[0]!.ok,
      escrever: async p => (await db.query<{ r: unknown }>('select public.jbs_impacto_escrever($1,$2,$3,$4,$5,$6) r',
        [token,p.action,p.tipo,p.responsavel,p.observacao,p.impacto_id])).rows[0]!.r,
    });
    const backend: ImpactBackend = {
      consultar: async () => (await db.query<{ r: unknown }>('select to_jsonb(p) r from public.impacto_jbs_publico p')).rows[0]!.r,
      executar: async (comando: ComandoImpacto) => {
        const r = await handler(new Request('https://edge.example', { method: 'POST', headers: { apikey, 'content-type': 'application/json' }, body: JSON.stringify(comando) }));
        if (!r.ok) throw new Error('Operação não confirmada'); return r.json();
      },
      assinar: () => () => {},
    };
    const a = new ImpactoStore(backend); const b = new ImpactoStore(backend);
    await a.reconciliar(); await b.reconciliar(); expect(a.estado.dado?.ativo).toBe(false);
    await expect(a.executar({ action: 'ativar', pin: 'incorreto', tipo: 'alagamento_terminal', responsavel: 'Teste' })).rejects.toThrow();
    expect((await db.query('select * from jbs_private.impactos_jbs')).rows).toHaveLength(0);
    await a.executar({ action: 'ativar', pin, tipo: 'alagamento_terminal', responsavel: 'Teste' });
    expect(a.estado.dado?.ativo).toBe(true);
    await b.reconciliar(); expect(b.estado.dado).toEqual(a.estado.dado);
    const id = a.estado.dado!.impacto_id!;
    await b.executar({ action: 'encerrar', pin, impacto_id: id, responsavel: 'Outro teste' });
    await a.reconciliar(); expect(a.estado.dado?.ativo).toBe(false);
    const history = (await db.query<{ encerrado_em: string }>('select encerrado_em from jbs_private.impactos_jbs')).rows;
    expect(history).toHaveLength(1); expect(history[0]!.encerrado_em).toBeTruthy();
  } finally { await db.close(); }
}, 30000);
