import type { NivelJbs } from '../domain/contracts';
export type NivelPlano = NivelJbs | 'impacto';
// Conteúdo fornecido pelo solicitante. Não executa ações nem calcula níveis.
export const planos: Record<NivelPlano, { titulo: string; objetivo: string; orientacoes: string[] }> = {
  normalidade: { titulo: 'Normalidade', objetivo: 'Acompanhamento de rotina.', orientacoes: [
    'Acompanhar o painel e as informações da Defesa Civil.',
    'Acompanhar níveis dos rios e condições meteorológicas.',
    'Manter os contatos e procedimentos do comitê disponíveis.',
    'Registrar impacto físico no Terminal caso seja identificado.',
  ] },
  atencao: { titulo: 'Atenção', objetivo: 'Ampliar o acompanhamento e preparar a resposta caso a situação evolua.', orientacoes: [
    'Intensificar o acompanhamento da Defesa Civil e das estações hidrológicas.',
    'Acompanhar chuva e previsão meteorológica.',
    'Observar a evolução dos gatilhos que sustentam o nível.',
    'Consultar exposição territorial dos colaboradores quando necessário.',
    'Avaliar o próximo turno e possíveis dificuldades de deslocamento.',
    'Manter os responsáveis preparados para eventual evolução para Alerta.',
  ] },
  alerta: { titulo: 'Alerta', objetivo: 'Mobilizar o Comitê El Niño e avaliar preventivamente os possíveis impactos à operação.', orientacoes: [
    'Acionar o Comitê El Niño pelo grupo de WhatsApp.',
    'Avaliar a evolução dos rios, situação oficial, chuva e previsão.',
    'Consultar o Mapa para avaliar vulnerabilidade territorial e concentração de colaboradores.',
    'Avaliar possíveis dificuldades de deslocamento dos colaboradores.',
    'Avaliar condições de entrada e saída do próximo turno.',
    'Avaliar acessos ao Terminal e continuidade operacional.',
    'Preparar comunicação preventiva aos responsáveis e colaboradores, caso necessária.',
    'Manter acompanhamento da evolução até redução do nível ou escalada.',
  ] },
  emergencia: { titulo: 'Emergência', objetivo: 'Manter acompanhamento contínuo e priorizar segurança das pessoas e continuidade operacional.', orientacoes: [
    'Manter o Comitê El Niño em acompanhamento contínuo.',
    'Avaliar imediatamente condições de deslocamento dos colaboradores.',
    'Avaliar entrada, saída e troca de turno.',
    'Avaliar condições dos acessos ao Terminal.',
    'Avaliar necessidade de reorganização da operação e dos deslocamentos.',
    'Manter comunicação ativa com os responsáveis e colaboradores envolvidos.',
    'Aplicar as medidas previstas nos procedimentos de contingência conforme a situação observada.',
    'Registrar imediatamente Impacto JBS caso seja confirmado impacto físico no Terminal, infraestrutura crítica, área operacional ou acesso operacional imediato.',
  ] },
  impacto: { titulo: 'Impacto JBS', objetivo: 'Responder ao impacto físico confirmado e preservar pessoas, infraestrutura e continuidade operacional.', orientacoes: [
    'Priorizar a segurança das pessoas nas áreas envolvidas.',
    'Manter o Comitê El Niño ativo durante o impacto.',
    'Avaliar a extensão do impacto e áreas/infraestruturas envolvidas.',
    'Avaliar condições dos acessos e movimentação de pessoas.',
    'Aplicar os procedimentos de contingência correspondentes.',
    'Avaliar necessidade de restrição, reorganização ou suspensão das atividades afetadas pelos responsáveis competentes.',
    'Manter comunicação ativa durante a ocorrência.',
    'Acompanhar simultaneamente a condição ambiental subjacente.',
    'Encerrar o Impacto JBS no sistema somente após confirmação de que a condição física registrada não permanece ativa.',
  ] },
};
