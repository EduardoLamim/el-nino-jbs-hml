# Fase 07 — Mapa e Plano de Ação

Relatório final revisado e encerrado em **03/10/2026**. Nesta revisão, os 67 arquivos do inventário foram novamente comparados com os hashes da validação final: **zero divergências**. Os resultados de testes, lint, typecheck e build abaixo correspondem à execução final da implementação em 02/10/2026; não foram reexecutados nesta revisão documental, pois não houve alteração de código. O relatório está concluído; a fase permanece parcial pelas pendências expressamente mantidas pelo usuário.

Entrega local de 02/10/2026. **Fase 07 parcialmente concluída: 33 de 36 itens do Definition of Done atendidos.** Os itens 6, 7 e 8 permanecem pendentes por ausência de geometrias históricas, de vias e de cenários individuais na base aprovada. O escopo implementado corresponde à decisão explícita do usuário durante esta fase: **“Implementar apenas a base e registrar essas camadas como pendentes”.** Não foi feita nova coleta nem substituição dessas camadas por desenhos dos bairros.

## O que foi implementado

Mapa-base com os 35 polígonos municipais existentes, exposição JBS agregada e DC01–DC11 nas coordenadas disponíveis. Controles de ampliação, redução, enquadramento e deslocamento, seleção por mapa ou listas acessíveis, detalhes recolhíveis e legenda separando condição das estações de contexto territorial. Sem tiles, imagem de satélite, mapa de ruas ou fonte adicional. Desenho em **SVG nativo/React, sem biblioteca de mapas ou dependência nova**.

O desenho usa uma projeção local de longitude/latitude com correção longitudinal pelo cosseno da latitude média, apenas para apresentação em SVG. Preserva anéis e buracos com preenchimento even-odd. Não realiza interseções, geocodificação, vínculo de estação com bairro, raio, área de influência ou conversão de níveis. O GeoJSON é validado com o contrato existente e os IDs/nomes são conferidos contra o território antes de desenhar. Falhas não geram geometrias substitutas.

Os cinco planos usam integralmente os objetivos e orientações fornecidos no pedido. O plano vigente é selecionado a partir do nível já calculado ou do Impacto JBS público ativo. A consulta de outro plano é somente estado visual local, identificada como “Consulta”; não modifica o nível vigente. Sem impacto ativo, a consulta do plano preto é explicitamente referência, sem tipo/horário de ocorrência inventados. Nível ambiental desconhecido não vira Normalidade. Orientações não enviam WhatsApp, não executam decisões e não criam tarefas.

A barra operacional compacta permanece visível por posicionamento sticky em Monitoramento, Mapa e Plano de Ação. O Dashboard conserva a faixa grande. A barra mostra os gatilhos existentes e, quando há impacto ativo, tipo, acionamento e condição ambiental subjacente. Retenção/degradação e ausência de confirmação do Terminal permanecem explícitas.

## Origem e estado das camadas

| Informação | Origem aprovada | Estado inicial e apresentação |
| --- | --- | --- |
| Limites dos bairros | `public/data/bairros.geojson`; Hosted/bairros_Itajai/FeatureServer/0, preparado na Fase 04 | Ligado; polígonos existentes, sem regeneração |
| Exposição agregada JBS | `public/data/territorio.json` | Ligado; intensidade azul-acinzentada proporcional à quantidade de residentes, sem semântica operacional |
| Estações DC01–DC11 | `public/data/status.json`, `rios` e `motor.rios` | Ligado; coordenadas, medições, limites dinâmicos, tendência, estado calculado e qualidade |
| Histórico de inundação | Indicadores de `historico_inundacao` do território, provenientes de historico_inundacoes/FeatureServer | **Camada pendente, desligada e desabilitada.** Indicadores existentes apenas nos detalhes, sem mancha desenhada |
| Vias com histórico de inundação | Indicadores de `vias_historicas_alagamento`, provenientes de Hosted/View__vias_alagamentos/FeatureServer/1, filtro aprovado | **Camada pendente, desligada e desabilitada.** Sem desenho de trechos ou contagem de ruas |
| Cenários de possível inundação | Indicadores de `susceptibilidade_hand`, provenientes do catálogo público aprovado de vias_atingidas_nivel_inundacao_publica_view, 10–400 cm | **Camada pendente, desligada e desabilitada.** Sem geometria por cenário e sem cenário selecionado |

As três camadas pendentes não são apresentadas como disponíveis nem como implementadas por meio de contornos dos bairros. Seus controles ficam desabilitados, com motivo explícito. As explicações históricas e a explicação leiga completa dos cenários estão disponíveis em seção recolhível. “HAND” aparece apenas na informação secundária de fonte/metodologia, nunca como nome principal da camada. O seletor “Cenário de inundação” está indisponível; não há fallback de cenário, escolha automática ou equivalência com leituras DC.

