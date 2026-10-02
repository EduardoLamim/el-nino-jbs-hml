import type { NivelJbs } from '../domain/contracts';
const rotulos: Record<NivelJbs, string> = {
  normalidade: 'Normalidade', atencao: 'Atenção', alerta: 'Alerta', emergencia: 'Emergência',
};
export const rotuloNivel = (nivel: NivelJbs | null): string => nivel === null ? 'Desconhecido — dados insuficientes' : rotulos[nivel];
export const rotuloQuantidade = (valor: number | null): string => valor === null ? 'Não informado' : String(valor);
