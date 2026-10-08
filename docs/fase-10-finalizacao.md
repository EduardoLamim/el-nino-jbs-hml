# Fase 10 — Refinamento visual, UX e fechamento da V1

**Rodada funcional de 08/10/2026:** consultar [fechamento funcional da V1](fase-10-fechamento-funcional.md), que registra Blumenau informativo, Central de Planos/TI, temas e retry restrito de persistência. O estado de CI/publicação e dos 12 ciclos dessa revisão está discriminado no relatório; os resultados históricos abaixo não substituem sua homologação.

Data: 04/10/2026. Ambiente: **HML**. Implementação: `e62a2a80f8336473a40a702cbf8d1120e87ea926`.

**Fechamento adicional — Supabase Cron e quatro ajustes residuais:** [relatório específico](fase-10-supabase-cron.md). Implementação `93d4014`, 319 testes e CI aprovados, Edge/Cron ativos e ajustes publicados no HML pelo ciclo das 18:02 UTC de 05/10. Os 28 cenários visuais remotos, smokes GIS/fallback/nomes e mobile passaram. O bloco territorial desktop alinha ao topo dos indicadores; Monitoramento não apresenta a coleta global redundante; Chuva usa “Estações” e não apresenta a legenda removida; a fonte da previsão está próxima ao título. O mobile aprovado mantém sua distribuição e os horários individuais permanecem.

A Edge usa apenas secrets server-side, valida autorização dedicada e dispara o workflow existente na main HML. Testes remotos rejeitaram chamadas anônimas; schema/função privados não têm acesso anon/authenticated. Motor, histerese 600+120s/três leituras, Impacto JBS e pipeline foram preservados. A rodada adicional permanece **em homologação**, dependente de 12 ciclos automáticos consecutivos e retirada posterior do schedule GitHub. `workflow_dispatch` manual continua disponível. As declarações de conclusão abaixo se referem às entregas anteriores, não substituem esse critério novo. Não houve GO-LIVE/PRD.

