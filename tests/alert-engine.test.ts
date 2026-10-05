import { describe, expect, expectTypeOf, it } from 'vitest';
import { aplicarMotor, avaliarFontesPrincipais } from '../src/domain/alert-engine';
import { avaliarRio, classificarRio, politicaHidrologica } from '../src/domain/hydrology';
import { codigoHidrologicoSchema, parseStatus, type EntradaMotorAutomatico, type EstacaoHidrologica,
  type EstadoRio, type SituacaoOficial, type Status } from '../src/domain/contracts';
import { statusVazio } from '../scripts/collectors/pipeline';
import { normalizarBarragens, normalizarChuvas, normalizarRios, normalizarSituacao } from '../scripts/collectors/normalize';
import { normalizarEpagri } from '../scripts/collectors/epagri';
import riosReais from './fixtures/rios.json';
import oficialReal from './fixtures/situacao-atencao.json';
import chuvasReais from './fixtures/chuvas.json';
import barragensReais from './fixtures/barragens.json';
import epagriReal from './fixtures/epagri-itajai.json';

const instante = (minutos: number) => new Date(Date.UTC(2026, 9, 1, 12) + minutos * 60000).toISOString();
const agora = instante(720);
const oficial = (flag: SituacaoOficial['flag'] = 'Normalidade', min = 0): SituacaoOficial =>
  ({ flag, conteudo: 'Texto contextual: Emergência, Atenção, Normalidade', atualizado_em: instante(min), qualidade: null });
function rio(nivel_m = 0, min = 0, extra: Partial<EstacaoHidrologica> = {}): EstacaoHidrologica {
  return { codigo: 'DC01', nome: 'MOCK estação', latitude: null, longitude: null, nivel_m,
    tendencia: 'estavel', limites: { atencao_m: 1, alerta_m: 2, emergencia_m: 3 }, qualidade: 'atualizado',
    medido_em: instante(min), atualizacao_esperada_segundos: 600, serie_12h: [], ...extra };
}
function entrada(nivel = 0, flag: SituacaoOficial['flag'] = 'Normalidade', min = 0): Status {
  const s = statusVazio();
  s.atualizado_em = agora;
  s.qualidade_monitoramento = { estado: 'atualizado', problemas: [] };
  s.situacao_oficial = oficial(flag, min);
  s.rios = Object.fromEntries(codigoHidrologicoSchema.options.map(codigo => [codigo, rio(codigo === 'DC01' ? nivel : 0, min, { codigo })]));
  s.previsao = normalizarEpagri(epagriReal, agora).previsao;
  return s;
}
const avaliar = (a: EstacaoHidrologica | undefined, prev?: EstadoRio) => avaliarRio('DC01', a, prev, agora, politicaHidrologica);
const estado = (nivel = 2.5) => avaliar(rio(nivel));
function sequencia(prev: EstadoRio, valores: Array<number | null>, inicio = 10, extra: Partial<EstacaoHidrologica> = {}) {
  const pontos = valores.map((nivel_m, i) => ({ nivel_m, medido_em: instante(inicio + i * 10) }));
  const ultimo = pontos.at(-1)!;
  return avaliar(rio(ultimo.nivel_m ?? 0, inicio + (valores.length - 1) * 10, { serie_12h: pontos, ...extra }), prev);
}

