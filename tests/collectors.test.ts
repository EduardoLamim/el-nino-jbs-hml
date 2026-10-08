import { describe, expect, it } from 'vitest';
import rios from './fixtures/rios.json';
import chuvas from './fixtures/chuvas.json';
import barragens from './fixtures/barragens.json';
import situacao from './fixtures/situacao-atencao.json';
import alertas from './fixtures/alertas-null.json';
import { extrairPagina } from '../scripts/collectors/structured';
import { normalizarAlertas, normalizarBarragens, normalizarChuvas, normalizarRios, normalizarSituacao } from '../scripts/collectors/normalize';
import previsaoEpagri from './fixtures/epagri-itajai.json';
import municipioEpagri from './fixtures/epagri-municipio.json';
import { coletar } from '../scripts/collectors/pipeline';
import { criarHttp, type Requisicao, type Transport } from '../scripts/collectors/http';
import { urls, urlPrevisaoEpagri } from '../scripts/collectors/sources';
import { parseStatus } from '../src/domain/contracts';

const html = (page: unknown) => `<html><div data-page="${JSON.stringify(page).replaceAll('&', '&amp;').replaceAll('"', '&quot;')}" id="app"></div></html>`;
const respostas = new Map<string, string>([
  [urls.situacao_atual, JSON.stringify(situacao)], [urls.alertas_ativo, JSON.stringify(alertas)],
  [urls.rios, html(rios)], [urls.chuvas, html(chuvas)], [urls.barragens, html(barragens)],
  [urls.epagri, JSON.stringify(municipioEpagri)], [urlPrevisaoEpagri, JSON.stringify(previsaoEpagri)],
]);
const transport: Transport = async url => {
  const body = respostas.get(url);
  if (!body) throw new Error(`Requisição inesperada: ${url}`);
  return new Response(body);
};

