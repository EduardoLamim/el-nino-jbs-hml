import { z } from 'zod';
import { severidade, type EstacaoHidrologica, type EstadoRio, type NivelJbs } from './contracts';

type Limites = EstacaoHidrologica['limites'];
export interface PoliticaHidrologica {
  tolerancia_intervalo_segundos: number;
  atrasado_permite_escalada: boolean;
}
// Política da Fase 03; tolerância ampliada para 120s na revisão autorizada da Fase 10.
export const politicaHidrologica: Readonly<PoliticaHidrologica> = {
  tolerancia_intervalo_segundos: 120, atrasado_permite_escalada: true,
};
const iso = z.string().datetime({ offset: true });
export function tempo(valor: string | null | undefined): number | null {
  if (!iso.safeParse(valor).success) return null;
  const t = Date.parse(valor!);
  return Number.isFinite(t) ? t : null;
}
export function limitesValidos(l: Limites): l is { atencao_m: number; alerta_m: number; emergencia_m: number } {
  return typeof l.atencao_m === 'number' && Number.isFinite(l.atencao_m)
    && typeof l.alerta_m === 'number' && Number.isFinite(l.alerta_m)
    && typeof l.emergencia_m === 'number' && Number.isFinite(l.emergencia_m)
    && l.atencao_m < l.alerta_m && l.alerta_m < l.emergencia_m;
}
export function classificarRio(nivel: number | null, limites: Limites): NivelJbs | null {
  if (nivel === null || !Number.isFinite(nivel) || !limitesValidos(limites)) return null;
  if (nivel >= limites.emergencia_m) return 'emergencia';
  if (nivel >= limites.alerta_m) return 'alerta';
  if (nivel >= limites.atencao_m) return 'atencao';
  return 'normalidade';
}
export function limiteResponsavel(nivel: NivelJbs | null, l: Limites): number | null {
  return nivel === 'emergencia' ? l.emergencia_m : nivel === 'alerta' ? l.alerta_m : nivel === 'atencao' ? l.atencao_m : null;
}
const anteriorNivel: Record<NivelJbs, NivelJbs> = {
  emergencia: 'alerta', alerta: 'atencao', atencao: 'normalidade', normalidade: 'normalidade',
};
export function rioVazio(codigo: EstadoRio['codigo']): EstadoRio {
  return { codigo, nome: codigo, nivel: null, desde: null, stale: true, motivo: 'Estação não informada.',
    ultima_valida: null, ultima_amostra_em: null,
    normalizacao: { leituras_abaixo: 0, necessarias: 3, limite_m: null, ultima_leitura_em: null } };
}
function reset(e: EstadoRio) {
  e.normalizacao.leituras_abaixo = 0;
  e.normalizacao.ultima_leitura_em = null;
}
export interface TransicaoRio { nivel: NivelJbs; em: string | null }
/** Transições são efêmeras: permitem reconstruir o início global, nunca são arquivadas. */
export function avaliarRioDetalhado(codigo: EstadoRio['codigo'], atual: EstacaoHidrologica | undefined,
  anterior: EstadoRio | undefined, avaliadoEm: string, politica: PoliticaHidrologica) {
  const transicoes: TransicaoRio[] = [];
  const estado = calcularRio(codigo, atual, anterior, avaliadoEm, politica, transicoes);
  return { estado, transicoes };
}
export function avaliarRio(codigo: EstadoRio['codigo'], atual: EstacaoHidrologica | undefined,
  anterior: EstadoRio | undefined, avaliadoEm: string, politica: PoliticaHidrologica): EstadoRio {
  return avaliarRioDetalhado(codigo, atual, anterior, avaliadoEm, politica).estado;
}
/** Pura: não usa relógio global, IO, thresholds por estação ou fontes contextuais. */
function calcularRio(codigo: EstadoRio['codigo'], atual: EstacaoHidrologica | undefined,
  anterior: EstadoRio | undefined, avaliadoEm: string, politica: PoliticaHidrologica, transicoes: TransicaoRio[]): EstadoRio {
  const e = anterior ? structuredClone(anterior) : rioVazio(codigo);
  const agora = tempo(avaliadoEm);
  if (agora === null) throw new Error('Instante de avaliação inválido.');
  const t = tempo(atual?.medido_em);
  const classe = atual ? classificarRio(atual.nivel_m, atual.limites) : null;
  let problema: string | null = !atual ? 'Estação ausente na coleta.'
    : atual.qualidade === 'indisponivel' ? 'Estação oficialmente indisponível.'
    : t === null || t > agora ? 'Timestamp atual inválido ou futuro.'
    : classe === null ? 'Nível ausente/inválido ou limites ausentes/inconsistentes.'
    : atual.qualidade === 'atrasado' ? 'Estação oficialmente atrasada.' : null;
  const watermark = tempo(e.ultima_amostra_em);
  if (!problema && watermark !== null && t! < watermark) problema = 'Medição atual anterior à última já processada.';
  if (problema) {
    if (atual?.qualidade === 'atrasado' && politica.atrasado_permite_escalada && classe !== null && t !== null && t <= agora
        && (watermark === null || t > watermark) && (e.nivel === null || severidade[classe] > severidade[e.nivel])) {
      e.nivel = classe; e.desde = anterior?.nivel ? atual.medido_em : null;
      transicoes.push({ nivel: classe, em: e.desde });
      e.nome = atual.nome; e.ultima_amostra_em = atual.medido_em;
      e.ultima_valida = { nivel_m: atual.nivel_m!, medido_em: atual.medido_em!, limites: { ...atual.limites }, tendencia: atual.tendencia };
    }
    e.stale = true; e.motivo = problema; reset(e);
    if (e.ultima_valida) e.normalizacao.limite_m = limiteResponsavel(e.nivel, e.ultima_valida.limites);
    return e;
  }
  const a = atual!;
  e.nome = a.nome; e.stale = false; e.motivo = null;
  // Primeira observação: somente classificação atual; não inventa estado passado.
  if (e.nivel === null || e.ultima_valida === null) {
    e.nivel = classe; e.desde = null; e.ultima_amostra_em = a.medido_em;
    transicoes.push({ nivel: classe!, em: null });
    e.ultima_valida = { nivel_m: a.nivel_m!, medido_em: a.medido_em!, limites: { ...a.limites }, tendencia: a.tendencia };
    reset(e); e.normalizacao.limite_m = limiteResponsavel(e.nivel, a.limites);
    return e;
  }
  const limitesMudaram = (['atencao_m', 'alerta_m', 'emergencia_m'] as const)
    .some(chave => a.limites[chave] !== e.ultima_valida!.limites[chave]);
  const retomando = anterior?.stale === true;
  if (limitesMudaram || retomando) reset(e);
  // Não reutiliza amostras coletadas antes da interrupção ou com limites antigos.
  let pontos = retomando || limitesMudaram ? [] : [...a.serie_12h];
  let ultimoNaSerie: number | null = null;
  let sequenciaConfiavel = true;
  const vistos = new Map<number, { nivel_m: number | null; qualidade?: string | null }>();
  for (const p of pontos) {
    const instante = tempo(p.medido_em);
    if (instante === null || instante > t! || (ultimoNaSerie !== null && instante < ultimoNaSerie)) {
      sequenciaConfiavel = false; break;
    }
    const duplicado = vistos.get(instante);
    if (duplicado && (duplicado.nivel_m !== p.nivel_m || duplicado.qualidade !== p.qualidade)) {
      sequenciaConfiavel = false; break;
    }
    vistos.set(instante, p); ultimoNaSerie = instante;
  }
  const pontoAtual = vistos.get(t!);
  if (pontoAtual && (pontoAtual.nivel_m !== a.nivel_m || pontoAtual.qualidade === 'indisponivel' || pontoAtual.qualidade === 'atrasado')) sequenciaConfiavel = false;
  if (watermark === t && e.ultima_valida.nivel_m !== a.nivel_m) sequenciaConfiavel = false;
  if (!sequenciaConfiavel) {
    reset(e); e.motivo = 'Série temporal não confiável; rebaixamento interrompido.';
    pontos = [];
  } else {
    pontos = pontos.filter(p => tempo(p.medido_em)! > (watermark ?? -Infinity));
    if (!pontos.some(p => tempo(p.medido_em) === t)) pontos.push({ medido_em: a.medido_em!, nivel_m: a.nivel_m, qualidade: a.qualidade });
  }
  const processados = new Set<number>();
  for (const p of pontos) {
    const pt = tempo(p.medido_em)!;
    if (pt <= (watermark ?? -Infinity) || processados.has(pt)) continue;
    processados.add(pt);
    const prevT = tempo(e.ultima_amostra_em);
    const intervalo = a.atualizacao_esperada_segundos;
    if (prevT !== null && (intervalo === null || pt - prevT > (intervalo + politica.tolerancia_intervalo_segundos) * 1000)) {
      reset(e); e.motivo = intervalo === null ? 'Intervalo esperado não informado; consecutividade não comprovada.' : 'Lacuna temporal interrompeu a sequência.';
    }
    e.ultima_amostra_em = p.medido_em;
    const nivelPonto = classificarRio(p.nivel_m, a.limites);
    if (nivelPonto === null || p.qualidade === 'indisponivel' || p.qualidade === 'atrasado') {
      reset(e); e.motivo = 'Amostra inválida ou atrasada interrompeu a sequência.'; continue;
    }
    if (severidade[nivelPonto] > severidade[e.nivel!]) {
      e.nivel = nivelPonto; e.desde = p.medido_em; reset(e);
      transicoes.push({ nivel: nivelPonto, em: p.medido_em });
    } else {
      const limite = limiteResponsavel(e.nivel, a.limites);
      if (limite !== null && p.nivel_m! < limite) {
        e.normalizacao.leituras_abaixo += 1; e.normalizacao.ultima_leitura_em = p.medido_em;
        if (e.normalizacao.leituras_abaixo === 3) {
          e.nivel = anteriorNivel[e.nivel!]; e.desde = p.medido_em; reset(e);
          transicoes.push({ nivel: e.nivel, em: p.medido_em });
        }
      } else reset(e);
    }
  }
  // Mesmo sem série confiável, uma leitura atual válida pode escalar imediatamente.
  if (severidade[classe!] > severidade[e.nivel!]) {
    e.nivel = classe; e.desde = a.medido_em; reset(e);
    transicoes.push({ nivel: classe!, em: a.medido_em });
  }
  e.ultima_amostra_em = a.medido_em; // impede reprocessar o lote mesmo quando inconsistente.
  e.ultima_valida = { nivel_m: a.nivel_m!, medido_em: a.medido_em!, limites: { ...a.limites }, tendencia: a.tendencia };
  e.normalizacao.limite_m = limiteResponsavel(e.nivel, a.limites);
  return e;
}