describe('Fase 03 — 30 cenários obrigatórios', () => {
  it('01 Defesa Civil Atenção + rios normais → Atenção', () => {
    expect(aplicarMotor(entrada(0, 'Atenção')).nivel_jbs.nivel).toBe('atencao');
  });
  it('02 Defesa Civil Normal + rio Atenção → Atenção', () => {
    expect(aplicarMotor(entrada(1.2)).nivel_jbs.nivel).toBe('atencao');
  });
  it('03 Defesa Civil Atenção + rio Alerta → Alerta', () => {
    expect(aplicarMotor(entrada(2.2, 'Atenção')).nivel_jbs.nivel).toBe('alerta');
  });
  it('04 rio em Emergência → Emergência', () => {
    expect(aplicarMotor(entrada(3)).nivel_jbs.nivel).toBe('emergencia');
  });
  it('05 uma única leitura escala imediatamente', () => {
    expect(avaliar(rio(2, 10), estado(0)).nivel).toBe('alerta');
  });
  it('06 Atenção salta diretamente para Emergência', () => {
    expect(avaliar(rio(3, 10), estado(1)).nivel).toBe('emergencia');
  });
  it('07 uma leitura abaixo mantém nível e informa 1/3', () => {
    expect(sequencia(estado(), [0])).toMatchObject({ nivel: 'alerta', normalizacao: { leituras_abaixo: 1 } });
  });
  it('08 duas leituras abaixo mantêm nível e informam 2/3', () => {
    expect(sequencia(estado(), [0, 0])).toMatchObject({ nivel: 'alerta', normalizacao: { leituras_abaixo: 2 } });
  });
  it('09 três leituras consecutivas reduzem um nível', () => {
    expect(sequencia(estado(), [0, 0, 0])).toMatchObject({ nivel: 'atencao', normalizacao: { leituras_abaixo: 0 } });
  });
  it('10 Emergência não cai diretamente para Normalidade', () => {
    expect(sequencia(estado(3), [0, 0, 0]).nivel).toBe('alerta');
  });
  it('11 cada redução exige três NOVAS leituras', () => {
    const primeiro = sequencia(estado(3), [0, 0, 0]);
    const segundo = sequencia(primeiro, [0, 0], 40);
    expect(segundo.nivel).toBe('alerta');
    const terceiro = sequencia(segundo, [0], 60);
    expect(terceiro.nivel).toBe('atencao');
    expect(sequencia(terceiro, [0, 0, 0], 70).nivel).toBe('normalidade');
  });
  it('12 inválida reinicia: abaixo, abaixo, inválida, abaixo = 1/3', () => {
    expect(sequencia(estado(), [0, 0, null, 0])).toMatchObject({ nivel: 'alerta', normalizacao: { leituras_abaixo: 1 } });
  });
  it('13 atingir novamente o limite reinicia a sequência', () => {
    expect(sequencia(estado(), [0, 0, 2, 0])).toMatchObject({ nivel: 'alerta', normalizacao: { leituras_abaixo: 1 } });
  });
  it('14 amostras sem qualidade individual são elegíveis', () => {
    const r = sequencia(estado(), [1.9, 1.8, 1.7]);
    expect(r.nivel).toBe('atencao');
    expect(r.desde).toBe(instante(30));
  });
  it('15 estação indisponível não confirma queda e zera sequência', () => {
    const prev = sequencia(estado(), [0, 0]);
    expect(sequencia(prev, [0], 30, { qualidade: 'indisponivel' }))
      .toMatchObject({ nivel: 'alerta', stale: true, normalizacao: { leituras_abaixo: 0 } });
  });
  it('16 estação que desaparece conserva Alerta stale', () => {
    const prev = aplicarMotor(entrada(2.1));
    const novo = entrada(); delete novo.rios.DC01;
    const resultado = aplicarMotor(novo, prev);
    expect(resultado.nivel_jbs.nivel).toBe('alerta');
    expect(resultado.nivel_jbs.gatilhos).toContainEqual(expect.objectContaining({ origem: 'DC01', stale: true }));
  });
  it('17 situação oficial reduz diretamente sem histerese', () => {
    expect(aplicarMotor(entrada(0, 'Normalidade', 10), aplicarMotor(entrada(0, 'Atenção'))).nivel_jbs.nivel).toBe('normalidade');
  });
  it('18 oficial indisponível conserva estado anterior', () => {
    const novo = entrada(); novo.situacao_oficial = null;
    const resultado = aplicarMotor(novo, aplicarMotor(entrada(0, 'Alerta')));
    expect(resultado.nivel_jbs.nivel).toBe('alerta');
    expect(resultado.motor?.situacao_oficial.stale).toBe(true);
  });
  it('19 alertas/ativo null não implica Normalidade', () => {
    const resultado = aplicarMotor(entrada(0, 'Atenção'));
    expect(resultado.alertas_oficiais).toBeNull();
    expect(resultado.nivel_jbs.nivel).toBe('atencao');
  });
  it('20 chuva elevada não altera o nível', () => {
    const s = entrada(); s.chuvas = normalizarChuvas(chuvasReais.props.estacoes);
    for (const c of Object.values(s.chuvas)) c.chuva_24_h_mm = 9999;
    expect(aplicarMotor(s).nivel_jbs.nivel).toBe('normalidade');
  });
  it('21 previsão de tempestade/chuva elevada não altera o nível', () => {
    const s = entrada(); s.previsao.dias[0]!.condicao = 'Tempestade'; s.previsao.dias[0]!.precipitacao_mm = 9999;
    expect(aplicarMotor(s).nivel_jbs.nivel).toBe('normalidade');
  });
  it('22 barragens não alteram nível nem recebem classificação ambiental', () => {
    const s = entrada(); s.barragens = normalizarBarragens(barragensReais.props.estacoes);
    for (const b of Object.values(s.barragens)) b.ocupacao_percentual = 100;
    const resultado = aplicarMotor(s);
    expect(resultado.nivel_jbs.nivel).toBe('normalidade');
    expect(Object.values(resultado.barragens).every(b => !('nivel' in b))).toBe(true);
  });
  it('23 tendência subindo não aumenta severidade', () => {
    expect(avaliar(rio(0, 0, { tendencia: 'subindo' })).nivel).toBe('normalidade');
  });
  it('24 colaboradores e históricos não participam da entrada do motor', () => {
    expectTypeOf<Extract<keyof EntradaMotorAutomatico, 'colaboradores' | 'historico_inundacao' | 'historico_vias'>>().toEqualTypeOf<never>();
    const base = { situacao_oficial: oficial(), rios: { DC01: rio() }, avaliado_em: agora };
    const contexto = { ...base, colaboradores: 999999, historico_inundacao: true, historico_vias: true };
    expect(avaliarFontesPrincipais(contexto)).toEqual(avaliarFontesPrincipais(base));
  });
  it('25 global é máximo e lista também gatilhos de menor severidade', () => {
    const s = entrada(2.1, 'Atenção'); s.rios.DC09 = rio(3, 0, { codigo: 'DC09' });
    const r = aplicarMotor(s);
    expect(r.nivel_jbs.nivel).toBe('emergencia');
    expect(r.nivel_jbs.gatilhos.map(g => g.severidade)).toEqual(['atencao', 'alerta', 'emergencia']);
  });
  it('26 global não reduz enquanto outro gatilho sustenta Alerta', () => {
    const s = entrada(2.1); s.rios.DC09 = rio(2.1, 0, { codigo: 'DC09' });
    const prev = aplicarMotor(s); const novo = entrada(2.1, 'Normalidade', 30);
    novo.rios.DC09 = rio(0, 30, { codigo: 'DC09', serie_12h: [10, 20, 30].map(m => ({ medido_em: instante(m), nivel_m: 0 })) });
    const r = aplicarMotor(novo, prev);
    expect(r.motor?.rios.DC09?.nivel).toBe('atencao');
    expect(r.nivel_jbs.nivel).toBe('alerta');
  });
  it('27 todas principais indisponíveis sem memória → null/degradado', () => {
    const s = entrada(); s.situacao_oficial = null; s.rios = {};
    expect(aplicarMotor(s)).toMatchObject({ nivel_jbs: { nivel: null }, qualidade_monitoramento: { estado: 'degradado' } });
  });
  it('28 falha complementar altera qualidade, preserva nível', () => {
    const s = entrada(2.2); s.previsao = statusVazio().previsao;
    const r = aplicarMotor(s);
    expect(r.nivel_jbs.nivel).toBe('alerta');
    expect(r.qualidade_monitoramento).toMatchObject({ estado: 'parcialmente_degradado', problemas: expect.arrayContaining(['Previsão do tempo indisponível']) });
  });
  it('29 qualidade é independente do risco, inclusive normal parcial e alerta degradado', () => {
    const normal = entrada(); normal.previsao = statusVazio().previsao;
    expect(aplicarMotor(normal)).toMatchObject({ nivel_jbs: { nivel: 'normalidade' }, qualidade_monitoramento: { estado: 'parcialmente_degradado' } });
    const vazio = entrada(); vazio.situacao_oficial = null; vazio.rios = {};
    expect(aplicarMotor(vazio, aplicarMotor(entrada(2.1))))
      .toMatchObject({ nivel_jbs: { nivel: 'alerta' }, qualidade_monitoramento: { estado: 'degradado' } });
    expect(aplicarMotor(entrada(3)).qualidade_monitoramento.estado).toBe('atualizado');
  });
  it('30 fixture real 01/10: DC01 1,27 + Defesa Civil Atenção → dois gatilhos', () => {
    const s = entrada(); s.situacao_oficial = normalizarSituacao(oficialReal);
    s.rios = normalizarRios([riosReais.props.estacoes[0]]).rios;
    expect(s.rios.DC01).toMatchObject({ nivel_m: 1.27, tendencia: 'subindo', limites: { atencao_m: 1.21, alerta_m: 1.61, emergencia_m: 1.75 } });
    const r = aplicarMotor(s);
    expect(r.nivel_jbs.nivel).toBe('atencao');
    expect(r.nivel_jbs.gatilhos).toHaveLength(2);
    expect(r.nivel_jbs.gatilhos[1]).toMatchObject({ origem: 'DC01', nivel_observado_m: 1.27, limite_responsavel_m: 1.21, tendencia: 'subindo', stale: false });
    s.previsao = statusVazio().previsao;
    expect(aplicarMotor(s).nivel_jbs).toEqual(r.nivel_jbs);
  });
});

