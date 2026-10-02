import { z } from 'zod';
import { barragemSchema, codigoHidrologicoSchema, estacaoHidrologicaSchema,
  estacaoPluviometricaSchema, flagOficialSchema, situacaoOficialSchema } from '../../src/domain/contracts';

const numero = z.number().finite().nullable();
const instante = z.string().datetime({ offset: true }).nullable();
const qualidadeOriginal = z.object({ estado: z.string(), medido_em: instante });
const qualidades = z.record(qualidadeOriginal);
const base = z.object({ codigo: z.string().min(1), nome: z.string().min(1), medido_em: instante,
  atualizacao_esperada_segundos: z.number().int().positive().nullable() });
function qualidade(estado?: string): 'atualizado' | 'atrasado' | 'indisponivel' | null {
  if (estado === undefined) return null;
  if (estado === 'atual') return 'atualizado';
  if (estado === 'atrasado' || estado === 'indisponivel') return estado;
  throw new Error(`Qualidade oficial desconhecida: ${estado}`);
}
function unicos<T>(itens: Array<[string, T]>): Record<string, T> {
  if (new Set(itens.map(([id]) => id)).size !== itens.length) throw new Error('Códigos duplicados na fonte.');
  return Object.fromEntries(itens);
}
export function normalizarSituacao(payload: unknown) {
  const { data } = z.object({ data: z.object({ flag: flagOficialSchema,
    conteudo: z.string(), atualizado_em: z.string().datetime({ offset: true }) }) }).parse(payload);
  return situacaoOficialSchema.parse({ ...data, qualidade: null });
}
export function normalizarAlertas(payload: unknown) {
  const envelope = z.object({ data: z.unknown() }).refine(p => Object.hasOwn(p, 'data'), 'Campo data ausente.').parse(payload);
  // Sem amostra não nula: arquiva JSON como texto inerte; não inventa severidade/campos.
  return { alertas: null, bruto: envelope.data === null ? undefined : JSON.stringify(envelope.data),
    avisos: envelope.data === null ? [] : ['Alerta complementar não nulo preservado; schema ainda não conhecido.'] };
}
export function normalizarRios(payload: unknown[]) {
  const itens = payload.map(item => {
    const e = base.extend({ codigo: codigoHidrologicoSchema, latitude: numero, longitude: numero,
      nivel_rio_m: numero, tendencia: z.enum(['subindo', 'estavel', 'descendo', 'desconhecida']).nullable(),
      situacao: z.string().nullable(), atencao_m: numero, alerta_m: numero, emergencia_m: numero,
      qualidade: qualidades, serie_12_h: z.array(z.object({ medido_em: z.unknown(),
        nivel_rio_m: z.unknown(), qualidade: qualidadeOriginal.nullable().optional() })),
    }).parse(item);
    return [e.codigo, estacaoHidrologicaSchema.parse({
      codigo: e.codigo, nome: e.nome, latitude: e.latitude, longitude: e.longitude,
      nivel_m: e.nivel_rio_m, tendencia: e.tendencia ?? 'desconhecida', situacao_fonte: e.situacao,
      limites: { atencao_m: e.atencao_m, alerta_m: e.alerta_m, emergencia_m: e.emergencia_m },
      qualidade: qualidade(e.qualidade.nivel_rio_m?.estado), qualidade_fonte: e.qualidade,
      medido_em: e.medido_em, atualizacao_esperada_segundos: e.atualizacao_esperada_segundos,
      serie_12h: e.serie_12_h.map(p => {
        const data = instante.safeParse(p.medido_em);
        const nivel = numero.safeParse(p.nivel_rio_m);
        return { medido_em: data.success ? data.data : null, nivel_m: nivel.success ? nivel.data : null,
          qualidade: !data.success || !nivel.success ? 'indisponivel' : qualidade(p.qualidade?.estado) };
      }),
    })] as const;
  });
  const rios = unicos(itens.map(([id, e]) => [id, e]));
  const ausentes = codigoHidrologicoSchema.options.filter(c => !rios[c]);
  return { rios, avisos: ausentes.length ? [`Estações ausentes: ${ausentes.join(', ')}`] : [] };
}
export function normalizarChuvas(payload: unknown[]) {
  return unicos(payload.map(item => {
    const e = base.extend({ latitude: numero, longitude: numero, qualidade: qualidades,
      chuva_10_min_mm: numero, chuva_1_h_mm: numero, chuva_12_h_mm: numero,
      chuva_24_h_mm: numero, chuva_48_h_mm: numero,
      chuva_mm_h: numero.optional(), chuva_6_h_mm: numero.optional(),
      serie_12_h: z.array(z.object({ medido_em: z.string().datetime({ offset: true }),
        chuva_mm: numero, qualidade: qualidadeOriginal.optional() })),
    }).parse(item);
    // Estado resumido só quando todos os campos informados concordam; preserva cada campo.
    const estados = Object.values(e.qualidade).map(q => qualidade(q.estado));
    return [e.codigo, estacaoPluviometricaSchema.parse({
      codigo: e.codigo, nome: e.nome, latitude: e.latitude, longitude: e.longitude,
      chuva_10_min_mm: e.chuva_10_min_mm, chuva_mm_h: e.chuva_mm_h ?? null,
      chuva_1_h_mm: e.chuva_1_h_mm, chuva_6_h_mm: e.chuva_6_h_mm ?? null,
      chuva_12_h_mm: e.chuva_12_h_mm, chuva_24_h_mm: e.chuva_24_h_mm, chuva_48_h_mm: e.chuva_48_h_mm,
      qualidade: estados.length && new Set(estados).size === 1 ? estados[0] : null,
      qualidade_fonte: e.qualidade, medido_em: e.medido_em,
      atualizacao_esperada_segundos: e.atualizacao_esperada_segundos,
      serie_12h: e.serie_12_h.map(p => ({ ...p, qualidade: qualidade(p.qualidade?.estado) })),
    })];
  }));
}
export function normalizarBarragens(payload: unknown[]) {
  return unicos(payload.map(item => {
    const medidas = { ocupacao_percentual: numero, montante_m: numero, ultima_variacao_m: numero,
      comportas_abertas: numero, comportas_fechadas: numero, extravasor_m: numero };
    const e = base.extend({ fonte: z.string(), ...medidas, qualidade: qualidadeOriginal,
      serie: z.array(z.object({ medido_em: z.string().datetime({ offset: true }), montante_m: numero,
        ocupacao_percentual: numero.optional(), ultima_variacao_m: numero.optional(),
        comportas_abertas: numero.optional(), comportas_fechadas: numero.optional(), extravasor_m: numero.optional(),
        qualidade: qualidadeOriginal.optional() })),
    }).parse(item);
    const { codigo, ...dados } = e;
    return [codigo, barragemSchema.parse({ ...dados, qualidade: qualidade(e.qualidade.estado),
      serie: e.serie.map(p => ({ medido_em: p.medido_em, montante_m: p.montante_m,
        ocupacao_percentual: p.ocupacao_percentual ?? null, ultima_variacao_m: p.ultima_variacao_m ?? null,
        comportas_abertas: p.comportas_abertas ?? null, comportas_fechadas: p.comportas_fechadas ?? null,
        extravasor_m: p.extravasor_m ?? null, qualidade: qualidade(p.qualidade?.estado) })),
    })];
  }));
}
