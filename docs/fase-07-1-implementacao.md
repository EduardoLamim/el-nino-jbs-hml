# Fase 07.1 — evolução geoespacial do mapa

Concluída em 03/10/2026. Escopo restrito à Fase 07.1, conforme discovery aprovado e autorização expressa para uso dos basemaps municipais. Não houve implementação de fases seguintes, publicação em produção ou alteração de regras operacionais.

O mapa utiliza somente OpenLayers, com Aérea, Cartográfica e Simplificada. As geometrias históricas reais são locais e carregadas sob demanda. Cenários, HAND, seletor 10–400 cm e respectivos placeholders foram retirados da interface. Nenhuma associação hidrológica ou territorial nova foi inferida.

## Arquitetura e bases

OpenLayers 10.10.0 renderiza os 35 bairros aprovados, DC01–DC11 e exposição agregada. GeoJSON em EPSG:4326 é transformado para a visualização EPSG:3857. As vias têm origem EPSG:31982 e são solicitadas à fonte com `outSR=4326`. Nenhum vértice foi simplificado, dissolvido ou removido pela preparação local.

A infraestrutura cartográfica é importada somente na página Mapa. O adaptador `ol-mapbox-style` 13.5.1 é importado somente ao escolher Cartográfica. O Dashboard não solicita o motor cartográfico nem as geometrias históricas.

| Base | Implementação | Proveniência e limites |
| --- | --- | --- |
| Aérea | XYZ municipal `/tile/{z}/{y}/{x}`, EPSG:3857, níveis 10–20 | Prefeitura de Itajaí / Engemap, voo de dezembro de 2020. Cobertura parcial; imagem de referência, sem condição em tempo real. |
| Cartográfica | Estilo municipal versão 8, tiles PBF, sprites e OpenLayers | `Hosted/basemap_itajai_urb/VectorTileServer`; caminhos relativos resolvidos para o serviço municipal. |
| Simplificada | Fundo neutro, bairros, estações, exposição e camadas locais | Base inicial e fallback; não solicita provedor externo de tiles. |

Fonte Aérea: `https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/Ortoimagem_restitui%C3%A7%C3%A3o_2020/MapServer`.

Fonte Cartográfica: `https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/basemap_itajai_urb/VectorTileServer`.

A adaptação cartográfica mantém as regras, cores e geometrias do estilo municipal, normaliza a origem ArcGIS para tiles explícitos e resolve sprite/glyph URLs. OpenLayers usa fontes CSS no canvas; Tahoma Regular/Bold foi adaptada para Arial Regular/Bold local, sem serviço externo de fontes. O limite vetorial é 19 conforme metadados de níveis de detalhe do serviço. Ortofotos, tiles e basemap vetorial não foram copiados para o repositório.

A troca de base modifica apenas o grupo de fundo: preserva extensão, zoom, camadas, seleção, estações e alerta. Falha persistente significa ao menos três erros e 60% de erros na janela dos últimos oito resultados de tiles; também existe timeout inicial de 20 segundos sem sucesso. Erro isolado não provoca fallback. Erro de estilo, timeout ou falha persistente ativa Simplificada e informa a indisponibilidade. Não há ciclo automático de tentativas; nova seleção da base permite tentativa manual. Respostas tardias de uma base anterior são ignoradas.

## Coleta real e datasets

Comando disponível: `npm run map:collect`.

Implementação: `scripts/map/collect.ts`. Coleta real concluída em **2026-10-03T16:37:54.463Z**. Manifesto: [public/data/historico/manifesto.json](../public/data/historico/manifesto.json).

São consultados exclusivamente `historico_inundacoes/FeatureServer/0` a `/9` e `Hosted/View__vias_alagamentos/FeatureServer/1`. Nas vias, o filtro é exatamente `trecho_alagado = '1'`. O campo `data` não é usado. Feições não são agrupadas por nome nem deduplicadas; IDs repetidos invalidam a coleta.

O coletor valida HTTP, erro ArcGIS mesmo com HTTP 200, tipo geométrico, SR, paginação, ordenação, contagem inicial/final e tamanho de cada página. Coleções vazias ou inválidas não são publicadas. Há duas tentativas no máximo por consulta, com timeout de 30 segundos. Todas as fontes são validadas antes da publicação; arquivos identificados por SHA-256 e manifesto são escritos mediante arquivo temporário e renomeação. O manifesto é o ponto de publicação, mantendo a última versão válida em caso de erro. Arquivos idênticos são reaproveitados. Não foi criado agendamento de coleta.

| Dataset / referência | Layer | Feições | Vértices | Bytes |
| --- | ---: | ---: | ---: | ---: |
| 1983 | 0 | 1 | 1.106 | 45.304 |
| 1984 | 1 | 1 | 5.521 | 225.521 |
| 2001 | 2 | 1 | 820 | 33.708 |
| 2008 | 3 | 1 | 20.489 | 836.531 |
| 2011 — referência anual | 4 | 32 | 2.936 | 123.208 |
| 2011 — setembro | 5 | 5 | 13.578 | 558.053 |
| 2013 — julho | 6 | 48 | 424 | 22.237 |
| 2013 — setembro | 7 | 58 | 481 | 25.596 |
| 2014 — junho | 8 | 55 | 534 | 27.461 |
| 2015 — outubro | 9 | 155 | 1.014 | 57.311 |
| **Subtotal histórico** | **0–9** | **357** | **46.903** | **1.954.930** |
| Vias históricas | 1 | 555 | 1.543 | 132.226 |
| **Total de geometrias** | | **912** | **48.446** | **2.087.156** |