describe('Defesa Civil — formatos observados', () => {
  it.each(['Normalidade', 'Atenção'])('normaliza flag %s sem interpretar texto', flag => {
    expect(normalizarSituacao({ data: { ...situacao.data, flag } }).flag).toBe(flag);
  });
  it('preserva Unicode, texto e offset sem supor qualidade temporal', () => {
    expect(normalizarSituacao(situacao)).toEqual({ ...situacao.data, qualidade: null });
  });
  it('rejeita flag desconhecida e campo obrigatório ausente', () => {
    expect(() => normalizarSituacao({ data: { ...situacao.data, flag: 'Outro' } })).toThrow();
    expect(() => normalizarSituacao({ data: { flag: 'Normalidade' } })).toThrow();
  });
  it('aceita data=null e preserva alerta desconhecido como texto JSON inerte', () => {
    expect(normalizarAlertas(alertas)).toEqual({ alertas: null, bruto: undefined, avisos: [] });
    const payload = { data: { desconhecido: '<script>MOCK</script>', flag: 'inventada' } };
    expect(JSON.parse(normalizarAlertas(payload).bruto!)).toEqual(payload.data);
    expect(normalizarAlertas(payload).alertas).toBeNull();
    expect(() => normalizarAlertas({})).toThrow();
  });
  it('extrai o JSON embutido com entidades e qualquer ordem de atributos', () => {
    expect(extrairPagina(html(rios), 'rios')).toEqual(rios.props.estacoes);
    expect(() => extrairPagina(html(rios), 'chuvas')).toThrow();
    expect(() => extrairPagina('<div id="app" data-page="{erro}"></div>', 'rios')).toThrow();
    expect(() => extrairPagina(html(rios) + html(rios), 'rios')).toThrow();
    expect(() => extrairPagina(html({ ...rios, props: { ...rios.props, municipioId: 2 } }), 'rios')).toThrow();
  });
  it('normaliza DC01–DC11 e preserva limites e TODAS as leituras', () => {
    const dados = normalizarRios(extrairPagina(html(rios), 'rios'));
    expect(Object.keys(dados.rios)).toHaveLength(11);
    for (const original of rios.props.estacoes) {
      const e = dados.rios[original.codigo]!;
      expect(e.limites).toEqual({ atencao_m: original.atencao_m, alerta_m: original.alerta_m, emergencia_m: original.emergencia_m });
      expect(e.serie_12h).toEqual(original.serie_12_h.map(p => ({ medido_em: p.medido_em, nivel_m: p.nivel_rio_m, qualidade: null })));
      expect(e.tendencia).toBe(original.tendencia);
      expect(e.qualidade_fonte).toEqual(original.qualidade);
    }
  });
  it('usa limites dinâmicos e sinaliza estação ausente', () => {
    const primeiro = { ...rios.props.estacoes[0]!, atencao_m: 123.456 };
    const dados = normalizarRios([primeiro]);
    expect(dados.rios.DC01?.limites.atencao_m).toBe(123.456);
    expect(dados.avisos[0]).toContain('DC02');
    expect(() => normalizarRios([primeiro, primeiro])).toThrow();
  });
  it('mantém posições de amostras inválidas como null em vez de removê-las', () => {
    const e = { ...rios.props.estacoes[0]!, serie_12_h: [
      { medido_em: '2026-10-01T12:00:00Z', nivel_rio_m: 1 },
      { medido_em: '2026-10-01T12:10:00Z', nivel_rio_m: 'inválido' },
      { medido_em: 'inválido', nivel_rio_m: 1 },
      { medido_em: '2026-10-01T12:30:00Z', nivel_rio_m: 1, qualidade: null },
    ] };
    const serie = normalizarRios([e]).rios.DC01!.serie_12h;
    expect(serie).toHaveLength(4);
    expect(serie[1]).toMatchObject({ nivel_m: null, qualidade: 'indisponivel' });
    expect(serie[2]).toMatchObject({ medido_em: null, qualidade: 'indisponivel' });
    expect(serie[3]?.qualidade).toBeNull();
  });
  it('preserva acumulados oficiais, séries de chuva e ausência de campos', () => {
    const dados = normalizarChuvas(chuvas.props.estacoes);
    expect(Object.keys(dados)).toHaveLength(12);
    for (const e of chuvas.props.estacoes) {
      expect(dados[e.codigo]?.chuva_24_h_mm).toBe(e.chuva_24_h_mm);
      expect(dados[e.codigo]?.chuva_48_h_mm).toBe(e.chuva_48_h_mm);
      expect(dados[e.codigo]?.chuva_6_h_mm).toBeNull();
      expect(dados[e.codigo]?.chuva_mm_h).toBeNull();
      expect(dados[e.codigo]?.serie_12h).toEqual(e.serie_12_h.map(p => ({ ...p, qualidade: null })));
    }
  });
  it('preserva comportas nulas, atraso oficial e série das barragens', () => {
    const dados = normalizarBarragens(barragens.props.estacoes);
    expect(Object.keys(dados)).toHaveLength(3);
    expect(dados.barragemNorte?.comportas_abertas).toBeNull();
    expect(dados.barragemNorte?.comportas_fechadas).toBeNull();
    expect(dados.barragemSul?.qualidade).toBe('atrasado');
    for (const e of barragens.props.estacoes) expect(dados[e.codigo]?.serie.map(p => p.montante_m)).toEqual(e.serie.map(p => p.montante_m));
  });
});
describe('Aquisição e isolamento de falhas', () => {
  it('consulta somente Defesa Civil e Epagri, sem CPTEC ou INMET', async () => {
    const chamadas: string[] = [];
    const status = await coletar(async (url, init) => { chamadas.push(url); return transport(url, init); });
    expect(chamadas).toHaveLength(8); // Sete consultas locais preservadas + Blumenau informativo.
    expect(chamadas.every(url => ['monitoramento.defesacivil.itajai.sc.gov.br', 'ciram.epagri.sc.gov.br', 'defesacivil.blumenau.sc.gov.br'].includes(new URL(url).hostname))).toBe(true);
    expect(chamadas.some(url => /cptec|inmet/i.test(url))).toBe(false);
    expect(status.fontes.epagri?.resultado).toBe('sucesso');
    expect(status.previsao.municipio).toBe('Itajaí');
    expect(status.nivel_jbs.nivel).toBe('atencao');
  });
  it('falha exclusiva Epagri preserva Defesa Civil e não significa sem chuva', async () => {
    const status = await coletar(async (url, init) => url === urlPrevisaoEpagri ? new Response('MOCK falha', { status: 503 }) : transport(url, init));
    expect(status.fontes.epagri?.resultado).toBe('falha');
    expect(status.previsao.disponibilidade).toBe('indisponivel');
    expect(status.previsao.dias).toEqual([]);
    expect(status.previsao.municipio).toBeNull();
    expect(status.previsao.atualizado_em).toBeNull();
    expect(status.previsao.coletado_em).toBeTruthy();
    expect(Object.keys(status.rios)).toHaveLength(11);
    expect(Object.keys(status.chuvas)).toHaveLength(12);
    expect(Object.keys(status.barragens)).toHaveLength(3);
    expect(status.situacao_oficial?.flag).toBe('Atenção');
    expect(status.nivel_jbs.nivel).toBe('atencao');
    expect(parseStatus(status)).toEqual(status);
  });
  it('aceita Atenção + alertas null, valida status e calcula nível', async () => {
    const status = parseStatus(await coletar(transport));
    expect(status.situacao_oficial?.flag).toBe('Atenção');
    expect(status.alertas_oficiais).toBeNull();
    expect(status.nivel_jbs.nivel).toBe('atencao');
    expect(status.nivel_jbs.gatilhos.map(g => g.origem)).toEqual(['Defesa Civil de Itajaí', 'DC01']);
    expect(status.situacao_oficial?.atualizado_em).toBe(situacao.data.atualizado_em);
    expect(status.fontes.situacao_atual?.coletado_em).not.toBe(situacao.data.atualizado_em);
    expect(status.rios.DC01?.medido_em).toBe(rios.props.estacoes[0]?.medido_em);
  });
  it('falha de chuva não apaga resultados das outras fontes', async () => {
    const status = await coletar(async (url, init) => url === urls.chuvas ? new Response('MOCK indisponível', { status: 503 }) : transport(url, init));
    expect(status.fontes.chuvas?.resultado).toBe('falha');
    expect(status.fontes.chuvas?.requisicoes?.[0]?.http_status).toBe(503);
    expect(Object.keys(status.rios)).toHaveLength(11);
    expect(Object.keys(status.barragens)).toHaveLength(3);
    expect(status.previsao.dias).toHaveLength(5);
    expect(status.chuvas).toEqual({});
    expect(status.qualidade_monitoramento.estado).toBe('parcialmente_degradado');
  });
  it('falha de parsing é explícita e não afeta demais fontes', async () => {
    const status = await coletar(async (url, init) => url === urls.rios ? new Response('{}') : transport(url, init));
    expect(status.fontes.rios?.motivo).toContain('data-page');
    expect(status.situacao_oficial?.flag).toBe('Atenção');
  });
  it('todas as fontes falhando resulta degradado e nível desconhecido', async () => {
    const status = await coletar(async () => { throw new Error('MOCK rede indisponível'); });
    expect(status.qualidade_monitoramento.estado).toBe('degradado');
    expect(status.nivel_jbs.nivel).toBeNull();
    expect(Object.values(status.fontes).every(f => f.resultado === 'falha')).toBe(true);
  });
  it('pipeline retém estado em nova coleta sem fontes principais', async () => {
    const anterior = await coletar(transport);
    const status = await coletar(async () => { throw new Error('MOCK falha total'); }, JSON.parse(JSON.stringify(anterior)));
    expect(status.nivel_jbs.nivel).toBe('atencao');
    expect(status.nivel_jbs.gatilhos).toHaveLength(2);
    expect(status.nivel_jbs.gatilhos.every(g => g.stale)).toBe(true);
    expect(status.qualidade_monitoramento.estado).toBe('degradado');
    expect(status.rios).toEqual({});
  });
  it('timeout tem diagnóstico e aborta a requisição', async () => {
    const registros: Requisicao[] = [];
    const get = criarHttp(registros, async (_url, init) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('abortado')));
    }), 10);
    await expect(get(urls.rios)).rejects.toThrow('Timeout');
    expect(registros[0]?.http_status).toBeNull();
  });
  it('resposta acima do limite é recusada', async () => {
    const get = criarHttp([], async () => new Response('x'.repeat(8 * 1024 * 1024 + 1)));
    await expect(get(urls.rios)).rejects.toThrow('8 MiB');
  });
});