Nos detalhes dos bairros, indicadores verdadeiros significam somente interseção na base preparada, inclusive toque de borda. Não significam inundação do bairro inteiro, previsão ou ocorrência atual. Não há seção “Situação atual do bairro”. Indicadores negativos também não constituem garantia de segurança.

## Exposição e privacidade

290 colaboradores permanecem atribuídos aos polígonos; os outros 2 de Itajaí permanecem em localidades separadas. Portal 2 conserva 1 residente, a referência explícita a Espinheiros e a Zona 1, sem aumentar os 10 residentes de Espinheiros e sem herdar seu contexto histórico. Brilhante I conserva 1 residente, Zona 10 e ausência de correspondência, sem ser fundido com Brilhante. Nenhuma dessas localidades recebe coordenada/polígono estimado. Os totais aprovados continuam 292 em Itajaí e 88 externos.

Somente agregados preexistentes são exibidos. Não houve acesso ao XLSX original, geocodificação individual ou publicação de nomes, matrículas, endereços, cargos ou coordenadas de colaboradores. Verificação em `public/` e `dist/`: zero arquivos XLSX/XLS/CSV/TSV.

## Plano de Ação

- Normalidade: acompanhamento de rotina.
- Atenção: acompanhamento ampliado e preparação, sem acionamento formal do Comitê.
- Alerta: mobilização do Comitê e avaliação preventiva, conforme texto fornecido.
- Emergência: segurança e acompanhamento contínuo; decisões operacionais continuam humanas.
- Impacto JBS: resposta ao impacto físico confirmado; os detalhes da ocorrência usam somente a projeção pública homologada.

“Por que estamos neste nível?” reutiliza os gatilhos entregues pelo motor. Chuva, previsão, barragens, cenários e exposição não foram promovidos a gatilhos. Links para Rios, Chuva, Previsão e Mapa apenas navegam. A referência municipal usa a URL V17 já presente em `territorio.fontes`; nenhum threshold estático foi importado do documento. Não há checklist, workflow, campo de execução, responsável por tarefa, auditoria, comentários, banco adicional ou histórico de execução.

## Integração e preservação

O store de Impacto JBS continua criado e mantido pelo componente já aprovado. Foi acrescentado somente um callback de apresentação do snapshot público (`onEstado`) para o App compartilhar a mesma leitura com a barra e o plano. Nenhuma segunda conexão, assinatura Realtime, consulta periódica, cache ou escrita foi criada. A instância permanece montada durante a navegação. Ativação e encerramento continuam no componente existente do Dashboard, com validação, PIN transitório, UUID alvo, confirmação server-side e tratamento de erros inalterados.

Comparação antes/depois em **67 arquivos: 62 idênticos e 5 alterações intencionais de integração visual/teste**. Evidência: [fase-07-integridade.json](fase-07-integridade.json). Contratos, coletores, motor, histerese, qualidade, Epagri, chuva, barragens, território, GeoJSON, serviço Supabase, Edge Function, migrations, RLS/grants, concorrência e cache permaneceram idênticos. Dashboard e Monitoramento preservam seus componentes e regras. Não houve deploy, migração, alteração de secrets ou escrita remota.

## Arquivos criados

- `src/components/CompactOperational.tsx`
- `src/components/MapDetails.tsx`
- `src/content/action-plans.ts`
- `src/pages/ActionPlan.tsx`
- `src/pages/TerritoryMap.tsx`
- `src/services/map-data.ts`
- `src/utils/map-geometry.ts`
- `tests/phase07.test.tsx`
- `docs/fase-07.md`
- `docs/fase-07-integridade.json`

## Arquivos alterados

- `src/App.tsx`: rotas das duas telas, snapshot público compartilhado e barra compacta.
- `src/components/ImpactoJbs.tsx`: callback somente de apresentação; fluxo e store preservados.
- `src/components/Operational.tsx`: encaminhamento do callback.
- `src/styles.css`: estilos adicionais do mapa, barra e plano; estilos anteriores preservados.
- `tests/phase06.test.tsx`: atualização de uma expectativa obsoleta que exigia o placeholder de Mapa. O mesmo teste agora verifica a tela e reforça a permanência da única instância do store. Nenhum teste removido; demais expectativas preservadas.
- `README.md`: estado e pendências desta fase.

## Validação

**193 testes aprovados em 13 arquivos: 163 anteriores e 30 novos.** Os testes novos cobrem estações, nível vigente sem recálculo, coordenadas ausentes, limites dinâmicos, retenção, navegação, agregados e exceções territoriais, cores neutras, camadas padrão, desabilitação das pendentes, explicações, legenda, ausência de associações, validação do GeoJSON, zoom/teclado, cinco planos, consulta sem alteração do nível, referência municipal, ausência de workflow, barra compacta e atualização compartilhada do Impacto JBS.

