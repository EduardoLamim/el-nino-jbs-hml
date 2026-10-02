# Fase 04 — território, exposição JBS e contexto territorial

Implementação V1 concluída em 01/10/2026, horário de Itajaí (artefatos com timestamps UTC de 02/10/2026). Escopo autorizado após aprovação da descoberta técnica e de sua classificação C. Sem frontend, mapa, mobilidade atual ou Fase 05.

## Decisão da base territorial

Fonte principal: [Hosted/bairros_Itajai/FeatureServer/0](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/bairros_Itajai/FeatureServer/0?f=pjson). Foram adotadas as **35 unidades publicadas**, incluindo bairros e localidades rurais. A coleção é completa em relação à consulta dessa fonte, não uma certificação de cobertura jurídica integral do município.

| Critério | Limites_Bairros | Hosted/bairros2025 | Hosted/bairros_Itajai — escolhida |
|---|---|---|---|
| Quantidade de feições | 35 | 34 | 35 |
| Agregados JBS com nome exato | 22/25 | 22/25 | 23/25 |
| Ausências/diferenças de nome | Praia Brava publicada como Praia Brava de Itajaí; Portal 2; Brilhante I | Imaruí ausente; Portal 2; Brilhante I | Portal 2; Brilhante I |
| OID / nome / outros identificadores | objectid / nome / numero | fid / nome | objectid / nome_1 / id, numero |
| CRS horizontal original | EPSG:31982 | EPSG:3857 | EPSG:31982 |
| Nomes nulos / duplicados | 0 / 0 | 0 / 0 | 0 / 0 |
| Geometrias inválidas / vazias / duplicadas | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| Descrição da camada | Vazia | Vazia; campo memorial parcial | Vazia; campos lei/acesso_a_lei não garantem comprovação jurídica |
| Cobertura diagnóstica do limite municipal | ≈95,84% | ≈95,85% | ≈95,84% |

Os nomes completos, campos, CRS, hashes e medidas de comparação estão em `fase-04-comparacao-bases.json`. As razões de cobertura foram calculadas pela união geométrica de cada fonte comparada ao `limite_municipal/FeatureServer/0`, em coordenadas geográficas. São diagnóstico de diferenças, não cálculo de hectares ou prova de limite legal. As bases de 35 feições apresentam aproximadamente 1,56% de sua união fora desse limite e sobreposição interna de aproximadamente 0,00169%. A origem das diferenças não foi presumida como água, costa, erro ou mudança legal. Não houve clipping, ajuste de vértices, reparação nem merge entre fontes.

A escolha se apoia em validade geométrica, maior correspondência exata com os agregados e presença de Imaruí, São Vicente e Murta. A base de 2025 não foi priorizada pelo ano; a camada original `Bairros/0`, com seis feições, não é utilizada. A cobertura residual é limitação para interpretação de fronteiras, não impede a V1 de publicar as unidades oficiais com proveniência, sem geocodificar residências ou afirmar atingimento. Uma futura exigência de cobertura municipal sem lacunas ou certificação jurídica requer esclarecimento do produtor antes de mudar a base.

## Artefatos e contratos

- `public/data/bairros.geojson`: FeatureCollection de 35 Polygon/MultiPolygon, somente geometria e propriedades territoriais. Preserva OID da fonte, nome bruto, nome de apresentação, ID próprio determinístico `itajai-<objectid>`, fonte e URL. Saída REST `outSR=4326`, coordenadas longitude/latitude WGS84, sem membro CRS legado nem dados JBS. Normalização restrita a Unicode NFC e espaços externos; nenhuma correspondência aproximada.
- `public/data/territorio.json`: contrato **versão 2**, substituindo o placeholder territorial da Fase 01. Contém proveniência, resumo JBS, 10 zonas administrativas, metodologia, 35 unidades em `bairros` e duas entradas em `localidades`.
- `src/domain/territory.ts`: contratos TypeScript/Zod estritos de território e GeoJSON; valida totais, duplicidades, fontes referenciadas, períodos históricos e integridade das referências de localidades. Campos desconhecidos são rejeitados. O Zod valida estrutura/intervalos/fechamento de anéis; a validade topológica OGC é verificada separadamente com Shapely.
- `src/domain/contracts.ts`: somente o bloco territorial antigo foi substituído por reexportação do contrato novo. `parseStatus`, esquemas hidrológicos, tipos de entrada e motor permanecem semanticamente inalterados. Contratos antigos que permitiam `estacoes_relacionadas` foram removidos.

