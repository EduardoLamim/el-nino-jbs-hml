import { mkdtemp, readFile, writeFile, rm, mkdir, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { atualizar } from '../scripts/automation/update';
import { validarStatusPublicavel } from '../scripts/automation/status';
import { basePages, validarAmbientePublico } from '../scripts/automation/pages-config';
import { validarArtefato, verificarConteudoPublico } from '../scripts/automation/validate';
import { aplicarMotor } from '../src/domain/alert-engine';
import { parseStatus, type Status } from '../src/domain/contracts';
import { coletar } from '../scripts/collectors/pipeline';

const dirs: string[] = [];
async function dir() { const d = await mkdtemp(join(tmpdir(), 'jbs-phase08-')); dirs.push(d); return d; }
afterEach(async () => { vi.useRealTimers(); for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });
const time = (min: number) => new Date(Date.UTC(2026, 9, 1, 20, min)).toISOString();
async function entrada(min = 0, nivel = 2.5, qualidade: 'atualizado' | 'atrasado' = 'atualizado') {
  const s = parseStatus(JSON.parse(await readFile('tests/fixtures/status-operacional.json', 'utf8')));
  s.atualizado_em = time(min); delete s.motor;
  for (const f of Object.values(s.fontes)) { f.coletado_em = time(min); f.requisicoes?.forEach(r => { r.coletado_em = time(min); }); }
  s.situacao_oficial = { flag: 'Normalidade', conteudo: 'Fixture', atualizado_em: time(min), qualidade: null };
  for (const r of Object.values(s.rios)) if (r) Object.assign(r, { nivel_m: r.codigo === 'DC01' ? nivel : 0, limites: { atencao_m: 1, alerta_m: 2, emergencia_m: 3 }, medido_em: time(min), qualidade, serie_12h: [], atualizacao_esperada_segundos: 600 });
  return s;
}
async function snapshot() { const file = join(await dir(), 'status.json'); const seed = aplicarMotor(await entrada()); await writeFile(file, JSON.stringify(seed)); return { file, seed }; }
const passo = (min: number, nivel = 0, qualidade: 'atualizado' | 'atrasado' = 'atualizado') => async (_: unknown, prev: unknown) => aplicarMotor(await entrada(min, nivel, qualidade), prev);

describe('Fase 08 — publicação e continuidade', () => {
  it('lê o snapshot completo entre processos e reduz só na terceira leitura', async () => {
    const { file } = await snapshot();
    for (const [min, count, nivel] of [[10, 1, 'alerta'], [20, 2, 'alerta'], [30, 0, 'atencao']] as const) {
      const next = await atualizar(file, passo(min));
      expect(next.motor!.rios.DC01).toMatchObject({ nivel, normalizacao: { leituras_abaixo: count } });
      expect(validarStatusPublicavel(JSON.parse(await readFile(file, 'utf8')))).toEqual(next);
    }
  });
  it('preserva escalada com atraso e bloqueia downgrade, sem redesenhar o motor', async () => {
    const { file } = await snapshot();
    expect((await atualizar(file, passo(10, 3, 'atrasado'))).motor!.rios.DC01).toMatchObject({ nivel: 'emergencia', stale: true });
    expect((await atualizar(file, passo(20, 0, 'atrasado'))).motor!.rios.DC01).toMatchObject({ nivel: 'emergencia', stale: true, normalizacao: { leituras_abaixo: 0 } });
  });
  it('intervalo excedido continua reiniciando a sequência; schedule não fabrica leituras', async () => {
    const { file } = await snapshot();
    await atualizar(file, passo(10));
    expect((await atualizar(file, passo(25))).motor!.rios.DC01).toMatchObject({ nivel: 'alerta', normalizacao: { leituras_abaixo: 1 } });
  });
  it('falha real do pipeline com transporte simulado retém risco e não inventa medições', async () => {
    const { file } = await snapshot();
    const next = await atualizar(file, (_, prev) => coletar(async () => { throw new Error('Fixture indisponível'); }, prev));
    expect(next.nivel_jbs.nivel).toBe('alerta'); expect(next.motor!.rios.DC01!.stale).toBe(true);
    expect(next.rios).toEqual({}); expect(next.chuvas).toEqual({}); expect(next.barragens).toEqual({});
    expect(next.previsao.disponibilidade).toBe('indisponivel'); expect(next.qualidade_monitoramento.estado).toBe('degradado');
    expect(Object.values(next.fontes).every(f => f.resultado === 'falha')).toBe(true);
  });
  it.each(['schema', 'timestamp', 'fontes', 'motor', 'nivel', 'antigo'])('rejeita saída %s preservando o último arquivo', async falha => {
    const { file, seed } = await snapshot(), before = await readFile(file, 'utf8');
    await expect(atualizar(file, async () => {
      const s = aplicarMotor(await entrada(10), seed);
      if (falha === 'schema') return {} as Status;
      if (falha === 'timestamp') s.atualizado_em = 'inválido';
      if (falha === 'fontes') delete s.fontes.rios;
      if (falha === 'motor') delete s.motor;
      if (falha === 'nivel') s.nivel_jbs.nivel = 'normalidade';
      return falha === 'antigo' ? seed : s;
    })).rejects.toThrow();
    expect(await readFile(file, 'utf8')).toBe(before);
  });
  it('corrupção anterior aborta antes de consultar fontes', async () => {
    const { file } = await snapshot(); await writeFile(file, '{'); const pipeline = vi.fn();
    await expect(atualizar(file, pipeline)).rejects.toThrow(); expect(pipeline).not.toHaveBeenCalled();
  });
  it('erro de coleta e alteração concorrente não sobrescrevem snapshot', async () => {
    const { file, seed } = await snapshot();
    await expect(atualizar(file, async () => { throw new Error('falha fatal'); })).rejects.toThrow('falha fatal');
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(seed);
    await expect(atualizar(file, async (_, prev) => { await writeFile(file, 'outro escritor'); return aplicarMotor(await entrada(10), prev); })).rejects.toThrow('mudou');
    expect(await readFile(file, 'utf8')).toBe('outro escritor');
  });
});

describe('Fase 08 — Pages e artefato', () => {
  it('resolve subpath do repositório, raiz de usuário e override explícito', () => {
    expect(basePages({ GITHUB_REPOSITORY: 'owner/painel' })).toBe('/painel/');
    expect(basePages({ GITHUB_REPOSITORY: 'owner/owner.github.io' })).toBe('/');
    expect(basePages({ PAGES_BASE_PATH: '/hml/painel/' })).toBe('/hml/painel/');
    expect(() => basePages({ PAGES_BASE_PATH: 'https://other.test/' })).toThrow();
    expect(() => basePages({ PAGES_BASE_PATH: '/../' })).toThrow();
  });
  it('aceita apenas par público e exige configuração para publicação', () => {
    expect(() => validarAmbientePublico({})).not.toThrow();
    expect(() => validarAmbientePublico({}, true)).toThrow();
    expect(() => validarAmbientePublico({ VITE_PIN: 'fixture' })).toThrow();
    expect(() => validarAmbientePublico({ VITE_SUPABASE_URL: 'https://ufeahglxwygvlugfsopi.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_fixture' })).toThrow();
    expect(() => validarAmbientePublico({ VITE_SUPABASE_URL: 'https://ufeahglxwygvlugfsopi.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' }, true)).not.toThrow();
  });
  it('detecta credenciais privadas sem confundir rótulo PIN com valor secreto', () => {
    expect(() => verificarConteudoPublico('PIN inválido; sb_publishable_fixture', {})).not.toThrow();
    for (const text of ['sb_secret_fixture', '-----BEGIN PRIVATE KEY-----', `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role"}').toString('base64url')}.abcdef`]) expect(() => verificarConteudoPublico(text, {})).toThrow();
    expect(() => verificarConteudoPublico('token-de-teste', { JBS_IMPACT_BACKEND_TOKEN: 'token-de-teste' })).toThrow();
  });
  async function artifact() {
    const d = await dir(); await cp('public/data', join(d, 'data'), { recursive: true }); await mkdir(join(d, 'assets')); await mkdir(join(d, '.vite'));
    await writeFile(join(d, 'index.html'), '<script src="/painel/assets/main.js"></script><link href="/painel/assets/main.css">');
    await writeFile(join(d, 'assets/main.js'), '/* fixture */'); await writeFile(join(d, 'assets/main.css'), 'body {}');
    await writeFile(join(d, '.vite/manifest.json'), JSON.stringify({ 'index.html': { file: 'assets/main.js', css: ['assets/main.css'], dynamicImports: ['src/pages/TerritoryMap.tsx'] }, 'src/pages/TerritoryMap.tsx': { file: 'assets/main.js' } }));
    return d;
  }
  it('valida o conjunto completo de dados e referências sob subpath', async () => {
    expect((await validarArtefato(await artifact(), '/painel/')).arquivos).toBe(19);
  });
  it.each(['path', 'chunk', 'geometria', 'env', 'segredo', 'status'])('bloqueia artefato com falha em %s', async falha => {
    const d = await artifact();
    if (falha === 'path') await writeFile(join(d, 'index.html'), '<script src="/assets/main.js"></script><link href="/painel/assets/main.css">');
    if (falha === 'chunk') await rm(join(d, 'assets/main.js'));
    if (falha === 'geometria') { const m = JSON.parse(await readFile(join(d, 'data/historico/manifesto.json'), 'utf8')); await writeFile(join(d, 'data/historico', m.arquivos[0].arquivo), '{}'); }
    if (falha === 'env') await writeFile(join(d, '.env'), 'TEST=fixture');
    if (falha === 'segredo') await writeFile(join(d, 'assets/main.js'), 'sb_secret_fixture');
    if (falha === 'status') await writeFile(join(d, 'data/status.json'), '{}');
    await expect(validarArtefato(d, '/painel/')).rejects.toThrow();
  });
});