Lint, typecheck (incluindo Edge Function) e build aprovados. Não foi acrescentada dependência ao projeto.

Inspeção no navegador local: mapa-base em desktop, mapa e Plano em 390 px, seleção da DC01, detalhe com limites dinâmicos, consulta do plano Emergência enquanto o vigente permanece Atenção. Largura observada da página de 375 px para viewport de 390 px, sem overflow horizontal. Controles e detalhes são recolhíveis; seletores oferecem alternativa de teclado/toque aos elementos pequenos do mapa. Os testes anteriores de formulários de Impacto JBS, SQL, erros e reconciliação passaram novamente.

O ambiente local de visualização continua sem confirmação Supabase, apresentado corretamente como desconhecido. A homologação HML anterior informada pelo usuário foi preservada; não houve teste de escrita remota nesta fase.

## Definition of Done — status individual

| Item | Status | Evidência / limitação |
| --- | --- | --- |
| 1. Mapa implementado | Atendido no escopo autorizado | Mapa-base interativo; camadas faltantes discriminadas abaixo |
| 2. DC01–DC11 corretas | Atendido | Coordenadas e estados existentes; sem estimar ausências |
| 3. Atual separado de contexto | Atendido | Grupos, detalhes e legenda separados |
| 4. Exposição agregada sem individuais | Atendido | Agregados aprovados, localidades preservadas |
| 5. Bairros sem classificação operacional | Atendido | Escala neutra de quantidade, independente de DC |
| 6. Camada opcional de histórico | **Pendente** | Geometrias não preparadas; usuário determinou manter pendente |
| 7. Camada opcional de vias históricas | **Pendente** | Sem geometrias dos trechos; controle desabilitado |
| 8. Camada de cenários | **Pendente** | Sem geometrias/catálogo espacial por cenário; sem seleção |
| 9. Explicação leiga de cenários | Atendido | Texto completo e limitação explícita |
| 10. Sem conversão DC → HAND | Atendido | Nenhuma associação ou conversão implementada |
| 11. Sem relação DC → bairro | Atendido | Estação e território só compartilham apresentação cartográfica |
| 12. Sem inferência de afetados | Atendido | Somente residentes agregados e contexto |
| 13. Legenda diferenciada | Atendido | Condição atual × contexto territorial |
| 14. Camadas padrão | Atendido | Bairros, exposição e estações ligadas; restantes desligadas |
| 15. Plano de Ação | Atendido | Tela implementada |
| 16. Vigente automático | Atendido | Nível existente / impacto público |
| 17. Motivo somente do motor | Atendido | Reuso dos gatilhos; sem novos gatilhos |
| 18. Cinco planos | Atendido | Conteúdo fornecido, teste de cada nível |
| 19. Consulta não altera vigente | Atendido | Estado visual sem escrita e mensagem explícita |
| 20. Impacto somente público | Atendido | Mesmo snapshot público, sem campos privados |
| 21. Links operacionais | Atendido | Rotas Monitoramento e Mapa |
| 22. Sem workflow/checklist | Atendido | Orientações estáticas, sem persistência de execução |
| 23. Referência municipal | Atendido | URL já aprovada no território |
| 24. Barra compacta fora do Dashboard | Atendido | Monitoramento, Mapa e Plano |
| 25. Responsividade | Atendido | Grid responsivo, painéis recolhíveis, inspeção em 390 px |
| 26. Privacidade | Atendido | Agregados; zero planilhas publicadas |
| 27. Sem mobilidade atual Fase 04.1 | Atendido | Nenhuma integração da camada investigada |
| 28. Sem nova regra de risco | Atendido | Motor e contratos idênticos |
| 29. Sem nova fonte | Atendido | Apenas arquivos locais e referência municipal preexistentes |
| 30. Regras Fases 01–06 preservadas | Atendido | Hashes, regressão e integração somente visual |
| 31. Testes novos | Atendido | 30 aprovados |
| 32. Testes anteriores | Atendido | 163 aprovados; uma expectativa de placeholder atualizada |
| 33. Lint | Atendido | Exit code 0 |
| 34. Typecheck | Atendido | Exit code 0, frontend e Edge |
| 35. Build | Atendido | Vite, exit code 0 |
| 36. Documentação | Atendido | Relatório, inventário e integridade |

**A Fase 07 não está integralmente concluída.** Para cumprir os itens 6–8 será necessária uma etapa futura explicitamente autorizada de preparação das geometrias históricas, dos trechos e dos cenários, com validação de sua semântica. Esta entrega para no mapa-base e no plano, conforme a decisão do usuário. Não integra a Fase 04.1 como mobilidade atual e não altera nenhuma regra de negócio das Fases 01–06.
