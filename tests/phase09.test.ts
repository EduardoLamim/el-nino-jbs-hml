import { readFile, writeFile, mkdtemp, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { coletar } from '../scripts/collectors/pipeline';
import { urls, urlPrevisaoEpagri } from '../scripts/collectors/sources';
import { aplicarMotor } from '../src/domain/alert-engine';
import { parseStatus, type Status } from '../src/domain/contracts';
import { atualizar } from '../scripts/automation/update';
import { validarDados } from '../scripts/automation/validate';
import rios from './fixtures/rios.json';
import chuvas from './fixtures/chuvas.json';
import barragens from './fixtures/barragens.json';
import situacao from './fixtures/situacao-atencao.json';
import alertas from './fixtures/alertas-null.json';
import municipio from './fixtures/epagri-municipio.json';
import previsao from './fixtures/epagri-itajai.json';
import snapshot from './fixtures/status-operacional.json';

const html = (value: unknown) => `<div id="app" data-page="${JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></div>`;
const respostas = new Map<string, string>([[urls.situacao_atual, JSON.stringify(situacao)], [urls.alertas_ativo, JSON.stringify(alertas)], [urls.rios, html(rios)], [urls.chuvas, html(chuvas)], [urls.barragens, html(barragens)], [urls.epagri, JSON.stringify(municipio)], [urlPrevisaoEpagri, JSON.stringify(previsao)]]);
const dirs: string[] = [];
async function dir() { const d = await mkdtemp(join(tmpdir(), 'jbs-hml-test-')); dirs.push(d); return d; }
afterEach(async () => { for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });

it.each([...Object.keys(urls), 'todas'])('HML: indisponibilidade controlada de %s mantém semântica aprovada', async id => {
  const s = await coletar(async url => {
    if (id === 'todas' || url === urls[id as keyof typeof urls] || id === 'epagri' && url === urlPrevisaoEpagri) return new Response('MOCK/HML indisponível', { status: 503 });
    if (!respostas.has(url)) throw new Error('Consulta não prevista');
    return new Response(respostas.get(url));
  }, snapshot);
  expect(parseStatus(s)).toEqual(s);
  const fontes = id === 'todas' ? Object.values(s.fontes) : [s.fontes[id]!];
  expect(fontes.every(f => f.resultado === 'falha' && f.qualidade === 'indisponivel')).toBe(true);
  expect(s.qualidade_monitoramento.estado).not.toBe('atualizado');
  expect(s.nivel_jbs.nivel).toBe('atencao');
  if (id === 'situacao_atual' || id === 'todas') expect(s.motor!.situacao_oficial).toMatchObject({ nivel: 'atencao', stale: true });
  if (id === 'rios' || id === 'todas') { expect(s.rios).toEqual({}); expect(s.motor!.rios.DC01).toMatchObject({ nivel: 'atencao', stale: true }); }
  if (id === 'chuvas' || id === 'todas') expect(s.chuvas).toEqual({});
  if (id === 'barragens' || id === 'todas') expect(s.barragens).toEqual({});
  if (id === 'epagri' || id === 'todas') expect(s.previsao).toMatchObject({ disponibilidade: 'indisponivel', dias: [] });
});

it.each([[2.5, 'alerta'], [3.5, 'emergencia'], [0, 'normalidade']] as const)('HML: estação %s desaparece sem perder estado conhecido nem qualidade', async (nivel, esperado) => {
  const s = parseStatus(snapshot); delete s.motor; s.atualizado_em = '2026-10-01T20:00:00.000Z';
  for (const r of Object.values(s.rios)) if (r) Object.assign(r, { nivel_m: r.codigo === 'DC01' ? nivel : 0, medido_em: '2026-10-01T19:50:00Z', qualidade: 'atualizado', serie_12h: [], limites: { atencao_m: 1, alerta_m: 2, emergencia_m: 3 } });
  const anterior = aplicarMotor(s);
  const novo = structuredClone(s); novo.atualizado_em = '2026-10-01T20:10:00.000Z'; delete novo.rios.DC01;
  const result = aplicarMotor(novo, anterior);
  expect(result.motor!.rios.DC01).toMatchObject({ nivel: esperado, stale: true });
  expect(result.motor!.rios.DC01!.ultima_valida).toEqual(anterior.motor!.rios.DC01!.ultima_valida);
  expect(result.qualidade_monitoramento.estado).not.toBe('atualizado');
});

it('HML: snapshot ausente aborta antes de adquirir fontes', async () => {
  const pipeline = vi.fn();
  await expect(atualizar(join(await dir(), 'ausente.json'), pipeline)).rejects.toThrow();
  expect(pipeline).not.toHaveBeenCalled();
});
it('HML: memória de saída incompleta não substitui snapshot válido', async () => {
  const file = join(await dir(), 'status.json'); const before = JSON.stringify(snapshot); await writeFile(file, before);
  await expect(atualizar(file, async () => { const s = parseStatus(snapshot); s.atualizado_em = '2026-10-01T21:00:00.000Z'; s.motor!.avaliado_em = s.atualizado_em; delete s.motor!.rios.DC11; return s as Status; })).rejects.toThrow();
  expect(await readFile(file, 'utf8')).toBe(before);
});
it.each(['territorio', 'bairros'])('HML: corrupção territorial %s é detectada antes de publicação', async tipo => {
  const d = await dir(); await cp('public/data', join(d, 'data'), { recursive: true });
  const file = join(d, 'data', tipo === 'territorio' ? 'territorio.json' : 'bairros.geojson');
  const value = JSON.parse(await readFile(file, 'utf8'));
  if (tipo === 'territorio') value.bairros[0].colaboradores_jbs += 1; else value.features[0].geometry.coordinates = [];
  await writeFile(file, JSON.stringify(value)); await expect(validarDados(d)).rejects.toThrow();
});
