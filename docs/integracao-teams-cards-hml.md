# Refinamento dos cards Teams HML

Renderer atualizado sem alterações no transporte, persistência ou configuração. Título institucional, evento destacado, transição, Data e hora em America/Sao_Paulo (dd/MM/yyyy às HH:mm), justificativas reais e ação Abrir painel. IDs e ambiente continuam nos registros internos, sem campos técnicos no corpo.

Adaptive Cards 1.2, coluna única e TextBlocks com wrap. Atenção/Alerta usam Warning (amarelo/âmbar definido pelo cliente; laranja exato não é garantido), Emergência/Impacto confirmado Attention, normalização/encerramento Good e redução Accent, explicitamente identificada como melhoria sem normalização. Nenhum CSS, cor hexadecimal ou recurso exclusivo de desktop.

Referências: https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-format e https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/design-effective-cards

Mensagens sintéticas mantêm [HML — TESTE] e SIMULAÇÃO. Payloads já congelados na outbox não são reescritos; o renderer novo só se aplica a novos payloads. Rodapé do Workflow e secrets permanecem intactos.

Validação local: 38 testes focados do renderer/transporte aprovados. Homologação visual desktop/celular aguarda autorização de nova campanha; nenhum envio feito nesta rodada. O solicitante confirmou visualmente as cinco mensagens da campanha anterior.