**Atualização de 05/10/2026:** a seção [Ajustes pós-validação visual](#ajustes-pós-validação-visual) registra a rodada posterior solicitada. As seções anteriores preservam o histórico da primeira entrega; textos de qualidade, controles direcionais e política temporal ali descritos foram substituídos somente nos pontos autorizados nesta revisão.

## Objetivo e escopo

Refinar a identidade, a hierarquia e a utilização operacional da aplicação homologada na Fase 09, preservando suas regras. A única adição de controle é **Nomes dos bairros**, de natureza cartográfica. Referências: [homologação da Fase 09](fase-09-homologacao.md), [Fase 08](fase-08-implementacao.md), [evolução geoespacial](fase-07-1-implementacao.md) e [operação](operacao.md).

**Resultado: fechamento técnico concluído em HML — 49 critérios atendidos e um não aplicável (fotografias não utilizadas), sem pendências técnicas no DoD.** Evidências de CI, publicação e smoke remoto estão registradas abaixo. Esta entrega não inicia GO-LIVE nem V2 e aguarda validação visual do solicitante.

## Direção visual e materiais

A interface usa cabeçalho azul-marinho, logo oficial branco, superfícies claras e ciano para navegação/foco. As cores de risco permanecem associadas aos estados operacionais. Qualidade do monitoramento recebe apresentação neutra e identificação textual; atraso de dado não passa a significar alerta hidrológico.

O logo oficial branco fornecido em `design/` foi reduzido de 2.587 × 1.472 para 240 × 137 pixels, preservando proporção e transparência. O PNG publicado tem **6.296 bytes**, ante 68.657 bytes do original. A referência Operational Hub orientou apenas a linguagem corporativa, sem reprodução do layout. Fotografias portuárias disponíveis foram avaliadas; nenhuma foi incorporada, para manter foco na leitura e evitar peso adicional. Os materiais originais de `design/` permanecem locais.

Componentes refinados:

- Cabeçalho e navegação: logo oficial, localização Itajaí/SC, ícones de traço uniforme acompanhados de texto, estado ativo e foco evidentes. Rotas preservadas.
- Dashboard: faixa principal dividida entre condição e motivos; painel do Terminal compacto; situação oficial e rios com prioridade, seguidos de chuva/previsão e exposição.
- Barra persistente: leitura compacta fora do Dashboard; prioridade do Impacto JBS preto preservada, incluindo a condição ambiental subjacente.
- Monitoramento: códigos DC, valores, unidades, limites, atualização e detalhes com alinhamento e espaçamento consistentes. Gráfico, tabela, gaps e normalização existentes preservados.
- Chuva: mantém a janela de 1h para N de M e dados ausentes sem conversão para zero. Previsão permanece contextual. Exposição mantém 292 residentes em Itajaí e 88 fora, sem apresentar vulnerabilidade histórica como impacto atual.
- Mapa: moldura, base separada de camadas, legenda, seleção, mensagens históricas e fallback com hierarquia consistente.
- Plano: passos com leitura de guia operacional; consulta de outro nível continua sem alterar o estado vigente.
- Responsividade: grids de desktop/tablet/mobile, controles de pelo menos 44px nos grupos refinados, foco visível e respeito a movimento reduzido. Toolbar do mapa em 320px distribui zoom, enquadramento e deslocamento sem botão isolado.

## Nomes dos bairros

O checkbox inicia **desligado**, em todas as larguras. A visão inicial prioriza DC e contornos; o operador ativa nomes quando precisar de orientação. O texto de ajuda explica que ampliar o mapa permite visualizar mais nomes.

São criadas 35 feições de texto a partir das geometrias oficiais já carregadas. Para Polygon, usa-se `getInteriorPoint()`; para MultiPolygon, o ponto interior da parte de maior área. Não existem coordenadas manuais nem consulta GIS adicional para posicionar nomes.

A camada usa `declutter` compartilhado com as estações. Os marcadores/códigos DC têm prioridade e funcionam como obstáculos para os nomes. A ordem alfabética dos bairros torna a prioridade cartográfica estável, sem representar risco. O texto é azul escuro neutro, com halo branco de 4px, tamanho 11px no zoom distante e 13px a partir do zoom 14. O aumento de espaço entre feições permite mais nomes ao aproximar. Nem todos os 35 precisam estar visíveis simultaneamente.

A camada de nomes não participa do filtro de clique: seleção permanece restrita às camadas existentes de bairros e DC. Ativar nomes não altera seleção, exposição, nível, filtros nem motor. O estado persiste ao trocar as três bases ou acionar fallback, e é independente dos limites dos bairros, histórico e vias. Sem geometria territorial, a fonte de nomes fica vazia.

Em 768, 390 e 320px foram exercitados checkbox, foco, seleção, zoom e deslocamento. Labels no canvas são orientação visual; a lista acessível dos 35 bairros e os detalhes textuais continuam disponíveis.

## Comparação visual

O baseline foi capturado no HML da Fase 09 antes das alterações. As capturas “depois” usam o build local da Fase 10 com a mesma configuração pública de HML. Os dados são dinâmicos: diferenças de valores/timestamps não representam alteração de cálculo. Cada captura usa altura de viewport 960px e página completa.

| Cenário | Antes | Depois |
|---|---|---|
| Dashboard 1440 | [PNG](fase-10-visual/antes/dashboard-1440.png) | [PNG](fase-10-visual/depois/dashboard-1440.png) |
| Monitoramento 1440 | [PNG](fase-10-visual/antes/monitoramento-rios-1440.png) | [PNG](fase-10-visual/depois/monitoramento-rios-1440.png) |
| Mapa 1440 | [PNG](fase-10-visual/antes/mapa-1440.png) | [PNG](fase-10-visual/depois/mapa-1440.png) |
| Plano 1440 | [PNG](fase-10-visual/antes/plano-de-acao-1440.png) | [PNG](fase-10-visual/depois/plano-de-acao-1440.png) |
| Dashboard 768 | [PNG](fase-10-visual/antes/dashboard-768.png) | [PNG](fase-10-visual/depois/dashboard-768.png) |
| Monitoramento 768 | [PNG](fase-10-visual/antes/monitoramento-rios-768.png) | [PNG](fase-10-visual/depois/monitoramento-rios-768.png) |
| Mapa 768 | [PNG](fase-10-visual/antes/mapa-768.png) | [PNG](fase-10-visual/depois/mapa-768.png) |
| Plano 768 | [PNG](fase-10-visual/antes/plano-de-acao-768.png) | [PNG](fase-10-visual/depois/plano-de-acao-768.png) |
| Dashboard 390 | [PNG](fase-10-visual/antes/dashboard-390.png) | [PNG](fase-10-visual/depois/dashboard-390.png) |
| Monitoramento 390 | [PNG](fase-10-visual/antes/monitoramento-rios-390.png) | [PNG](fase-10-visual/depois/monitoramento-rios-390.png) |
| Mapa 390 | [PNG](fase-10-visual/antes/mapa-390.png) | [PNG](fase-10-visual/depois/mapa-390.png) |
| Plano 390 | [PNG](fase-10-visual/antes/plano-de-acao-390.png) | [PNG](fase-10-visual/depois/plano-de-acao-390.png) |
| Dashboard 320 | [PNG](fase-10-visual/antes/dashboard-320.png) | [PNG](fase-10-visual/depois/dashboard-320.png) |
| Monitoramento 320 | [PNG](fase-10-visual/antes/monitoramento-rios-320.png) | [PNG](fase-10-visual/depois/monitoramento-rios-320.png) |
| Mapa 320 | [PNG](fase-10-visual/antes/mapa-320.png) | [PNG](fase-10-visual/depois/mapa-320.png) |
| Plano 320 | [PNG](fase-10-visual/antes/plano-de-acao-320.png) | [PNG](fase-10-visual/depois/plano-de-acao-320.png) |

Revisão visual: cabeçalho mais reconhecível, motivos próximos do nível, qualidade em faixa distinta, cards com pesos diferentes e Monitoramento mais comparável. Mapa mantém área útil e controles legíveis; em telas estreitas, a navegação usa duas colunas e conteúdo flui verticalmente. Plano apresenta sequência de ações. Os [16 checks anteriores](fase-10-visual/antes/checks.json) e [16 posteriores](fase-10-visual/depois/checks.json) não registraram overflow horizontal.

Evidências adicionais: nomes nas bases [Simplificada](fase-10-visual/nomes/nomes-Simplificada.png), [Cartográfica](fase-10-visual/nomes/nomes-Cartográfica.png) e [Aérea](fase-10-visual/nomes/nomes-Aérea.png); [zoom próximo](fase-10-visual/nomes/nomes-proximo.png); [tablet](fase-10-visual/nomes/nomes-768.png), [390px](fase-10-visual/nomes/nomes-390.png), [320px](fase-10-visual/nomes/nomes-320.png). A [captura de Impacto preto](fase-10-visual/nomes/impacto-fixture.png) é uma **resposta simulada apenas no cliente**, sem acionamento real.

## Performance

[Medição detalhada](fase-10-performance.json): assets reais do HML Fase 09 versus manifesto local Fase 10, ambos com configuração pública Supabase. Gzip calculado localmente; não é medição de latência da rede ou Lighthouse.

| Asset | Antes bytes / gzip | Depois bytes / gzip |
|---|---:|---:|
| JS principal | 560.782 / 157.720 | 561.485 / 158.111 |
| CSS global | 13.162 / 3.874 | 26.892 / 6.744 |
| JS do mapa | 361.297 / 106.264 | 362.401 / 106.647 |
| CSS OpenLayers | 5.349 / 1.387 | 5.349 / 1.387 |
| JS dinâmico de estilo cartográfico | 203.633 / 58.214 | 203.633 / 58.214 |
| Logo | — | 6.296 / 6.193 |
| Total destes assets | 1.144.223 / 327.459 | 1.166.056 / 337.296 |

Aumento total: **21.833 bytes brutos e 9.837 bytes gzip (~3,0%)**. Não foram adicionadas dependências ou fotografias. O aviso Vite sobre chunk principal acima de 500KB já existia no baseline; o JS principal cresceu 703 bytes brutos. O mapa continua lazy, assim como histórico e vias. O smoke confirma ausência dos chunks cartográficos no Dashboard. Capturas e relatórios em `docs/` não compõem o artefato Pages.

## Testes e validações locais

**271 testes aprovados em 20 arquivos: 259 anteriores + 12 novos.** Nenhum teste anterior foi removido ou modificado.

- `tests/phase10-map.test.ts`: sete casos com OpenLayers real em jsdom: 35 pontos dentro das geometrias, maior parte de MultiPolygon, independência do toggle, visibilidade, declutter/estilo/prioridade, troca de bases/fallback e ausência de geometria.
- `tests/phase10-ui.test.tsx`: cinco casos: checkbox e teclado, preservação de seleção/risco/exposição, três bases/fallback e histórico/vias com nomes ativos.
- `scripts/qa/phase10-smoke.ts`: canvas realmente muda ao ligar e retorna ao desligar; 35 bairros e DC01 preservados; três bases, histórico, 555 vias, fallback duplo, tablet/mobile, foco e Impacto preto simulado.

| Verificação | Resultado local |
|---|---|
| `npm test` | 271/271; suíte completa final aprovada |
| `npm run lint` | Aprovado |
| `npm run typecheck` | Aprovado; inclui Edge |
| `npm run typecheck:edge` | Aprovado pelo encadeamento do typecheck |
| `npm run pages:build` | Aprovado, com configuração pública HML; sem credencial privada |
| `npm run data:validate` | Aprovado; status e 11 datasets históricos válidos |
| `npm run pages:validate` | Aprovado; 23 arquivos, 3.811.444 bytes na medição local |
| actionlint 1.7.12 | Aprovado com `-shellcheck= -pyflakes=`; verificações externas dessas ferramentas não executadas |
| Smoke existente | [Aprovado, inclusive GIS real](fase-10-browser-local.json) |
| Smoke Fase 10 | [Aprovado, seis grupos de verificações](fase-10-smoke-local.json) |
| Comparação visual | 16 cenários antes e depois, quatro larguras, sem overflow |

O teste de foco foi ajustado para representar navegação real por Tab/Shift+Tab: foco programático após clique não obriga o navegador a aplicar `:focus-visible`. A grade dos controles do mapa em 320px foi refinada após inspeção visual. Nenhuma alteração operacional foi necessária.

## CI, publicação e validação remota

O [CI da implementação](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37240666054) concluiu com sucesso em 04/10/2026 às 22:38:07 UTC. [Etapas registradas](fase-10-ci.json): lint, suíte, dados, build/tipos, artefato e smoke de navegador. O workflow de CI existente foi preservado.

A [publicação HML](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37240811137) terminou com sucesso às 22:39:50 UTC. O workflow existente executou coleta real, validação, persistência, build e deploy; [etapas registradas](fase-10-deploy.json). Snapshot publicado: `f173ce89771a14af81eef17c0c783d8297576c0b`. Apenas `public/data/status.json` foi atualizado por esse ciclo.

Aplicação: [Pages HML](https://eduardolamim.github.io/el-nino-jbs-hml/). Verificações pós-publicação, em 04/10/2026:

- [Smoke existente no HML](fase-10-browser-hml.json), iniciado às 22:42:26 UTC: quatro páginas, rotas diretas/refresh, formulário sem envio, lazy loading, 35 bairros, 11 DC, histórico, vias, duas bases municipais reais e mobile 390/320. Nenhum asset local falhou e nenhuma exceção JavaScript foi registrada. Os erros de rede GIS induzidos no teste de fallback e dois tiles municipais 404 estão discriminados no JSON.
- [Smoke específico Fase 10 no HML](fase-10-smoke-hml.json): nomes nas três bases, alteração/restauração do canvas, seleção e nível preservados, teclado, 768/390/320px, histórico/vias e fallback duplo. A apresentação de Impacto preto e seu formulário foram testados por interceptação no cliente, sem comando remoto.
- [Supabase somente leitura](fase-10-supabase.json), às 22:42:21 UTC: projeção pública acessível, revisão 10, `ativo=false`; Realtime atingiu `SUBSCRIBED` e foi encerrado normalmente. Nenhum evento novo foi provocado; entrega de eventos e concorrência permanecem cobertas pela homologação da Fase 09 e pela integridade do código. Nenhum PIN foi coletado e nenhuma mutação foi enviada.
- [Capturas HML finais](fase-10-visual/hml/checks.json): 16 cenários sem overflow, após aguardar a confirmação assíncrona do Terminal no Dashboard. Exemplos: [Dashboard desktop](fase-10-visual/hml/dashboard-1440.png), [Monitoramento tablet](fase-10-visual/hml/monitoramento-rios-768.png), [Mapa 320](fase-10-visual/hml/mapa-320.png), [Plano 390](fase-10-visual/hml/plano-de-acao-390.png). A interface confirmou “Nenhum impacto físico confirmado” nas quatro larguras.

A revisão visual remota confirmou logo, hierarquia, mensagens, controles mobile e halo dos nomes sobre imagem aérea. A primeira captura rápida havia registrado o estado inicial ainda sem confirmação do Supabase; foi substituída por captura que aguarda a leitura efetiva, sem alteração do produto.

## Integridade e arquivos

[Inventário SHA-256](fase-10-integridade.json): dos 143 arquivos existentes no baseline, 134 permanecem idênticos, oito fontes receberam alterações visuais/cartográficas e um arquivo (`public/data/status.json`) mudou exclusivamente por snapshots da automação HML, incorporados por fast-forward. Motor, contratos, coletores, thresholds, histerese, qualidade, Supabase, Edge, RPC, PIN, Realtime, concorrência, workflows, schedule, persistência, datasets territoriais/históricos/vias e regras do Plano permanecem intactos.

Fontes alteradas (oito): `src/App.tsx`, `src/components/Navegacao.tsx`, `src/components/Operational.tsx`, `src/components/Weather.tsx`, `src/map/engine.ts`, `src/pages/Dashboard.tsx`, `src/pages/TerritoryMap.tsx`, `src/styles.css`.

Arquivos criados de implementação: `src/assets/jbs-terminais-branco.png`, `src/components/NavIcon.tsx`, `src/map/neighborhood-labels.ts`, `tests/phase10-map.test.ts`, `tests/phase10-ui.test.tsx`, `scripts/qa/phase10-smoke.ts`.

Documentação criada: este relatório, `fase-10-performance.json`, `fase-10-integridade.json`, `fase-10-ci.json`, `fase-10-deploy.json`, `fase-10-browser-local.json`, `fase-10-smoke-local.json`, `fase-10-browser-hml.json`, `fase-10-smoke-hml.json`, `fase-10-supabase.json` e a pasta `fase-10-visual/` com 56 capturas (16 antes, 16 depois locais, oito específicas e 16 HML) e respectivos checks. O inventário inclui a lista completa das adições do commit de implementação. Helpers temporários e credenciais não integram a entrega.

## Limitações

- Declutter oculta nomes que colidiriam na escala atual; aproximar ou usar a lista é o caminho previsto. Não é um inventário textual simultâneo dos 35 bairros sobre o canvas.
- Bases municipais dependem da disponibilidade/cobertura do GIS. Tiles externos 404 observados são distintos de falhas de assets locais; fallback preserva operação das camadas locais.
- Acessibilidade avaliada por smoke de teclado, foco, labels, informação textual e inspeção visual; não constitui auditoria WCAG completa.
- O tamanho de assets foi comparado; não se promete desempenho de rede ou dispositivo específico. O warning preexistente do chunk principal permanece registrado.
- A apresentação ativa de Impacto usa fixture no cliente; mutações, PIN inválido e concorrência já homologados na Fase 09 não são repetidos nesta etapa visual, pois o código correspondente está intacto.
- A validação visual final pela JBS permanece a cargo do solicitante. PRD, novo Supabase, novo repositório e V2 não foram criados.

## Definition of Done — 50 itens

| # | Critério | Resultado / evidência |
|---:|---|---|
| 1 | Baseline anterior | Atendido — 16 capturas do HML Fase 09 |
| 2 | Identidade consistente | Atendido — marinho, ciano, superfícies e tipografia coerentes |
| 3 | Cabeçalho | Atendido — logo oficial e título, altura contida |
| 4 | Navegação | Atendido — quatro rotas, texto, ícones e foco |
| 5 | Barra operacional | Atendido — compacta e persistente; prioridade preta preservada |
| 6 | Hierarquia Dashboard | Atendido — nível/motivos, Terminal, oficial/rios e complementos |
| 7 | Risco distinto de qualidade | Atendido — paleta semântica versus faixa neutra textual |
| 8 | Monitoramento | Atendido — grupos e estados refinados |
| 9 | Rios | Atendido — 11 DC comparáveis; detalhes preservados |
| 10 | Chuva | Atendido — legibilidade e semântica 1h N de M preservada |
| 11 | Previsão | Atendido — apresentação contextual |
| 12 | Exposição | Atendido — agregados e distinção histórico/atual preservados |
| 13 | Mapa | Atendido — moldura, controles, legenda e detalhes |
| 14 | Bases/camadas | Atendido — grupos separados |
| 15 | Controle Nomes | Atendido — checkbox independente |
| 16 | Labels | Atendido — 35 feições; canvas ON/OFF verificado |
| 17 | Declutter | Atendido — colisões e prioridade DC, testes/inspeção |
| 18 | Três bases | Atendido — capturas e smoke com GIS real |
| 19 | Seleção preservada | Atendido — testes unitários e browser |
| 20 | Risco preservado | Atendido — testes e integridade do motor |
| 21 | Histórico | Atendido — carregamento com nomes ativos |
| 22 | Vias históricas | Atendido — 555 feições carregadas |
| 23 | Fallback | Atendido — falha simulada nas duas bases com nomes ativos |
| 24 | Plano | Atendido — guia refinado; regras intactas |
| 25 | Identidade JBS | Atendido — logo oficial otimizado |
| 26 | Fotos otimizadas se usadas | Não aplicável — nenhuma foto publicada; logo otimizado |
| 27 | Desktop | Atendido — quatro páginas em 1440px |
| 28 | Tablet | Atendido — quatro páginas e interação em 768px |
| 29 | 390px | Atendido — capturas, controles e ausência de overflow |
| 30 | 320px | Atendido — capturas, toolbar e ausência de overflow |
| 31 | Acessibilidade smoke | Atendido — teclado, foco, labels e informações textuais |
| 32 | Performance | Atendido — +9.837 bytes gzip nos assets comparados |
| 33 | Lazy loading | Atendido — mapa ausente do Dashboard; histórico sob demanda |
| 34 | Screenshots depois | Atendido — 16 capturas + oito específicas |
| 35 | Comparação | Atendido — matriz antes/depois e análise neste relatório |
| 36 | Testes novos | Atendido — 12/12 |
| 37 | Testes anteriores | Atendido — 259/259, arquivos anteriores intactos |
| 38 | Lint | Atendido — local e CI |
| 39 | Typecheck | Atendido — local e CI |
| 40 | Edge typecheck | Atendido — incluído no encadeamento de build |
| 41 | Pages build | Atendido — local e CI |
| 42 | Data validation | Atendido — local e CI |
| 43 | Pages validation | Atendido — local e CI |
| 44 | actionlint | Atendido — escopo e flags registrados |
| 45 | Smoke local | Atendido — existente e específico Fase 10 |
| 46 | CI remoto | Atendido — execução 37240666054 |
| 47 | HML atualizado | Atendido — deploy 37240811137 e quatro páginas verificadas |
| 48 | GIS remoto | Atendido — bases municipais reais, nomes e fallback no HML |
| 49 | Supabase/Impacto | Atendido — leitura pública, Realtime, confirmação na UI e formulário; estado preto por fixture |
| 50 | Ausência de regressão | Atendido no escopo testado — suíte, integridade, inspeção visual e smokes local/remoto |

## Encerramento

Fase 10 concluída tecnicamente no mesmo HML. **49 itens atendidos + um não aplicável = 50 itens avaliados, zero pendências técnicas.** Nenhuma regressão operacional foi encontrada nas verificações realizadas. A aplicação e este relatório estão disponíveis para validação do solicitante. Não foi criado PRD, Supabase novo, repositório novo ou V2. A promoção HML → PRD depende de aprovação explícita em etapa separada.

## Ajustes pós-validação visual

Rodada solicitada em 05/10/2026, exclusivamente dentro da Fase 10. Commit de implementação: `c78b2953e6e3ee46ca0abd5f2f3d04adc4d03150`. O feedback aprovou a distribuição mobile e pediu linguagem menos técnica, ajustes de identidade/ícones, espaçamento, mapa e investigação da atualização dos dados, além de autorizar alvo de coleta de 10 minutos e tolerância adicional de 120s.

### Ajustes executados

| Feedback | Implementação |
|---|---|
| Retirar diagnóstico de qualidade | Removidos badges, coluna de qualidade, diagnóstico global e detalhes internos da UI. Qualidade permanece no schema, JSON, motor, logs e testes. O horário da coleta JBS permanece explícito. |
| Manter indisponibilidade verdadeira | Mantidos “Dado indisponível”, “Sem dado recente”, estado desconhecido e avisos de confirmação pendente; ausência nunca vira Normalidade. |
| Defesa Civil | [SVG do próprio portal oficial](https://monitoramento.defesacivil.itajai.sc.gov.br/img/portal/logo_defesa.svg), 1.521 bytes, dimensão de apresentação 48 × 47. Cor do nível usa `nivelPorFlag`, sem interpretar conteúdo livre. |
| Horário oficial | Campo confirmado em `situacao-atual.data.atualizado_em`; rótulo “Última atualização da Defesa Civil”, com data e hora para distinguir os dias. Separado de “Coleta JBS”. |
| Chuva | SVG leve, sem foto; removida explicação metodológica, preservados máximos e N/M da última 1h. |
| Previsão | Mesmos ícones no Dashboard e Monitoramento. Mapeamento exato das condições comprovadas no JSON atual/fixture oficial: “Encoberto com chuva”, “Nebulosidade variável e chuva isolada” e “Céu encoberto”. Texto permanece; condição nova recebe símbolo informativo neutro, sem inferência meteorológica. |
| Contexto territorial | Card mantém tamanho/peso, 292/88 e agregados. Concentrações alinhadas ao topo da região dos indicadores no desktop, sem relação com rios ou alerta. |
| Rios | Acento lateral usa exclusivamente nível calculado pelo motor. Coordenadas retiradas dos detalhes textuais, preservadas nos dados/mapa. Tabela da série mostra mais recente primeiro, sem coluna qualidade; gráfico mantém ordenação temporal própria e gaps. |
| Mapa | Removidos botões direcionais, links de proveniência/datasets/fontes técnicas e explicações técnicas das bases. Mouse, touch, drag, wheel, zoom, setas do teclado, nomes e seletores preservados. |
| Base e avisos | Legend da base dentro da superfície branca, sem borda atravessando o texto. Avisos históricos e de vias com separação vertical, preservando histórico ≠ condição atual. |
| Contextos e títulos | Fontes/contextos dos cards e páginas passam para baixo dos títulos. Identificação institucional do cabeçalho e rótulo operacional mantidos. |
| Motivos do nível | “Por que estamos neste nível?” e explicação clara quando não há gatilho elevado; motivos de elevação usam apenas gatilhos existentes. |
| Plano | Sem título duplicado nos motivos, alinhado ao grid principal, com respiro após consulta, objetivos e antes do aviso final. Regras do conteúdo não alteradas. |
| Mobile | Estrutura anterior preservada em 390/320px; apenas os ajustes solicitados adaptados. |

### Investigação e política temporal

O [relatório específico de investigação](fase-10-investigacao-atualizacao.md) contém a cadeia portal → resposta → parser/coletor → Actions → commit → Pages → frontend, headers, horários e diferenças por estação. A reprodução localizou a diferença antes da coleta: ausência de novos ciclos agendados, enquanto fonte e parser já disponibilizavam leituras novas. Pages e Git continham o mesmo arquivo antigo, inclusive em consulta sem cache prévio. O motivo interno de o agendador GitHub não emitir os disparos não é observável pela API e não foi inventado.

Também foi corrigida a aba que antes carregava dados uma única vez: releitura a cada 600s quando visível e ao retornar à aba, `no-cache` para revalidar status, proteção contra consultas simultâneas e snapshot regressivo. Falha preserva o último snapshot com aviso. Isso não cria dados novos no Pages nem substitui o coletor.

Cron final: **`2,12,22,32,42,52 * * * *`**, UTC, alvo de **10 minutos**. Continuidade: **600 + 120 = 720 segundos**, mantendo **três leituras oficiais válidas**, inclusive em um lote, e quebra acima da tolerância. A mudança não promete execução pontual do GitHub Actions nem elimina por si só a lacuna observada. Documentação operacional atualizada em [operação](operacao.md).

### Testes e gates

**302 testes aprovados em 23 arquivos: 271 casos preservados + 31 novos.** Seis expectativas antigas de qualidade/indisponibilidade e continuidade foram adaptadas ao comportamento expressamente solicitado, sem apagar casos. Os testes de domínio/integração de qualidade continuam ativos.

- `phase10-adjustments.test.tsx`: 18 casos de ausência de diagnóstico, dados preservados, quatro flags oficiais/horário/logo, ausência real, cinco estados DC, série descendente, chuva, condições meteorológicas e Plano.
- `phase10-cadence.test.ts`: nove casos para 600/660/719/720s, quebra em 720,001/721/900s, repetição de leitura e cron/serialização. Um lote com três leituras normaliza; três execuções da mesma leitura não.
- `phase10-refresh.test.tsx`: quatro casos de releitura, retorno à aba/limpeza, falha preservando dados, rejeição de snapshot antigo e prevenção de duplicação de requisição.
- `phase10-adjustments-smoke.ts`: 28 combinações de página/largura, mais recortes de componentes. Verifica ausência de textos/links técnicos, teclado do mapa real, nomes, histórico/vias, Plano, dados do Terminal e ausência de overflow.
- Smoke pré-existente e smoke dos nomes reexecutados com GIS real, fallback duplo e estado preto simulado no cliente. O teste de pan passou a utilizar a seta do teclado após a remoção autorizada do botão visual.

| Gate local | Resultado |
|---|---|
| `npm test` | 302/302 |
| `npm run lint` | Aprovado |
| `npm run typecheck` | Aprovado |
| `npm run typecheck:edge` | Aprovado também em execução explícita |
| `npm run pages:build` | Aprovado com configuração pública do HML |
| `npm run data:validate` | Aprovado; 11 datasets históricos íntegros |
| `npm run pages:validate` | Aprovado; 23 arquivos, 3.810.835 bytes no artefato local |
| actionlint 1.7.12 | Aprovado; `-shellcheck= -pyflakes=` |
| Smoke navegador | [Geral/GIS](fase-10-atualizacao/browser-local.json), [nomes](fase-10-atualizacao/nomes-local.json), [28 cenários de ajustes](fase-10-visual/ajustes-local/checks.json) aprovados |

Sem novas dependências. JS principal do build com configuração pública: 564,39KB / 160,02KB gzip; JS do mapa: 361,38KB / 106,40KB gzip; CSS global: 28,55KB / 7,07KB gzip. Logo oficial é SVG leve incorporado pelo build. O aviso preexistente de chunk principal acima de 500KB permanece. Lazy loading do mapa/histórico e ausência de GIS no Dashboard foram preservados.

### Evidências visuais

Capturados 52 PNGs locais: sete páginas/seções em quatro larguras (28), quatro cards em quatro larguras (16), rio/série expandida (4) e seletor da base (4). Não há overflow em 1440, 768, 390 ou 320px. Exemplos:

| Componente | Evidência local |
|---|---|
| Dashboard | [1440](fase-10-visual/ajustes-local/dashboard-1440.png), [768](fase-10-visual/ajustes-local/dashboard-768.png), [390](fase-10-visual/ajustes-local/dashboard-390.png), [320](fase-10-visual/ajustes-local/dashboard-320.png) |
| Defesa Civil / chuva | [Defesa Civil](fase-10-visual/ajustes-local/defesa-civil-1440.png), [chuva](fase-10-visual/ajustes-local/chuva-1440.png) |
| Previsão | [Dashboard](fase-10-visual/ajustes-local/previsao-1440.png), [Monitoramento](fase-10-visual/ajustes-local/monitoramento-previsao-1440.png) |
| Contexto territorial | [Desktop](fase-10-visual/ajustes-local/territorio-1440.png), [320](fase-10-visual/ajustes-local/territorio-320.png) |
| Rios e série | [Rios](fase-10-visual/ajustes-local/monitoramento-rios-1440.png), [DC01 expandido](fase-10-visual/ajustes-local/rio-serie-1440.png) |
| Mapa / histórico / vias | [1440](fase-10-visual/ajustes-local/mapa-1440.png), [390](fase-10-visual/ajustes-local/mapa-390.png), [320](fase-10-visual/ajustes-local/mapa-320.png) |
| Base do mapa | [Desktop](fase-10-visual/ajustes-local/base-1440.png), [320](fase-10-visual/ajustes-local/base-320.png) |
| Plano e espaçamentos | [1440](fase-10-visual/ajustes-local/plano-de-acao-1440.png), [320](fase-10-visual/ajustes-local/plano-de-acao-320.png) |

Capturas locais utilizam o snapshot anterior à publicação para conferir apresentação; a confirmação de atualização real é feita separadamente no HML. Os recortes foram inspecionados, além das assertivas automatizadas. A captura de página restaura o scroll ao topo e reenquadra o mapa depois de testar pan, evitando sobreposição artificial da barra sticky na evidência.

### CI, HML e reconhecimento do schedule

O [CI 37262180903](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37262180903) e o [deploy 37262201726](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37262201726) passaram. Etapas em [CI](fase-10-atualizacao/ci.json) e [deploy](fase-10-atualizacao/deploy.json). A coleta real gerou o snapshot `04:08:31.270Z`, persistido em `ebf163973c62dc1bbfda76bbe03c227e85795de6` e servido pelo Pages. [Hashes Git/Pages iguais](fase-10-atualizacao/git-pages.json), [comparação temporal](fase-10-atualizacao/comparacao-depois.json) e [timestamp do frontend](fase-10-atualizacao/frontend-depois.json) registrados.

[52 capturas remotas / 28 cenários](fase-10-visual/ajustes-hml/checks.json), incluindo [Dashboard](fase-10-visual/ajustes-hml/dashboard-1440.png), [Defesa Civil](fase-10-visual/ajustes-hml/defesa-civil-1440.png), [rio/série](fase-10-visual/ajustes-hml/rio-serie-1440.png), [Mapa 390](fase-10-visual/ajustes-hml/mapa-390.png), [Mapa 320](fase-10-visual/ajustes-hml/mapa-320.png) e [Plano](fase-10-visual/ajustes-hml/plano-de-acao-1440.png), aprovados. O [smoke geral com GIS](fase-10-atualizacao/browser-hml.json) e o [smoke dos nomes](fase-10-atualizacao/nomes-hml.json) passaram. Uma corrida do teste de fallback foi corrigida: clicar a base indisponível deve terminar na Simplificada, portanto o teste não exige que o rádio defeituoso continue marcado. Não houve mudança do fallback do produto.

[Supabase somente leitura](fase-10-atualizacao/supabase.json): revisão 10 inativa e Realtime `SUBSCRIBED`; nenhum acionamento/encerramento remoto. Nenhuma regressão encontrada nas verificações. O novo cron foi confirmado no arquivo remoto e o workflow continua ativo; [observação dos disparos](fase-10-atualizacao/schedule.json) registrada separadamente do ciclo manual.

Foi observada a [execução automática 37302698228](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37302698228), criada às `11:24:12Z` e concluída com sucesso às `11:25:24Z`, já com a revisão contendo o novo cron. O snapshot `11:24:31.852Z` foi persistido em `8807dba6b9dd3b7bf76820e2f05a649e5d0bab95`; [Git e Pages coincidem](fase-10-atualizacao/git-pages-schedule.json). [Etapas do ciclo](fase-10-atualizacao/schedule-jobs.json) registradas.

**O agendamento foi reconhecido, mas a frequência efetiva de 10 minutos não foi demonstrada.** Houve 7h15min56s entre o ciclo manual e esse automático, sem outro ciclo listado; a limitação de atraso do GitHub permanece material para o uso operacional. O relatório não declara a defasagem de horas definitivamente resolvida pela alteração de frequência. Detalhes e horários no [relatório de investigação](fase-10-investigacao-atualizacao.md).

A [releitura no navegador](fase-10-atualizacao/refresh-browser.json) foi confirmada com relógio controlado e respostas locais: duas consultas, rótulo alterado de 01:08 para 01:18, sem escrita remota. A [auditoria de escopo](fase-10-atualizacao/integridade.json) registra os arquivos protegidos intactos e as exceções autorizadas.

### Limitações e encerramento desta rodada

O agendador GitHub continua sem SLA. Nova condição de previsão não mapeada mantém texto e ícone neutro, sem previsão inferida. O estado ativo preto foi verificado por fixture no cliente; não foram enviados comandos de Impacto. As regras territoriais, 292/88, DC01–DC11, thresholds, Supabase/Edge/RPC/PIN/Realtime, GIS, fallback e regras do Plano foram preservadas. As únicas alterações operacionais são tolerância autorizada e cron; a releitura do snapshot corrige a atualização do cliente.

Rodada de ajustes concluída e disponível no mesmo HML para **nova validação visual do solicitante**. Todos os gates de implementação passaram e o disparo automático foi observado. Permanece a ressalva operacional de pontualidade descrita acima; não se afirma que o cron de 10 minutos garante disponibilidade de dados recentes. Nenhum GO-LIVE, ambiente PRD, Supabase novo, repositório novo ou V2 foi iniciado.
