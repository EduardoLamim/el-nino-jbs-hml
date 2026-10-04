# Fase 10 — Refinamento visual, UX e fechamento da V1

Data: 04/10/2026. Ambiente: **HML**. Implementação: `e62a2a80f8336473a40a702cbf8d1120e87ea926`.

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