Semântica formalizada no código e nos dados:

1. Condição atual ≠ vulnerabilidade territorial.
2. Vulnerabilidade histórica ≠ condição atual.
3. Cenário HAND ≠ previsão de inundação atual.
4. Colaboradores residentes em área com vulnerabilidade ≠ colaboradores afetados.

Nenhum contrato territorial possui estação, nível atual, score, probabilidade, alerta por bairro, colaboradores afetados ou regra de ativação de cenário. `status.json` permanece separado, sem incorporar território. Nenhum dado territorial altera `nivel_jbs` ou triggers.

## Agregados, localidades e zonas

Totais preservados: **380 colaboradores; 292 em Itajaí; 88 em outros municípios**. São 25 agregados autorizados, transcritos em `scripts/territory/config.ts`. Os 23 agregados com nome exato somam **290** nos polígonos; as duas localidades mantêm **2** separadamente. O total territorial de Itajaí continua 292. Zero em uma unidade não significa ausência de população: significa nenhum colaborador atribuído a esse nome nos agregados recebidos.

| Caso | Tratamento |
|---|---|
| Portal 2 — 1 colaborador | Entrada própria em `localidades`, `nome_exibicao=Portal 2`, `bairro_referencia=Espinheiros`, referência pelo ID existente e Zona 1. Fundamento: correspondência explicitamente fornecida pelo usuário. Espinheiros conserva seus 10 colaboradores; não vira 11. |
| Brilhante I — 1 colaborador | Entrada própria, Zona 10, `sem_correspondencia`, bairro de referência nulo. A base contém Brilhante, mas a equivalência não foi presumida. |
| Contexto das duas localidades | Histórico, vias históricas e HAND nulos: não avaliados sem geometria própria. Portal 2 não herda esses indicadores de Espinheiros. |
| Baia | Nome bruto preservado. Zona nula: não convertido automaticamente em “Bahia” da Zona 9. |
| Brilhante | Nome bruto preservado, zero JBS e zona nula; não convertido em Brilhante I. |
| Rio Novo - Colônia Japonesa | Sem correspondência exata com as localidades das zonas fornecidas; zona nula. |

As zonas 1–10 preservam integralmente as listas fornecidas do Plano V17. Associação por igualdade de nome; única equivalência explícita adicional: Portal 2 corresponde a Portal II para a Zona 1. Zonas são `administrativa_operacional`, não bacias, áreas inundáveis ou unidades de propagação de alerta. Localidades das listas de zonas não viram polígonos inventados nem novos agregados de colaboradores.

## Fontes utilizadas e metodologia

Além da base escolhida, foram usados:

