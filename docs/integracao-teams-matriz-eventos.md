# Microsoft Teams — matriz oficial de eventos V1

Status: aprovada pelo solicitante em 13/10/2026 nesta conversa. Referência para implementação e homologação futura. Não autoriza implementação ou envio nesta etapa.

## Estado operacional consolidado

| Evento | Notificar | Classificação |
|---|---|---|
| Normalidade → Atenção | Sim | Atenção |
| Atenção → Alerta | Sim | Agravamento |
| Alerta → Emergência | Sim | Crítico |
| Saltos para níveis superiores | Sim | Conforme nível de destino: Atenção / Agravamento para Alerta / Crítico para Emergência |
| Emergência → Alerta | Sim | Redução |
| Alerta → Atenção | Sim | Redução |
| Qualquer nível → Normalidade | Sim | Normalização |
| Qualquer outra redução | Sim | Redução |
| Nível permanece igual | Não | Sem evento |
| Nova coleta sem mudança de nível | Não | Sem evento |

Considerar exclusivamente o estado consolidado após as regras e a histerese existentes. Não notificar alterações isoladas de estações, chuva, rios ou Blumenau.

## Impacto JBS — dimensão independente

| Evento | Notificar | Classificação |
|---|---|---|
| Inativo → ativo | Sim | Crítico |
| Ativo → inativo | Sim | Encerramento |
| Permanece ativo | Não | Sem evento |
| Permanece inativo | Não | Sem evento |

Identificar confirmação/encerramento como ação manual autorizada. Não modificar PIN, Edge Function, concorrência, persistência ou regras homologadas do Impacto JBS.

## Inicialização, recuperação e duplicidade

- Inicialização da aplicação/motor não gera notificação por si só.
- Sem referência anterior confiável, não fabricar transição.
- Usar a última referência operacional consolidada e persistida.
- Identidade única persistente para cada transição confirmada.
- Reexecuções, retries e coletas subsequentes não criam evento novo para a mesma transição.
- Transições iguais em momentos diferentes geram eventos distintos.
- Recuperar pendências após falhas/reinícios, sem inventar mudanças intermediárias.
- Mudança de nível e confirmação de Impacto no mesmo processamento preservam eventos individuais; avaliar comunicação consolidada para evitar redundância ou contradição.

## Conteúdo obrigatório

Monitoramento El Niño — JBS Terminais; ambiente; tipo do evento; nível anterior/novo quando aplicável; data/hora da transição em America/Sao_Paulo; justificativa real do motor quando disponível; identificação explícita da ação manual de Impacto; link do painel do ambiente. Nunca inventar justificativas meteorológicas, impactos ou causas.

Todas as notificações de homologação devem destacar **[HML — TESTE]**.

## Requisitos técnicos aprovados

Backend exclusivo; Workflow do Teams; idempotência persistente; registro de tentativas/resultados; retries transitórios limitados; falhas Teams não bloqueiam coleta/motor/publicação; webhook/credenciais em secrets backend; HML e PRD separados. Sem segundo motor ou alteração de gatilhos/histerese.

## Limite de autorização

Nesta etapa: documentação, inspeção e planejamento somente. Implementação, migrations, publicação de alterações e envio de mensagens dependem da aprovação posterior do plano técnico.