describe('Fronteiras, cronologia e continuidade', () => {
  it.each([[0.99, 'normalidade'], [1, 'atencao'], [2, 'alerta'], [3, 'emergencia']] as const)('igualdade aos limites dinâmicos: %s → %s', (valor, esperado) => {
    expect(classificarRio(valor, rio().limites)).toBe(esperado);
    expect(classificarRio(valor + 10, { atencao_m: 11, alerta_m: 12, emergencia_m: 13 })).toBe(esperado);
  });
  it.each([null, NaN, Infinity, -Infinity])('nível inválido %s não vira normalidade', nivel => {
    expect(classificarRio(nivel, rio().limites)).toBeNull();
  });
  it('limites ausentes/invertidos/iguais não classificam nem apagam memória', () => {
    for (const limites of [{ atencao_m: null, alerta_m: 2, emergencia_m: 3 }, { atencao_m: 3, alerta_m: 2, emergencia_m: 1 }, { atencao_m: 1, alerta_m: 1, emergencia_m: 3 }]) {
      expect(classificarRio(5, limites)).toBeNull();
      expect(avaliar(rio(0, 10, { limites }), estado())).toMatchObject({ nivel: 'alerta', stale: true });
    }
  });
  it('atrasado permite escalada, bloqueia queda e zera progresso', () => {
    expect(avaliar(rio(3, 10, { qualidade: 'atrasado' }), estado(1))).toMatchObject({ nivel: 'emergencia', stale: true });
    const prev = sequencia(estado(), [0, 0]);
    expect(avaliar(rio(0, 30, { qualidade: 'atrasado' }), prev)).toMatchObject({ nivel: 'alerta', stale: true, normalizacao: { leituras_abaixo: 0 } });
  });
  it('atrasado não escala com timestamp anterior ou futuro', () => {
    expect(avaliar(rio(3, -10, { qualidade: 'atrasado' }), estado(1)).nivel).toBe('atencao');
    expect(avaliar(rio(3, 1000, { qualidade: 'atrasado' }), estado(1)).nivel).toBe('atencao');
  });
  it('consecutividade aceita 720 s e reinicia acima de 720 s', () => {
    const prev = sequencia(estado(), [0, 0]);
    expect(avaliar(rio(0, 32), prev).nivel).toBe('atencao');
    expect(avaliar(rio(0, 32 + 1 / 60), prev)).toMatchObject({ nivel: 'alerta', normalizacao: { leituras_abaixo: 1 } });
  });
  it('intervalo esperado ausente não permite comprovar três consecutivas', () => {
    expect(sequencia(estado(), [0, 0, 0, 0], 10, { atualizacao_esperada_segundos: null }))
      .toMatchObject({ nivel: 'alerta', normalizacao: { leituras_abaixo: 1 } });
  });
  it('qualidade null também é elegível e qualidade explícita indisponível interrompe', () => {
    const serie = [10, 20, 30, 40].map(m => ({ medido_em: instante(m), nivel_m: 0, qualidade: m === 30 ? 'indisponivel' as const : null }));
    expect(avaliar(rio(0, 40, { serie_12h: serie }), estado()).normalizacao.leituras_abaixo).toBe(1);
    expect(avaliar(rio(0, 30, { serie_12h: serie.slice(0, 3).map(p => ({ ...p, qualidade: null })) }), estado()).nivel).toBe('atencao');
  });
  it('duplicatas e reexecução não contam novamente', () => {
    const ponto = { medido_em: instante(10), nivel_m: 0 };
    const atual = rio(0, 10, { serie_12h: [ponto, ponto, ponto] });
    const r = avaliar(atual, estado());
    expect(r.normalizacao.leituras_abaixo).toBe(1);
    expect(avaliar(atual, r)).toEqual(r);
  });
  it('série invertida, timestamp nulo e duplicatas divergentes bloqueiam queda', () => {
    const p = (min: number, nivel_m = 0) => ({ medido_em: instante(min), nivel_m });
    for (const serie of [[p(20), p(10), p(30)], [p(10), { medido_em: null, nivel_m: 0 }, p(30)], [p(10), p(10, 1), p(30)]]) {
      expect(avaliar(rio(0, 30, { serie_12h: serie }), estado()))
        .toMatchObject({ nivel: 'alerta', normalizacao: { leituras_abaixo: 0 } });
    }
  });
  it('série não confiável não impede escalada atual válida', () => {
    expect(avaliar(rio(3, 30, { serie_12h: [{ medido_em: null, nivel_m: null }] }), estado(1)).nivel).toBe('emergencia');
  });
  it('processa novas amostras em ordem e aplica escalada atual depois delas', () => {
    expect(sequencia(estado(0), [3, 0, 0, 0, 3])).toMatchObject({ nivel: 'emergencia', desde: instante(50) });
    expect(sequencia(estado(0), [3, 0, 0, 0, 0])).toMatchObject({ nivel: 'alerta', desde: instante(40), normalizacao: { leituras_abaixo: 1 } });
  });
  it('primeira execução não inventa estado a partir da série antiga', () => {
    expect(avaliar(rio(0, 30, { serie_12h: [{ medido_em: instante(0), nivel_m: 3 }] })))
      .toMatchObject({ nivel: 'normalidade', desde: null, normalizacao: { leituras_abaixo: 0 } });
  });
  it('mudança de limites inicia nova contagem, usando somente leitura atual', () => {
    const prev = sequencia(estado(), [0, 0]);
    expect(sequencia(prev, [0, 0, 0], 30, { limites: { atencao_m: 1, alerta_m: 2.1, emergencia_m: 3.1 } }))
      .toMatchObject({ nivel: 'alerta', normalizacao: { leituras_abaixo: 1, limite_m: 2.1 } });
  });
  it('retomada depois de indisponibilidade não reaproveita série do período ausente', () => {
    const prev = avaliar(undefined, sequencia(estado(), [0, 0]));
    expect(sequencia(prev, [0, 0, 0], 30)).toMatchObject({ nivel: 'alerta', stale: false, normalizacao: { leituras_abaixo: 1 } });
  });
  it('snapshot atual antigo/futuro/nulo conserva última condição conhecida', () => {
    for (const medido_em of [instante(-10), instante(1000), null]) {
      expect(avaliar(rio(0, 10, { medido_em }), estado())).toMatchObject({ nivel: 'alerta', stale: true });
    }
  });
  it('oficial usa flag, ignora texto e conserva último dado se novo timestamp retrocede', () => {
    const prev = aplicarMotor(entrada(0, 'Alerta', 10));
    expect(aplicarMotor(entrada(0, 'Normalidade', 0), prev).nivel_jbs.nivel).toBe('alerta');
    expect(aplicarMotor(entrada(0, 'Normalidade', 20), prev).nivel_jbs.nivel).toBe('normalidade');
  });
  it('serialização e leitura da memória conservam contagem entre três execuções', () => {
    let prev = aplicarMotor(entrada(2.1));
    for (const min of [10, 20, 30]) {
      prev = aplicarMotor(entrada(0, 'Normalidade', min), JSON.parse(JSON.stringify(prev)));
      expect(prev.motor?.rios.DC01?.nivel).toBe(min === 30 ? 'atencao' : 'alerta');
      expect(prev.motor?.rios.DC01?.normalizacao.leituras_abaixo).toBe(min === 30 ? 0 : min / 10);
    }
  });
  it('migra status da Fase 02 sem inventar contagem e retém estado em falha atual', () => {
    const antigo = entrada(2.1, 'Atenção');
    const novo = entrada(); novo.rios = {}; novo.situacao_oficial = null;
    const r = aplicarMotor(novo, antigo);
    expect(r.nivel_jbs.nivel).toBe('alerta');
    expect(r.nivel_jbs.desde).toBeNull();
    expect(r.motor?.rios.DC01).toMatchObject({ stale: true, normalizacao: { leituras_abaixo: 0 } });
  });
  it('memória corrompida/inconsistente/futura é descartada com diagnóstico', () => {
    const corrupta = aplicarMotor(entrada(3)); corrupta.motor!.rios.DC01!.codigo = 'DC02';
    const futura = aplicarMotor(entrada(3)); futura.motor!.avaliado_em = instante(1000);
    const inconsistente = aplicarMotor(entrada(3)); inconsistente.nivel_jbs.nivel = 'normalidade';
    for (const anterior of [{}, corrupta, futura, inconsistente]) {
      const r = aplicarMotor(entrada(1), anterior);
      expect(r.nivel_jbs.nivel).toBe('atencao');
      expect(r.qualidade_monitoramento.problemas.join(' ')).toContain('Status anterior inválido');
    }
  });
  it('desde é null sem continuidade e usa medição da transição comprovada', () => {
    const inicial = aplicarMotor(entrada());
    expect(inicial.nivel_jbs.desde).toBeNull();
    const alto = aplicarMotor(entrada(2.1, 'Normalidade', 10), inicial);
    expect(alto.nivel_jbs.desde).toBe(instante(10));
    const um = aplicarMotor(entrada(0, 'Normalidade', 20), alto);
    expect(um.nivel_jbs.desde).toBe(instante(10));
    const dois = aplicarMotor(entrada(0, 'Normalidade', 30), um);
    const tres = aplicarMotor(entrada(0, 'Normalidade', 40), dois);
    expect(tres.nivel_jbs.desde).toBe(instante(40));
  });
  it('resultado determinístico, imutável e válido no contrato', () => {
    const s = entrada(2.1); const prev = aplicarMotor(entrada(1));
    const original = JSON.stringify({ s, prev });
    const primeiro = aplicarMotor(s, prev);
    expect(aplicarMotor(s, prev)).toEqual(primeiro);
    expect(parseStatus(primeiro)).toEqual(primeiro);
    expect(JSON.stringify({ s, prev })).toBe(original);
  });
  it('desde acompanha queda e nova escalada no mesmo lote, mesmo com nível final igual', () => {
    const prev = aplicarMotor(entrada(2.1));
    const novo = entrada(2.1, 'Normalidade', 40);
    novo.rios.DC01!.serie_12h = [0, 0, 0, 2.1].map((nivel_m, i) => ({ nivel_m, medido_em: instante((i + 1) * 10) }));
    const r = aplicarMotor(novo, prev);
    expect(r.nivel_jbs).toMatchObject({ nivel: 'alerta', desde: instante(40) });
  });
  it('desde global considera transições intermediárias de várias estações', () => {
    const inicial = entrada(3); inicial.rios.DC09 = rio(2.1, 0, { codigo: 'DC09' });
    const prev = aplicarMotor(inicial);
    const novo = entrada(1.1, 'Normalidade', 90);
    novo.rios.DC01!.serie_12h = Array.from({ length: 9 }, (_, i) => ({ medido_em: instante((i + 1) * 10), nivel_m: 1.1 }));
    novo.rios.DC09 = rio(0, 90, { codigo: 'DC09', serie_12h: Array.from({ length: 9 }, (_, i) => ({
      medido_em: instante((i + 1) * 10), nivel_m: i < 6 ? 1.1 : 0,
    })) });
    const r = aplicarMotor(novo, prev);
    expect(r.motor?.rios.DC09?.nivel).toBe('normalidade');
    expect(r.nivel_jbs).toMatchObject({ nivel: 'atencao', desde: instante(60) });
  });
  it('gatilho de normalização contém nome, nível, limite, tendência, horário e 2/3', () => {
    const prev = aplicarMotor(entrada(2.1));
    const novo = entrada(1.7, 'Normalidade', 20);
    novo.rios.DC01!.serie_12h = [10, 20].map(m => ({ medido_em: instante(m), nivel_m: 1.7 }));
    expect(aplicarMotor(novo, prev).nivel_jbs.gatilhos[0]).toMatchObject({
      origem: 'DC01', nome: 'MOCK estação', nivel_observado_m: 1.7, limite_responsavel_m: 2,
      tendencia: 'estavel', atualizado_em: instante(20), severidade: 'alerta', normalizacao: { leituras_abaixo: 2, necessarias: 3 },
    });
  });
  it('dados de fonte marcada como falha não substituem memória', () => {
    const s = entrada(0);
    s.fontes.rios = { nome: 'MOCK', url: null, qualidade: 'indisponivel', atualizado_em: null, atualizacao_esperada_segundos: null, resultado: 'falha' };
    expect(aplicarMotor(s, aplicarMotor(entrada(3))).motor?.rios.DC01).toMatchObject({ nivel: 'emergencia', stale: true });
  });
});
