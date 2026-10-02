import { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
let db: PGlite;
const token = randomBytes(48).toString('hex');
const sql = readFileSync('supabase/migrations/202610020001_impactos_jbs.sql', 'utf8');
const ativar = (tipo = 'alagamento_terminal', responsavel = 'Teste') => db.query<{ estado: { impacto_id: string; ativo: boolean } }>(
  'select public.jbs_impacto_escrever($1,$2,$3,$4,$5,$6) as estado', [token, 'ativar', tipo, responsavel, null, null]);
const encerrar = (id: string) => db.query<{ estado: { ativo: boolean } }>('select public.jbs_impacto_escrever($1,$2,$3,$4,$5,$6) as estado', [token, 'encerrar', null, 'Teste encerramento', 'Resolvido', id]);
beforeAll(async () => { db = new PGlite(); await db.exec('create role anon; create role authenticated;'); await db.exec(sql); }, 30000);
beforeEach(async () => {
  await db.exec('reset role; truncate jbs_private.impactos_jbs, jbs_private.backend_credential, jbs_private.limite_tentativas; update public.impacto_jbs_publico set ativo=false, impacto_id=null, tipo=null, acionado_em=null, revisao=0;');
  await db.query('insert into jbs_private.backend_credential(token_sha256) values($1)', [createHash('sha256').update(token).digest('hex')]);
});
afterAll(async () => { await db.close(); });
describe('PostgreSQL real em WASM — migration, RLS e persistência', () => {
  it('persiste ativação/encerramento, timestamps server-side e histórico', async () => {
    const r = await ativar(); const id = r.rows[0]!.estado.impacto_id; expect(r.rows[0]!.estado.ativo).toBe(true);
    expect((await encerrar(id)).rows[0]!.estado.ativo).toBe(false);
    const h = await db.query<{ encerrado_em: string; created_at: string; responsavel_encerramento: string }>('select * from jbs_private.impactos_jbs');
    expect(h.rows).toHaveLength(1); expect(h.rows[0]!.encerrado_em).toBeTruthy(); expect(h.rows[0]!.created_at).toBeTruthy();
    expect(h.rows[0]!.responsavel_encerramento).toBe('Teste encerramento');
    expect((await encerrar(id)).rows[0]!.estado.ativo).toBe(false);
  });
  it('banco valida tipo/responsável e índice impede segundo ativo mesmo fora da RPC', async () => {
    await expect(ativar('bairro_alagado')).rejects.toThrow(); await expect(ativar('alagamento_terminal',' ')).rejects.toThrow();
    await ativar(); await expect(ativar()).rejects.toThrow();
    await expect(db.exec("insert into jbs_private.impactos_jbs(tipo,responsavel_acionamento) values('alagamento_terminal','Outro')")).rejects.toThrow();
  });
  it('duas solicitações disputando ativação resultam em uma única confirmação', async () => {
    const results = await Promise.allSettled([ativar(), ativar()]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await db.query<{ n: number }>('select count(*)::int n from jbs_private.impactos_jbs where encerrado_em is null')).rows[0]!.n).toBe(1);
  });
  it('encerramento antigo não fecha impacto novo', async () => {
    const antigo = (await ativar()).rows[0]!.estado.impacto_id; await encerrar(antigo);
    const novo = (await ativar()).rows[0]!.estado.impacto_id;
    await expect(encerrar(antigo)).rejects.toThrow(); await expect(encerrar(randomUUID())).rejects.toThrow();
    expect((await db.query<{ impacto_id: string }>('select impacto_id from public.impacto_jbs_publico')).rows[0]!.impacto_id).toBe(novo);
  });
  it('anon e authenticated leem só snapshot e não escrevem nem consultam histórico', async () => {
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      expect((await db.query('select * from public.impacto_jbs_publico')).rows).toHaveLength(1);
      for (const statement of ['select * from jbs_private.impactos_jbs', 'select * from jbs_private.backend_credential',
        'delete from public.impacto_jbs_publico', 'update public.impacto_jbs_publico set ativo=false',
        'insert into public.impacto_jbs_publico(id,ativo) values(1,false)']) await expect(db.exec(statement)).rejects.toThrow();
      await expect(db.query('select public.jbs_impacto_tentativa($1)', ['credencial-invalida'])).rejects.toThrow();
      await expect(db.query('select public.jbs_impacto_escrever($1,$2,$3,$4,$5,$6)', ['invalida','ativar','alagamento_terminal','Teste',null,null])).rejects.toThrow();
      await db.exec('reset role');
    }
  });
  it('limite de tentativas é compartilhado e nenhuma tabela contém campo PIN', async () => {
    for (let i = 1; i <= 21; i++) {
      const r = await db.query<{ ok: boolean }>('select public.jbs_impacto_tentativa($1) ok', [token]);
      expect(r.rows[0]!.ok).toBe(i <= 20);
    }
    expect((await db.query("select column_name from information_schema.columns where table_schema in ('jbs_private','public') and column_name ilike '%pin%'")).rows).toHaveLength(0);
  });
});
