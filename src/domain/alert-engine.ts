import { codigoHidrologicoSchema, flagOficialSchema, nivelPorFlag, parseStatus, severidade, statusSchema,
  type EntradaMotorAutomatico, type EstadoMotor, type EstadoOficial, type Gatilho, type NivelJbs,
  type SituacaoOficial, type Status } from './contracts';
import { avaliarRioDetalhado, politicaHidrologica, tempo } from './hydrology';

const rotulos = { normalidade: 'Normalidade', atencao: 'Atenção', alerta: 'Alerta', emergencia: 'Emergência' };
function avaliarOficial(atual: SituacaoOficial | null, anterior: EstadoOficial | undefined, agora: string): EstadoOficial {
  const e: EstadoOficial = anterior ? structuredClone(anterior) : { nivel: null, desde: null, stale: true, motivo: null, ultima_valida: null };
  const t = tempo(atual?.atualizado_em);
  const anteriorT = tempo(e.ultima_valida?.atualizado_em);
  const valida = atual && flagOficialSchema.safeParse(atual.flag).success
    && atual.qualidade !== 'indisponivel' && atual.qualidade !== 'atrasado'
    && t !== null && t <= tempo(agora)! && (anteriorT === null || t >= anteriorT);
  if (!valida) {
    e.stale = true; e.motivo = 'Situação oficial ausente, inválida, atrasada ou anterior à última conhecida.';
    return e;
  }
  const nivel = nivelPorFlag[atual.flag!];
  e.desde = e.nivel === nivel ? e.desde : atual.atualizado_em;
  e.nivel = nivel; e.stale = false; e.motivo = null; e.ultima_valida = { ...atual };
  return e;
}
export function avaliarFontesPrincipais(entrada: EntradaMotorAutomatico): EstadoMotor {
  return avaliarDetalhado(entrada).motor;
}
interface Transicao { origem: string; nivel: NivelJbs; em: string | null }
function avaliarDetalhado(entrada: EntradaMotorAutomatico): { motor: EstadoMotor; transicoes: Transicao[] } {
  if (tempo(entrada.avaliado_em) === null) throw new Error('Instante de avaliação inválido.');
  const oficial = avaliarOficial(entrada.situacao_oficial, entrada.memoria?.situacao_oficial, entrada.avaliado_em);
  const transicoes: Transicao[] = [];
  if (oficial.nivel && oficial.nivel !== entrada.memoria?.situacao_oficial.nivel)
    transicoes.push({ origem: 'oficial', nivel: oficial.nivel, em: oficial.desde });
  const rios = Object.fromEntries(codigoHidrologicoSchema.options.map(codigo => {
    const r = avaliarRioDetalhado(codigo, entrada.rios[codigo], entrada.memoria?.rios[codigo], entrada.avaliado_em, politicaHidrologica);
    transicoes.push(...r.transicoes.map(t => ({ ...t, origem: codigo })));
    return [codigo, r.estado];
  }));
  return { motor: {
    versao: 1, avaliado_em: entrada.avaliado_em,
    situacao_oficial: oficial, rios,
  }, transicoes };
}
function maiorNível(motor: EstadoMotor): NivelJbs | null {
  const niveis = [motor.situacao_oficial.nivel, ...Object.values(motor.rios).map(r => r?.nivel ?? null)];
  return niveis.reduce<NivelJbs | null>((max, n) => n !== null && (max === null || severidade[n] > severidade[max]) ? n : max, null);
}
function gatilhos(motor: EstadoMotor): Gatilho[] {
  const lista: Gatilho[] = [];
  const oficial = motor.situacao_oficial;
  if (oficial.nivel && oficial.nivel !== 'normalidade') lista.push({ tipo: 'situacao_oficial',
    origem: 'Defesa Civil de Itajaí', severidade: oficial.nivel,
    descricao: `Situação oficial da Defesa Civil de Itajaí em ${rotulos[oficial.nivel]}.`,
    atualizado_em: oficial.ultima_valida?.atualizado_em ?? null, stale: oficial.stale, motivo: oficial.motivo });
  for (const r of Object.values(motor.rios)) {
    if (!r?.nivel || r.nivel === 'normalidade') continue;
    lista.push({ tipo: 'estacao_hidrologica', origem: r.codigo, nome: r.nome, severidade: r.nivel,
      descricao: `${r.codigo} — ${r.nome}: estado hidrológico ${rotulos[r.nivel]}.`,
      atualizado_em: r.ultima_valida?.medido_em ?? null, stale: r.stale, motivo: r.motivo,
      nivel_observado_m: r.ultima_valida?.nivel_m ?? null, limite_responsavel_m: r.normalizacao.limite_m,
      tendencia: r.ultima_valida?.tendencia ?? 'desconhecida',
      normalizacao: { leituras_abaixo: r.normalizacao.leituras_abaixo, necessarias: 3 } });
  }
  return lista;
}
function desdeGlobal(nivel: NivelJbs | null, anterior: Status | null, transicoes: Transicao[]): string | null {
  if (nivel === null || !anterior?.motor || anterior.nivel_jbs.nivel === null) return null;
  // Sem horário de alguma nova condição, não é possível ordenar a evolução global.
  if (transicoes.some(t => t.em === null)) return null;
  const estados = new Map<string, NivelJbs | null>([['oficial', anterior.motor.situacao_oficial.nivel],
    ...Object.entries(anterior.motor.rios).map(([codigo, r]): [string, NivelJbs | null] => [codigo, r?.nivel ?? null])]);
  let atual = anterior.nivel_jbs.nivel;
  let desde = anterior.nivel_jbs.desde;
  const ordenadas = [...transicoes].sort((a, b) => tempo(a.em)! - tempo(b.em)!);
  for (let i = 0; i < ordenadas.length;) {
    const em = ordenadas[i]!.em!;
    // Mudanças simultâneas são aplicadas juntas, sem transição global artificial.
    do {
      const t = ordenadas[i++]!; estados.set(t.origem, t.nivel);
    } while (i < ordenadas.length && tempo(ordenadas[i]!.em) === tempo(em));
    const max = [...estados.values()].reduce<NivelJbs | null>((m, n) => n && (m === null || severidade[n] > severidade[m]) ? n : m, null);
    if (max !== atual) { atual = max!; desde = em; }
  }
  return atual === nivel ? desde : null;
}
/** Risco depende somente das fontes principais; complementares só afetam qualidade. */
export function aplicarMotor(novo: Status, anteriorDesconhecido?: unknown, avaliadoEm = novo.atualizado_em): Status {
  if (!avaliadoEm || tempo(avaliadoEm) === null) throw new Error('Motor exige instante de avaliação explícito.');
  const prev = anteriorDesconhecido === undefined ? null : statusSchema.safeParse(anteriorDesconhecido);
  const candidato = prev?.success ? prev.data : null;
  const futuro = candidato && tempo(candidato.motor?.avaliado_em ?? candidato.atualizado_em) !== null
    && tempo(candidato.motor?.avaliado_em ?? candidato.atualizado_em)! > tempo(avaliadoEm)!;
  const inconsistente = candidato?.motor && maiorNível(candidato.motor) !== candidato.nivel_jbs.nivel;
  const anterior = futuro || inconsistente ? null : candidato;
  let memoria = anterior?.motor;
  if (anterior && !memoria) {
    // Migração do retrato Fase 02: inicializa última condição válida, não inventa contagem.
    memoria = avaliarFontesPrincipais({ situacao_oficial: anterior.fontes.situacao_atual?.resultado === 'falha' ? null : anterior.situacao_oficial,
      rios: anterior.fontes.rios?.resultado === 'falha' ? {} : anterior.rios,
      avaliado_em: anterior.atualizado_em ?? avaliadoEm });
  }
  const situacao = novo.fontes.situacao_atual?.resultado === 'falha' ? null : novo.situacao_oficial;
  const rios = novo.fontes.rios?.resultado === 'falha' ? {} : novo.rios;
  const { motor, transicoes } = avaliarDetalhado({ situacao_oficial: situacao, rios, memoria, avaliado_em: avaliadoEm });
  const nivel = maiorNível(motor);
  const problemas = [...novo.qualidade_monitoramento.problemas];
  if ((prev && !prev.success) || futuro || inconsistente) problemas.push('Status anterior inválido: continuidade descartada; cálculo usa somente dados atuais.');
  const principais = [motor.situacao_oficial, ...Object.values(motor.rios).filter(r => r !== undefined)];
  for (const p of principais) {
    if (p.motivo) problemas.push(`${'codigo' in p ? p.codigo : 'Situação oficial'}: ${p.motivo}`);
  }
  if (novo.previsao.disponibilidade === 'indisponivel') problemas.push('Previsão do tempo indisponível');
  for (const [id, fonte] of Object.entries(novo.fontes)) {
    if (fonte.resultado === 'falha') problemas.push(`${id}: ${fonte.motivo ?? 'Falha de aquisição.'}`);
  }
  const validasAtuais = principais.filter(p => !p.stale && p.nivel !== null).length;
  const estado = validasAtuais === 0 ? 'degradado'
    : validasAtuais < principais.length || problemas.length > 0 ? 'parcialmente_degradado' : 'atualizado';
  return parseStatus({ ...novo, motor,
    nivel_jbs: { nivel, desde: desdeGlobal(nivel, anterior, transicoes), gatilhos: gatilhos(motor) },
    qualidade_monitoramento: { estado, problemas: [...new Set(problemas)] },
  });
}
