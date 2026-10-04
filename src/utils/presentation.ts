import { codigoHidrologicoSchema, severidade, type NivelJbs, type Status } from '../domain/contracts';

const numeros = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
export const medida = (n: number | null | undefined, unidade = '') => n == null ? 'Não informado' : `${numeros.format(n)}${unidade ? ` ${unidade}` : ''}`;
export const horario = (data: string | null | undefined) => data ? new Date(data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : 'Não informado';
export const dia = (data: string) => new Date(`${data}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit' });
export const qualidade = (q: string | null | undefined) => ({ atualizado: 'Atualizado', atrasado: 'Atrasado', indisponivel: 'Indisponível', parcialmente_degradado: 'Parcialmente degradado', degradado: 'Degradado' })[q ?? ''] ?? 'Qualidade não informada';
export const tendencia = (t: string | undefined) => ({ subindo: '↑ Subindo', descendo: '↓ Descendo', estavel: '→ Estável' })[t ?? ''] ?? 'Não informada';
export const simbolos: Record<NivelJbs, string> = { normalidade: '🟢', atencao: '🟡', alerta: '🟠', emergencia: '🔴' };

// Apenas apresentação do estado já calculado: nenhuma classificação por limiar no frontend.
export function resumoRios(status: Status) {
  const contagem: Record<NivelJbs | 'desconhecido', number> = { normalidade: 0, atencao: 0, alerta: 0, emergencia: 0, desconhecido: 0 };
  let maior: NivelJbs | null = null;
  let retidas = 0;
  for (const codigo of codigoHidrologicoSchema.options) {
    const estado = status.motor?.rios[codigo];
    const nivel = estado?.nivel ?? null;
    contagem[nivel ?? 'desconhecido']++;
    if (nivel && (maior === null || severidade[nivel] > severidade[maior])) maior = nivel;
    if (estado?.stale && nivel) retidas++;
  }
  return { contagem, maior, retidas };
}

export function maximoChuva(status: Status, campo: 'chuva_1_h_mm' | 'chuva_24_h_mm') {
  const validas = Object.values(status.chuvas).filter(e => e[campo] !== null && e.qualidade !== 'indisponivel');
  if (!validas.length) return null;
  const maximo = Math.max(...validas.map(e => e[campo]!));
  return { valor: maximo, estacoes: validas.filter(e => e[campo] === maximo) };
}