Manifesto: 6.823 bytes. Total dos arquivos: **2.093.979 bytes**, sem compressão HTTP. O tamanho das vias é menor que a estimativa do discovery porque apenas ID e nome são preservados como atributos; não houve redução geométrica. Os nomes completos dos 11 arquivos, hashes, fontes, filtros, SRs, referências e timestamps constam do manifesto.

## Interface, semântica e acessibilidade

Histórico e vias ficam desligados inicialmente. Histórico carrega uma referência por vez; selecionar outra não mantém a anterior durante o carregamento. Cache local em memória é limitado a duas referências por hook. Requisições obsoletas são abortadas e a integridade dos arquivos é conferida por tamanho, SHA-256, contagem, tipo e vértices. O navegador não consulta o FeatureServer para essas camadas.

Manchas usam violeta translúcido com contorno tracejado; vias usam azul tracejado. Exposição usa escala neutra. Cores operacionais continuam associadas somente ao estado hidrológico fornecido pelo motor. Ausência de estado não é convertida em Normalidade. Falhas opcionais não modificam o alerta ou o Plano de Ação.

Textos preservados/exibidos:

- “Áreas com registros históricos de inundação. Não representa a condição atual.”
- “Trechos/feições associados a registros históricos de inundação. Não representa a condição atual das vias.”
- “Informações territoriais representam exposição e vulnerabilidade histórica e não significam impacto real atual.”
- “88 colaboradores residem fora de Itajaí e não estão incluídos na análise territorial automática deste painel.”

As duas referências de 2011 não são somadas como eventos independentes. As 555 feições não são apresentadas como 555 ruas. Não há indicação de bloqueio atual derivada do histórico.

Rádios, checkboxes, seletores de bairro/localidade e estação, referência histórica, detalhes e botões de navegação estão disponíveis em HTML. O canvas recebe foco e permite deslocamento pelo teclado. Alvos principais têm altura mínima de 44 px; detalhes ficam abaixo do mapa em telas pequenas. Nenhuma interação depende de hover ou apenas da cor. São preservados 292 residentes em Itajaí (290 nos polígonos e 2 em localidades separadas), mais 88 fora de Itajaí. Portal 2 e Brilhante I não receberam geometrias estimadas; demais exceções territoriais permanecem como aprovadas. Nenhum dado individual foi acessado.

## Arquivos e dependências

Criados:

- `src/domain/map-layers.ts`: contratos e validação dos datasets.
- `src/services/history-data.ts`: carregamento e integridade local.
- `src/hooks/useHistoryLayer.ts`: lazy loading, cancelamento e cache limitado.
- `src/map/basemaps.ts`: fontes, adaptação de estilo e saúde da base.
- `src/map/engine.ts`: único motor cartográfico, camadas e navegação.
- `scripts/map/collect.ts`: coleta e publicação local.
- `public/data/historico/manifesto.json` e 11 arquivos GeoJSON identificados por hash.
- `tests/phase071-data.test.ts`, `tests/phase071-engine.test.ts`, `tests/phase071-ui.test.tsx`.
- `docs/fase-07-1-implementacao.md`, `docs/fase-07-1-browser.json`, `docs/fase-07-1-integridade.json`.

Alterados:

- `src/App.tsx`: importação sob demanda da página Mapa.
- `src/pages/TerritoryMap.tsx`: integração OpenLayers, bases, camadas e controles.
- `src/components/MapDetails.tsx`: remoção de cenários da interface.
- `src/styles.css`: estilos do mapa e responsividade.
- `tests/phase06.test.tsx`: espera assíncrona da página carregada sob demanda.
- `tests/phase07.test.tsx`: adaptação ao novo renderizador e à remoção autorizada dos cenários.
- `package.json`, `package-lock.json`: dependências `ol` e `ol-mapbox-style`, comando `map:collect`.

Removido: `src/utils/map-geometry.ts`, projeção do antigo renderizador SVG. Não há segundo motor de mapa ativo. Os documentos de discovery permanecem como registro da decisão; campos arquivados no contrato territorial não geram controles ou cenários na interface.

## Validações e regressão

Verificação final em 03/10/2026:

| Verificação | Resultado |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run --reporter=dot` | **223 testes passaram, 16 arquivos** |
| Suíte anterior | 193 casos mantidos; expectativas de UI ajustadas apenas à evolução autorizada |
| Testes novos | 30 casos de dados, engine e interface |
| `npm run lint` | Passou |
| `npm run typecheck` e `typecheck:edge`, executados pelo build | Passaram |
| `npm run build` | Passou, sem alerta de chunk acima de 500 kB |
| Navegador Edge 154.0.4258.53 | 7 verificações integradas passaram; nenhum erro JavaScript registrado |
| Mobile 390 px | Documento 390 px, mapa 362 px; sem overflow horizontal |
| Mobile 320 px | Documento 320 px, mapa 292 px; sem overflow horizontal |

Chunks JavaScript finais: principal 332,08 kB (gzip 97,72 kB); mapa 361,25 kB (gzip 106,24 kB); adaptador vetorial sob demanda 203,63 kB (gzip 58,21 kB). CSS do mapa: 5,35 kB; CSS principal: 13,16 kB. Não são todos solicitados no Dashboard.

Evidência do navegador: [fase-07-1-browser.json](fase-07-1-browser.json). Foram exercitados estilo/sprites/PBF reais, tiles aéreos reais, histórico 1983/2008, vias locais, ausência de consulta runtime ao FeatureServer, falha simultânea das bases, falha das duas camadas opcionais, preservação de DC e alerta, seletores, teclado e larguras móveis. Capturas de 320/390 px e das geometrias também foram inspecionadas visualmente.

Comparação com o snapshot anterior: **77 arquivos intactos, 6 alterados, 1 removido e 21 criados** dentro de `src`, `scripts`, `supabase`, `public` e `tests`. Inventário e hashes dos arquivos alterados: [fase-07-1-integridade.json](fase-07-1-integridade.json). Manifestos de dependências e documentos ficam fora desse snapshot.

Permanecem intactos os arquivos do motor, gatilhos, histerese, qualidade, Impacto JBS, Supabase, migração, Edge Function, PIN server-side, Realtime/reconciliação, Dashboard, Monitoramento, Plano de Ação, coletores Epagri/rios/chuvas/barragens e dados aprovados de exposição. `status.json`, `territorio.json` e `bairros.geojson` estão inalterados. As Fases 01–06 e a semântica funcional da Fase 07 foram preservadas; nenhuma regressão operacional foi encontrada na suíte executada. Não foi realizada nova validação remota de produção do Supabase nem escrita nesse serviço.

## Definition of Done

| # | Critério | Evidência / resultado |
| ---: | --- | --- |
| 1 | OpenLayers integrado | Concluído; único renderizador |
| 2 | Projeções corretas | Testes de transformação 4326 → 3857; vias preparadas em 4326 |
| 3 | Aérea funcional | Tiles municipais reais e renderização verificados |
| 4 | Cartográfica funcional | Estilo, sprites e PBF reais verificados |
| 5 | Simplificada funcional | Sem tiles, inclusive com GIS bloqueado |
| 6 | Troca de base preserva estado | Testes de view, camadas e seleção |
| 7 | 35 bairros preservados | Geometria original intacta; renderização e seletores testados |
| 8 | DC01–DC11 preservadas | Coordenadas e estado existentes; detalhes e thresholds testados |
| 9 | Agregados preservados | 292 + 88; localidades separadas |
| 10 | Histórico real funcional | 357 feições locais; validação de integridade e navegador |
| 11 | Referências identificáveis | Dez opções, uma referência ativa por vez |
| 12 | Vias históricas funcionais | 555 feições; filtro exato |
| 13 | Disclaimers corretos | Textos presentes e testados |
| 14 | Lazy loading local | Requests apenas ao ativar camada/referência |
| 15 | Fallback funcional | Erros persistentes, timeout e falhas opcionais testados |
| 16 | Cenários ausentes | Sem camada, placeholder ou opção desabilitada |
| 17 | Seletor 10–400 ausente | Verificação de interface |
| 18 | Sem relação DC → bairro | Seleções independentes; nenhuma inferência criada |
| 19 | Sem dados individuais | Somente base agregada existente |
| 20 | Mobile 390/320 utilizável | Navegação e seleção testadas; sem overflow |
| 21 | Acessibilidade preservada | HTML, teclado, rótulos, texto e padrões |
| 22 | Testes novos passam | 30 casos |
| 23 | Testes anteriores passam | 193 casos com ajustes autorizados de UI |
| 24 | Lint passa | Exit code 0 |
| 25 | Typecheck passa | Aplicação e Edge Function, exit code 0 |
| 26 | Build passa | Exit code 0 |
| 27 | Sem regressão operacional encontrada | Suíte completa e comparação de integridade |

## Pendências e limites

Não há pendência bloqueadora identificada para este Definition of Done. Aérea e Cartográfica dependem da disponibilidade municipal; cobertura aérea parcial e tiles isolados ausentes não indicam condição de risco. A data da ortoimagem é dezembro de 2020. As camadas históricas são um retrato da coleta, sem atualização periódica criada nesta fase. Simplificada dispensa GIS externo, mas a aplicação e seus arquivos locais ainda precisam estar disponíveis no servidor da aplicação.

Os testes móveis usam emulação de viewport/toque no navegador desktop; não equivalem a uma certificação em todos os aparelhos ou leitores de tela. Disponibilidade futura dos serviços externos não é garantida por esta validação. O resultado está implementado e validado no workspace; não houve deploy. Cenários foram removidos do produto atual e nenhuma Fase 07.2 foi criada.