- [Histórico oficial de inundações](https://arcgis.itajai.sc.gov.br/server/rest/services/historico_inundacoes/FeatureServer/layers?f=pjson), camadas 0–9.
- [Vias com histórico de alagamento](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/View__vias_alagamentos/FeatureServer/1?f=pjson), exclusivamente `trecho_alagado = '1'`.
- [Vias de cenários HAND](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_atingidas_nivel_inundacao_publica_view/FeatureServer/0?f=pjson), `nivel_cm >= 10 AND nivel_cm <= 400`, todo o catálogo estudado, sem escolher cenário atual.
- [Plano V17 — 22/12/2025](https://defesacivil.itajai.sc.gov.br/documentos/Plano-de-Contingencia-de-Inundacao-ALTERADO-EM-22-12-25.pdf), somente contexto administrativo das zonas.
- Agregados JBS validados pelo solicitante; sem acesso à planilha original.

Por unidade territorial, o gerador converte os anéis GeoJSON para a convenção Esri (exterior horário, buracos anti-horários) e consulta `geometryType=esriGeometryPolygon`, `inSR=4326`, `spatialRel=esriSpatialRelIntersects`, `returnCountOnly=true`. A orientação é ajustada sem alterar coordenadas ou topologia. Multipolígonos preservam seus componentes. Não se usam distância, raio, centroides, snapping ou fuzzy matching.

Intersects inclui contato de borda. Resultado positivo significa ao menos uma feição intersectada nas fontes e no momento da coleta; não significa bairro inteiro inundado ou extensão de impacto. Resultado negativo significa ausência de interseção no conjunto consultado, não garantia de segurança. Erro HTTP, erro ArcGIS, resposta truncada, contagem inválida ou falha de validação interrompem a geração; não são convertidos em `false`.

Foram executadas **423 consultas bem-sucedidas**: base GeoJSON, contagem de completude, catálogo histórico e 35 × 12 consultas espaciais. `fase-04-consultas.json` preserva URL, parâmetros sem repetir geometria, timestamp, SHA-256 da resposta e contagens técnicas, vinculados ao `bairro_id` e ao hash da geometria de consulta. A geometria pode ser reproduzida a partir do GeoJSON e de `anéisEsri`. O hash do GeoJSON vincula toda a auditoria ao artefato publicado.

Histórico: camadas 0/1/2/3 referenciam 1983/1984/2001/2008; camadas 4 e 5 são reunidas em uma referência **2011** (anual e setembro), sem presumir duas enchentes. Camadas 6–9 referenciam 2013-07, 2013-09, 2014-06 e 2015-10. As referências preservam nome/ID de cada camada intersectada. Não se produz contagem de eventos; `quantidade_feicoes_intersectadas` é estritamente técnica.

Vias históricas: o produto contém apenas `possui_registro`, natureza histórica, fonte e filtro. As contagens técnicas permanecem na auditoria; nunca são denominadas “quantidade de vias”.

HAND: produto contém `possui_intersecao`, natureza `susceptibilidade_modelada`, fonte, filtro e `ativacao=nenhuma`. Não usa `cota_via_publico`, `transb_m`, thresholds hidrológicos ou uma DC. A diferença semântica entre views documentada na descoberta permanece uma limitação; o indicador registra a interseção com a camada pública aprovada, não calibração hidrodinâmica.

**Fora da implementação:** ottobacias, `vias_geo_defesa_civil_2026_view`, leitura de mobilidade atual, raster/mancha final sem semântica consolidada, individualização de exposição e qualquer relação DC→bairro. Nenhuma nova evidência foi incorporada para contornar a classificação C.

## Resultado da coleta

| Contexto | Unidades com interseção | Unidades sem interseção | Localidades não avaliadas |
|---|---:|---:|---:|
| Histórico de inundação, ao menos uma camada | 35 | 0 | 2 |
| Trechos com `trecho_alagado = '1'` | 20 | 15 | 2 |
| Catálogo de cenários HAND 10–400 cm | 35 | 0 | 2 |

São Vicente, Cordeiros, Salseiros, Cidade Nova e Murta tiveram resultado positivo nos três contextos. Essas contagens medem presença de interseção territorial, não quantidade de enchentes, ruas únicas ou colaboradores afetados. Não se criou total de “afetados” nem estimativa equivalente.

## Reprodução e validação

```text
npm run territory:prepare
python -m pip install shapely==2.1.2
python scripts/territory/validate_geometry.py
npm run territory:generate
npm run typecheck
npm run lint
npm test
npm run build
```

`territory:prepare` somente grava `.codex_work/territory/bairros.geojson` (ignorado no repositório). `validate_geometry.py` emite o atestado `fase-04-validacao-geometrica.json` com SHA-256, quantidade e validade. Aceita diretório de dependências como argumento opcional; nesta execução Shapely foi instalado temporariamente, sem adicionar suas bibliotecas ao projeto. `territory:generate` refaz a consulta e exige o mesmo hash validado antes de cruzar/publicar. Mudança de geometria ou nome requer nova validação; alteração no número de unidades ou no catálogo exige revisão explícita. O gerador somente publica após todos os cruzamentos e contratos passarem.

O contrato GeoJSON rejeita coordenadas fora de longitude/latitude, anéis abertos e estrutura inadequada. Atestado OGC: 35 geometrias válidas, não vazias, área positiva, nomes/IDs/geometrias únicos. Não houve reparação de geometria.

Testes cobrem todos os agregados e total, Portal 2, Brilhante I, correspondências exatas, zonas contextuais, contrato e propriedades extras, campos individuais/proibidos, fontes ausentes, períodos duplicados, GeoJSON/atestado, orientação Esri com buracos e multipolígonos, auditoria das 12 consultas por unidade e separação de status/motor. A suíte completa mantém os testes hidrológicos existentes.

## Definition of Done e pendências

- [x] Fonte principal escolhida por comparação documentada; coleção integral de 35 unidades, com ressalva explícita de cobertura cartográfica.
- [x] GeoJSON público gerado e validado estrutural e geometricamente.
- [x] Território versão 2 gerado e validado por Zod.
- [x] Itajaí 292; total 380; outros municípios 88; todos os 25 agregados preservados.
- [x] Nenhum dado individual consultado, copiado ou publicado; planilha original não utilizada.
- [x] Nenhuma relação DC→bairro, risco atual por bairro ou propagação por zona/Otto.
- [x] Histórico, vias históricas e HAND explicitamente separados da condição atual.
- [x] Build, lint, typecheck e testes aprovados; resultado final registrado abaixo.
- [x] Motor hidrológico e `status.json` preservados por comparação SHA-256 antes/depois.

Pendências não preenchidas por inferência: equivalência Brilhante I/Brilhante; Baia/Bahia para zona; zona de Rio Novo - Colônia Japonesa; geometria própria de Portal 2; discrepâncias de cobertura entre bases e limite municipal. Nenhuma impede manter os agregados separados com referência/ausência explícita; permanecem para validação antes de qualquer associação adicional.

Não há impedimento técnico pendente para a V1 autorizada. Não se implementou a Fase 05.

### Resultado final das verificações

Em 01/10/2026, às 22:17–22:18 de Itajaí: **106 testes aprovados em seis arquivos**, incluindo nove testes territoriais; `npm run lint` aprovado; `npm run build` aprovado, incluindo `tsc --noEmit` (typecheck). A primeira tentativa da suíte no ambiente restrito falhou antes dos testes por `spawn EPERM` do esbuild; a execução autorizada com `node node_modules/vitest/vitest.mjs run` concluiu com sucesso. Nenhum teste foi dispensado por esse problema de ambiente.

Comparação SHA-256 final: `src/domain/hydrology.ts`, `src/domain/alert-engine.ts` e `public/data/status.json` idênticos ao início da implementação. Os testes hidrológicos existentes continuaram aprovados. A alteração de `contracts.ts` se restringiu à substituição do contrato territorial e à reexportação; o status não foi regenerado.

### Inventário da entrega

Criados:

- `public/data/bairros.geojson`.
- `src/domain/territory.ts`.
- `scripts/territory/config.ts`, `generate.ts`, `geometry.ts`, `validate_geometry.py`.
- `tests/territory.test.ts`.
- `docs/fase-04.md`, `fase-04-comparacao-bases.json`, `fase-04-validacao-geometrica.json`, `fase-04-consultas.json`.

Alterados:

- `public/data/territorio.json` — placeholder substituído pela base validada.
- `src/domain/contracts.ts` — substituição apenas do bloco territorial antigo.
- `tests/contracts.test.ts` — remoção das verificações do contrato territorial antigo que permitia relações com estações; testes novos cobrem o contrato restrito.
- `package.json` — comandos de preparação/geração territorial.
- `README.md` e `docs/fase-04-descoberta-tecnica.md` — referência à entrega e preservação dos limites aprovados.

Artefatos locais derivados: staging `.codex_work/territory/bairros.geojson` e saída de build `dist/`, ambos já ignorados no repositório. As dependências Python e downloads comparativos permaneceram em pasta temporária externa ao projeto. Nenhuma planilha original ou cadastro individual foi adicionado.
