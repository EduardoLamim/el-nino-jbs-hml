# Refinamento HML — Central de Planos (26/10/2026)

Escopo exclusivo HML. Conteúdo dos planos geral e por área preservado (action-plans.ts, area-plans.ts e TI sem alterações).

- Consultas agrupadas no cabeçalho: Mapa de Decisões, Contatos de Emergência, Hierarquia de Acionamento.
- Modal do mapa preservado, incluindo zoom; somente rótulo e posição do botão alterados.
- Contatos simplificados para nome/telefone e, somente nos externos, tempo de percurso. Removidos campos e código de rotas, endereços, cópia e chamadas.
- Sete externos e CCCOM cadastrados exatamente conforme os valores fornecidos pelo responsável; sem pesquisas ou complementações externas.
- Tempos estáticos do Plano de Contingência, sem cálculo de trânsito.
- Hierarquia vazia em src/content/activation-hierarchy.ts, preparada para ordem, responsável e lista de contatos. Nenhum responsável ou vínculo inventado.
- Configuração dos contatos: src/content/emergency-contacts.ts. Ambos os tipos continuam usando ContactCard.

Validações: 492 testes; 491 passaram na suíte e um teste existente de navegação excedeu 5 segundos. Repetição isolada da fase06: 28/28 aprovados, incluindo esse teste. Lint, typecheck frontend/Edge, build Pages e validação de artefato aprovados. Navegador desktop e 390 px: botões agrupados, abertura dos três modais, sete externos, CCCOM sem tempo, hierarquia vazia, fechamento/foco e zoom do mapa (100 → 150%) conferidos.

Nenhuma mudança em motor, fontes, coleta, Cron, Supabase, Teams ou PRD. Diagnóstico Teams PRD realizado separadamente, apenas leitura, sem publicação de evidências administrativas no repositório público.
