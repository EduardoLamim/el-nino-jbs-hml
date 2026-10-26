/** Preencher somente com sequência, responsáveis e contatos fornecidos e autorizados. */
export interface ActivationStep {
  id: string;
  order: number;
  responsible: string;
  contacts: { label: string; phone: string }[];
}
export const activationHierarchy: ActivationStep[] = [];
