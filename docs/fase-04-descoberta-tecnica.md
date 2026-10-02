# Fase 04 — descoberta técnica GIS

> **Implementação autorizada posteriormente:** a base territorial estática e a exposição agregada foram implementadas conforme [Fase 04 — implementação](fase-04.md). A classificação C e os limites desta descoberta permanecem válidos; nenhum vínculo hidrológico atual com bairros foi implementado. O restante deste documento conserva o registro da descoberta e de seu ponto de parada à época.

> **Atualização — segunda rodada, 01/10/2026:** a conclusão vigente está na seção 9, ao final deste documento. Classificação **C para transformar condição atual das DCs em bairros potencialmente atingíveis**. Foi demonstrada uma subcadeia independente de consulta de cenários HAND × vias × bairros; ela não comprova a ligação com telemetria. A seção 9 também substitui a referência documental antiga pelo Plano V17 efetivamente baixado e conferido. As seções anteriores conservam o registro da primeira rodada, inclusive suas limitações e hipóteses daquela ocasião.

**Status: descoberta concluída; implementação territorial aguardando validação.** Data: 01/10/2026. Este é o único artefato criado no projeto nesta etapa. `territorio.json`, `status.json`, contratos e motor da Fase 03 foram preservados; hashes SHA-256 dos cinco arquivos foram comparados antes/depois. Nenhum dado individual de colaborador foi consultado.

## 1. Resultado executivo e limites da evidência

As 11 consultas point-in-polygon reais retornaram **2 localizados, 0 ambíguos e 9 indefinidos**. DC02 está no polígono com nome bruto **Salseiros**; DC09, no polígono **Cordeiros**. As demais estações retornaram `features: []`. Não foi escolhido bairro para resultado vazio, nem usada outra camada ou aproximação para substituir esse resultado.

O nome oficial atual permite identificar o curso d'água das 11 estações. Uma consulta complementar ao serviço municipal de ottobacias retornou uma unidade para cada ponto e permitiu descobrir interseções geométricas dessas unidades com bairros. **Essas interseções não comprovam área contribuinte, área de influência, propagação de cheias ou população representada por uma DC.** Nenhuma relação hidrológica operacional foi validada nesta etapa.

Os históricos são vetoriais e aceitam cruzamento bairro × polígono. As vias são linhas consultáveis, com distinção entre cadastro total e trechos explicitamente marcados como alagados. `mancha_inundacao/MapServer/0` é **raster**, com leitura pontual via `identify`; não fornece o equivalente ao cruzamento vetorial de bairros com polígonos de inundação.

## 2. Método e consultas obrigatórias

Coordenadas e nomes obtidos novamente do JSON `data-page`, `props.estacoes`, na [página oficial de rios][S1], sem executar o coletor ou atualizar o status da Fase 03. O payload foi decodificado como JSON; não houve geocodificação por endereço. A tabela abaixo conserva os números consultados.

Consultas a [Bairros/FeatureServer/0][S2], concluídas entre **19:09:01.829 e 19:09:03.390 UTC**, equivalentes a **16:09:01–16:09:03 America/Sao_Paulo**. Todas tiveram resposta JSON sem erro ArcGIS ou indicação de truncamento. O endpoint de bairros anuncia EPSG:4674. O cadastro das estações fornece latitude/longitude, mas não declara um WKID no registro; **EPSG:4674 foi usado conforme solicitado**, sem inventar certificação do datum original ou precisão do posicionamento.

Parâmetros usados em todas as 11 requisições:

```text
GET https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query
f=json
where=1=1
geometry={"x":LONGITUDE,"y":LATITUDE,"spatialReference":{"wkid":4674}}
geometryType=esriGeometryPoint
inSR=4674
spatialRel=esriSpatialRelIntersects
outFields=nome
returnGeometry=false
```

Classificação pelo número de feições retornadas, sem eliminar duplicatas pelo nome: 1 = localizado; mais de 1 = ambíguo; 0 = indefinido. Falha de HTTP/ArcGIS não seria contada como zero polígonos. `Intersects` inclui contato com limite: em eventual resultado múltiplo, os nomes devem permanecer todos registrados, sem desempate manual. Não houve buffer, distância, raio, snapping ou deslocamento de coordenadas. Os parâmetros de consulta são compatíveis com a [documentação REST oficial da Esri][S12].

Zero polígonos significa exclusivamente ausência de interseção retornada nessa camada e nessas coordenadas. Não prova que a estação esteja fora do município, que não possua contexto territorial ou que não exista risco. Não foi atribuída uma causa geométrica específica aos nove resultados vazios.

## 3. Matriz de descoberta

Coordenadas: **longitude (x), latitude (y)**, graus decimais, consultadas em EPSG:4674. `[]` representa a lista bruta de nomes vazia, não um nome de bairro. Os cursos abaixo são extraídos da denominação oficial, sem inferência por proximidade.

Na coluna de possíveis relações, **O** significa apenas: o ponto intersecta uma ottobacia e essa geometria intersecta os bairros listados. São **candidatas para investigação**, não bairros físicos da estação nem relações hidrológicas aprovadas. `Portal`, `Limoeiro` e `Santa Regina (Volta de Cima)` são referências nominais da fonte atual e não substituem o point-in-polygon.

| DC | Curso | Coordenadas (x, y) | Bairro físico GIS — nome bruto | Resultado GIS | Possíveis relações territoriais encontradas | Evidência/fonte | Pendência |
|---|---|---|---|---|---|---|---|
| DC01 | Rio Itajaí-Açu | -48.6516, -26.90923 | Nenhum: `[]` | **Indefinido — 0 polígonos** | O `775432131` intersecta Dom Bosco e São Judas; nenhuma influência da DC comprovada | [S1][S1], [Q01][Q01], [S5][S5] | P1, P2; não atribuir bairro por localização aparente |
| DC02 | Rio Itajaí-Açu | -48.710217, -26.875683 | `["Salseiros"]` | **Localizado — 1 polígono** | Vínculo físico com Salseiros; O `775432153` também intersecta Salseiros | [S1][S1], [Q02][Q02], [S5][S5] | P2; bairro físico não define abrangência hidrológica |
| DC03 | Rio Itajaí-Mirim — canal retificado | -48.71922, -26.91182 | Nenhum: `[]` | **Indefinido — 0 polígonos** | O `77542123` intersecta Cordeiros; referência oficial: captação SEMASA | [S1][S1], [Q03][Q03], [S5][S5] | P1, P2; validar vínculo do canal retificado à rede, sem atribuir Cordeiros como bairro físico |
| DC04 | Rio Itajaí-Mirim — canal retificado e curso antigo | -48.68838, -26.8941 | Nenhum: `[]` | **Indefinido — 0 polígonos** | O `775432133` intersecta Cordeiros; o nome atual menciona os dois cursos | [S1][S1], [Q04][Q04], [S5][S5] | P1, P2; esclarecer abrangência hidráulica do ponto e dos dois cursos |
| DC05 | Rio Itajaí-Mirim — curso antigo | -48.74776, -26.93336 | Nenhum: `[]` | **Indefinido — 0 polígonos** | O `775423131` localizada, mas sem interseção com bairros dessa camada | [S1][S1], [Q05][Q05], [S5][S5] | P1, P2; nenhuma área de bairro candidata obtida no cruzamento complementar |
| DC06 | Rio Itajaí-Mirim — curso antigo | -48.68576, -26.92442 | Nenhum: `[]` | **Indefinido — 0 polígonos** | O `7754215` intersecta Cidade Nova e Dom Bosco; referência oficial: Itamirim Clube de Campo | [S1][S1], [Q06][Q06], [S5][S5] | P1, P2; não selecionar bairro por nome do estabelecimento |
| DC07 | Ribeirão da Murta | -48.735573, -26.892699 | Nenhum: `[]` | **Indefinido — 0 polígonos** | Referência nominal Portal; O `775432145` intersecta Salseiros | [S1][S1], [Q07][Q07], [S5][S5] | P1, P2, P3; Portal é referência nominal, Salseiros é interseção da bacia, não resultado físico da DC |
| DC08 | Ribeirão Canhanduba | -48.711948, -26.979694 | Nenhum: `[]` | **Indefinido — 0 polígonos** | Referência nominal Rua Benjamin Dagnoni; O `775422551` sem interseção com bairros dessa camada | [S1][S1], [Q08][Q08], [S5][S5] | P1, P2, P3; denominações antigas precisam ser reconciliadas com o ponto atual |
| DC09 | Ribeirão da Murta | -48.700308, -26.879777 | `["Cordeiros"]` | **Localizado — 1 polígono** | Vínculo físico com Cordeiros; O `775432143` intersecta Cordeiros e Salseiros; referência nominal Ponte da Rua Lidia Puel Peixer | [S1][S1], [Q09][Q09], [S5][S5] | P2, P3; não incorporar a atribuição antiga a Ariribá encontrada em indexação documental |
| DC10 | Rio Itajaí-Mirim | -48.861419, -27.03353 | Nenhum: `[]` | **Indefinido — 0 polígonos** | Nome atual menciona Bairro Limoeiro; O `775423773` sem interseção com bairros dessa camada | [S1][S1], [Q10][Q10], [S5][S5] | P1, P2, P3; registrar referência nominal Limoeiro separada do resultado GIS indefinido |
| DC11 | Rio Itajaí-Açú — grafia da fonte | -48.761549, -26.879641 | Nenhum: `[]` | **Indefinido — 0 polígonos** | Nome atual menciona Santa Regina (Volta de Cima); O `7754321773` sem interseção com bairros dessa camada | [S1][S1], [Q11][Q11], [S5][S5] | P1, P2, P3; referências nominais não estabelecem polígonos ou áreas de influência |

Pendências da matriz:

- **P1 — localização física:** obter validação cadastral/geodésica do ponto e da cobertura da camada Bairros. Manter indefinido enquanto não houver evidência; não substituir por bairro próximo ou por nome informal.
- **P2 — relação hidrológica:** obter vínculo oficial estação–trecho de drenagem, rede com conectividade/sentido de fluxo, área contribuinte e critérios hidráulicos/operacionais. Validar escala, versão, datum, precisão e limites das bacias; códigos ou interseções isolados não bastam.
- **P3 — reconciliação documental:** distinguir bairro cadastral, localidade e referência da estação; verificar eventuais mudanças de posição/código ao comparar documentos antigos com o cadastro atual.

## 4. Serviços requeridos: estrutura, campos e capacidades

### 4.1 Bairros/FeatureServer/0

[Metadados consultados][S2]: `Feature Layer`, `esriGeometryPolygon`, EPSG:4674, `maxRecordCount=2000`, OID `objectid`. Campos: `objectid` (OID); `id`, `leinumero`, `leidataano` (inteiros); `nome`, `descricao` (texto); `numero`, `cod_bairro`, `gisdb.itajai.bairro.area`, `Shape__Area`, `Shape__Length` (double).

Anuncia Query, Create, Update, Delete, Uploads, Editing e Extract; somente Query foi usado. Paginação, estatísticas, distinct, ordenação e transformação de datum são anunciadas. `relationships=[]`, descrição vazia, sem `timeInfo` observado. A existência de capacidades de edição no catálogo não foi testada nem interpretada como autorização.

### 4.2 historico_inundacoes/FeatureServer

[Serviço e suas dez layers][S3]: todas são `Feature Layer`, polígonos, EPSG:4326, OID `objectid`, `maxRecordCount=1000` por layer. Consulta deve ser dirigida a `/FeatureServer/{id}/query`, pois o serviço contém eventos distintos.

Campos comuns: `objectid` (OID), `Shape__Area` e `Shape__Length` (double). Campos adicionais e prova espacial:

| ID | Nome bruto da layer | Campos adicionais | Feições que intersectam Cordeiros | Feições que intersectam Salseiros |
|---|---|---|---:|---:|
| 0 | `gisdb.sde.defesa_civil_area_atingida_1983` | `gisdb.sde.defesa_civil_area_atingida_1983.area`, `hectares` — double | 1 | 1 |
| 1 | `gisdb.sde.defesa_civil_area_atingida_1984` | `sum_area`, `sum_hectar` — double | 1 | 1 |
| 2 | `gisdb.sde.defesa_civil_area_atingida_2001` | `sum_area`, `sum_hectar` — double | 1 | 1 |
| 3 | `gisdb.sde.defesa_civil_area_atingida_2008` | `text` — string | 1 | 1 |
| 4 | `gisdb.sde.defesa_civil_area_atingida_2011` | `areas` — double | 5 | 6 |
| 5 | `gisdb.sde.defesa_civil_cotas_2011_setembro` | `situa` — string | 3 | 2 |
| 6 | `gisdb.sde.defesa_civil_cotas_2013_julho` | `situa` — string | 15 | 0 |
| 7 | `gisdb.sde.defesa_civil_cotas_2013_setembro` | `situa` — string | 10 | 0 |
| 8 | `gisdb.sde.defesa_civil_cotas_2014_junho` | `situa` — string | 9 | 0 |
| 9 | `gisdb.sde.defesa_civil_cotas_2015_outubro` | `situa` — string | 47 | 2 |

Esses números são contagens de feições intersectadas, **não contagens de eventos, hectares ou porcentagens do bairro**. As camadas 4 e 5 têm referências ao mesmo ano, por exemplo, e não devem virar dois eventos automaticamente. Não há campo de estação DC, relação cadastrada ou `timeInfo` nas layers. Ano/mês foram lidos dos nomes; não foi inventado dia do evento. `text` e `situa` não têm domínio declarado e precisam de dicionário/validação antes de classificação semântica.

Capacidades anunciadas: Query, Create, Update, Delete, Uploads, Editing, Extract; suporte a paginação, estatísticas, distinct, ordenação, geometrias e transformação de datum. Formatos das layers: JSON, geoJSON, PBF. `relationships=[]` e descrições vazias. As dez consultas espaciais foram efetivamente testadas em cada um dos dois bairros.

### 4.3 Hosted/View__vias_alagamentos/FeatureServer/1

[Layer `Sistema_viario_alagamentos`][S4], `esriGeometryPolyline`, EPSG:31982, OID `fid`, `maxRecordCount=1000`, capacidade **Query**. Suporta paginação, estatísticas, distinct, ordenação e transformação de datum; `relationships=[]`; sem `timeInfo` observado.

Inventário dos campos:

| Tipo | Campos |
|---|---|
| OID | `fid` |
| Integer | `join_count`, `target_fid` |
| Double | `largura`, `passeioe`, `passeiod`, `largura_1`, `passeioe_1`, `passeiod_1`, `SHAPE__Length` |
| String | `cod`, `codsecao`, `hierarquia`, `zonadm`, `nome`, `leidata`, `cod_1`, `codsecao_1`, `hierarqu_1`, `zonadm_1`, `nome_1`, `leidata_1`, `trecho_alagado`, `trecho_alagado_11` |
| Date | `data` |

Os dois campos `trecho_alagado` e `trecho_alagado_11` têm domínio textual `"1" → "Sim"`. Não foi encontrada documentação que explique a relação temporal entre eles. O renderer utiliza `trecho_alagado`. Não se interpretou o sufixo `_11` como mês, ano ou evento.

| Bairro usado na prova | Todas as linhas intersectadas (`where=1=1`) | Linhas intersectadas com `trecho_alagado='1'` |
|---|---:|---:|
| Cordeiros — objectid 26 | 822 | 158 |
| Salseiros — objectid 19 | 107 | 13 |

Logo, não é correto rotular todas as 822/107 linhas como alagadas. São feições/trechos, não ruas únicas nem ocorrências atuais. A amostra de cinco registros consultada mostrou `data=null` em todos eles, com valores mistos de `trecho_alagado`; isso não autoriza generalizar a ausência de datas para toda a camada. A amostra foi deliberadamente limitada a cinco e retornou `exceededTransferLimit=true`; as contagens acima vieram de consultas `returnCountOnly=true`, não dessa amostra. Duplicatas/sufixos de campos e nulos devem ser preservados até esclarecer a semântica.

### 4.4 mancha_inundacao/MapServer

[Serviço][S6] com uma layer: **0 — `07_manchas_0-4m_filtrada.tif`**, tipo `Raster Layer`, EPSG:31982. `geometryType=null`, `fields=null`, `relationships=[]`. Descrição e autoria vazias; palavra-chave de documento `Hand`, insuficiente para confirmar método, datum vertical, calibração ou significado operacional.

O serviço anuncia `Query,Map,Data`, layers dinâmicas e exportação de imagem em PNG/JPG/TIFF e outros formatos. A layer anuncia `Query,Map`, mas não possui feições vetoriais/campos e declara `supportsStatistics=false`, `supportsAdvancedQueries=false`, `supportsPagination=false`.

Provas realizadas:

- `/0/query?f=json&where=1%3D1&returnCountOnly=true`: erro ArcGIS **400**, `Invalid or missing input parameters.` A presença de “Query” no metadado não comprova uma consulta vetorial de polígonos. Este teste não é prova de que toda forma possível de query seja inexistente; não foi obtido contrato vetorial utilizável.
- `/legend?f=json`: layer raster, legenda `4 - 0`, heading `Value`.
- `/identify` na coordenada de DC02, `sr=4674`, `layers=all:0`, **`tolerance=0`**, `mapExtent=-48.87,-27.10,-48.62,-26.83`, `imageDisplay=1000,1000,96`, `returnGeometry=false`: retornou atributo **`Stretch.Pixel Value = "0.000000"`**. Consulta pontual de pixel, sem raio de associação territorial. Não foi interpretado como ausência de risco, profundidade de água ou cota de uma estação.

O [contrato oficial do Identify][S13] dá suporte a leitura de resultados no mapa. `identify` não entrega a estatística zonal por bairro nem o recorte analítico do raster. Exportar uma imagem de mapa também não equivale, por si só, a obter uma grade científica com resolução, unidades e NoData documentados.

## 5. Consultas espaciais possíveis e o que ainda exigem

| Cruzamento | Caminho técnico | Situação nesta descoberta | Limite da interpretação |
|---|---|---|---|
| DC × bairro físico | `Bairros/0/query`, Point, EPSG:4674, Intersects, `outFields=nome`, sem geometria | **Executado nas 11 DCs** | Não usar proximidade para preencher zero/múltiplos |
| Bairro × histórico | Buscar geometria completa do bairro; enviá-la como Polygon a cada layer histórica, `inSR=4674`, Intersects | **Executado nos 10 layers para Cordeiros e Salseiros** | Contato espacial não mede área nem vínculo hidrológico atual |
| Bairro × vias | Mesmo polígono em `/FeatureServer/1/query`; atributos selecionados ou count; filtro de alagamento explícito | **Executado com e sem filtro em dois bairros** | Trechos retornados não estão necessariamente integralmente dentro do bairro; não representam evento atual sem evidência temporal |
| Bairro × raster da mancha | Renderização sobreposta; `identify` pontual; análise zonal somente com raster analítico/serviço apropriado e metadados | `identify` e legenda **testados**; exportação **anunciada**, não usada como análise | Não há polygon-to-polygon equivalente demonstrado nessa camada |
| DC × ottobacia; ottobacia × bairros | Interseção exata de ponto com bacia; buscar a geometria da bacia e consultar Bairros | **Executado para as 11 DCs** | Unidade interceptada não é automaticamente toda a área contribuinte do posto |
| Percentual de bairro atingido / extensão viária afetada | Obter geometrias completas, reprojetar para CRS adequado em metros, recortar/intersectar e medir; tratar sobreposição e contato sem área | **Tecnicamente viável com os vetores; não implementado/calculado** | `returnGeometry=false`, contagem e soma de área original das feições não fornecem a métrica recortada |

Modelo da consulta de histórico/vias efetivamente executada via POST de formulário, somente leitura:

```text
POST /server/rest/services/historico_inundacoes/FeatureServer/{id}/query
f=json
where=1=1
geometry={"rings":[...],"spatialReference":{"wkid":4674}}
geometryType=esriGeometryPolygon
inSR=4674
spatialRel=esriSpatialRelIntersects
returnCountOnly=true
returnGeometry=false
```

As geometrias dos bairros da prova vieram de `Bairros/0/query`, `where=nome IN ('Salseiros','Cordeiros')`, `outFields=objectid,nome`, `returnGeometry=true`, `outSR=4674`; foram obtidos exatamente os OIDs 19 e 26. Os serviços históricos e de vias aceitaram o polígono em EPSG:4674 apesar de armazenarem dados em 4326 e 31982, respectivamente. Em uma futura implementação, o SR de entrada e saída deve continuar explícito; validar transformação de datum e precisão para resultados de borda.

Para recuperar feições em vez de contagens, observar `maxRecordCount`, `exceededTransferLimit` e paginação, ordenando pelo OID; IDs podem ser obtidos separadamente para buscar lotes. `Intersects` retorna geometrias originais, não recortadas. Não existe join espacial entre esses serviços inferido de `relationships`, pois as listas consultadas estão vazias. Qualquer cálculo de área/extensão fica pendente de validação e implementação futura.

## 6. Evidências sobre cursos e relações territoriais

### 6.1 Cadastro atual de estações

O registro de estação traz `codigo`, `nome`, `municipio_id`, latitude/longitude, fonte e atributos de telemetria. Não traz código de bacia, ID de trecho de rede, direção montante/jusante, bairro cadastral ou polígono de influência. A seção `historico_monitoramento` é telemetria, não uma relação territorial. A identificação nominal de curso é suficiente para documentar **qual curso a fonte diz monitorar**, mas não para delimitar bairros abrangidos.

DC03 está nominalmente no canal retificado; DC04 menciona canal retificado e curso antigo; DC05/DC06 mencionam curso antigo. Não foram agregados todos os pontos do Itajaí-Mirim a uma única abrangência territorial. DC07/DC09 compartilham a denominação Ribeirão da Murta, mas não foi estabelecida automaticamente uma relação de montante/jusante.

### 6.2 Bacias ottocodificadas

O serviço público adicional [Hosted/Bacias_Ottocodificada/FeatureServer/0][S5] foi encontrado no catálogo municipal, não adotado como substituto de Bairros. Geometria Polygon, WKID 102100, `latestWkid=3857`. Campos incluem `cobacia`, `cocursodag`, `cotrecho`, `dtversao`, `gridid`, `hydroid`, `id`, `nuareacont`, `nunivotto`, `nunivotto1` a `nunivotto6`, `nuordemcda`, `objectid`, `objectid1`, `shape_le_1`, `shape_leng`, `SHAPE__Length`, `SHAPE__Area`. `relationships=[]`, descrição vazia.

Cada consulta pontual retornou exatamente uma feição, sem truncamento. Os bairros da última coluna foram obtidos com Intersects sobre a geometria dessa feição, sem seleção manual:

| DC | `objectid1` | `cobacia` | `cocursodag` | `cotrecho` | `dtversao` | Nomes brutos dos bairros que intersectam a ottobacia |
|---|---:|---|---|---:|---|---|
| DC01 | 855 | 775432131 | 775432 | 4651 | 19/04/2012 | Dom Bosco; São Judas |
| DC02 | 883 | 775432153 | 775432 | 4378 | 19/04/2012 | Salseiros |
| DC03 | 61 | 77542123 | 7754212 | 6098 | 24/04/2012 | Cordeiros |
| DC04 | 847 | 775432133 | 775432 | 3052 | 19/04/2012 | Cordeiros |
| DC05 | 86 | 775423131 | 77542 | 6293 | 24/04/2012 | `[]` |
| DC06 | 70 | 7754215 | 77542 | 8215 | 24/04/2012 | Cidade Nova; Dom Bosco |
| DC07 | 860 | 775432145 | 77543214 | 3051 | 19/04/2012 | Salseiros |
| DC08 | 348 | 775422551 | 775422 | 6035 | 24/04/2012 | `[]` |
| DC09 | 845 | 775432143 | 77543214 | 3050 | 19/04/2012 | Cordeiros; Salseiros |
| DC10 | 615 | 775423773 | 77542 | 5973 | 24/04/2012 | `[]` |
| DC11 | 881 | 7754321773 | 775432 | 3182 | 19/04/2012 | `[]` |

`nuareacont=0` em todas as 11 feições; não foi utilizado como área contribuinte. Há `hydroid=-281` repetido em vários registros: não é uma chave única de DC. Coincidência de `cocursodag` ou prefixo de `cobacia` não foi promovida a vínculo operacional. Faltam dicionário, validação da rede, atualização e ligação explícita dos postos aos trechos.

### 6.3 Outras camadas oficiais inspecionadas

| Serviço/layer | Estrutura e elementos encontrados | Utilidade e insuficiência |
|---|---|---|
| [Hidrografia_Trecho_Drenagem/MapServer/0][S7] | Polyline, EPSG:31982; `nome`, `geometriaa`, `tipotrecho`, `navegavel`, `larguramed`, `regime`, `encoberto`, `objectid`, geometria/comprimento | Cursos desenhados e nomeados; sem código DC, nós de montante/jusante ou relationship publicado |
| [Hidrografia_Massa_Dagua/FeatureServer/0][S8] | Polygon, EPSG:31982; `nome`, `tipo_massa_dagua`, `regime`, `dominialidade`, `artificial`, OID e áreas/comprimentos | Contexto de massa d'água; sem associação a estações |
| [Hosted/APP_hidrografia_integrada_SDS/FeatureServer/0][S9] | Polygon, WKID 102100; `id_trecho_`, `nome`, `nome1`, `nota`, OID e medidas | As **11** consultas exatas retornaram o mesmo `objectid=47`, `id_trecho_=0`, nomes/notas null. Não discrimina o curso de cada DC |
| [Hosted/Drenagem_Integrada_/FeatureServer/0][S10] | Polyline, WKID 102100; `nome`, `nomeabrev`, `eixoprinci`, `geometriaa`, `regime`, largura/profundidade/velocidade e outros campos | Geometria de drenagem; sem vínculo explícito DC ou topologia dirigida publicada |
| [Hosted/Trecho_de_drenagem_(INDE_2012)/FeatureServer/0][S11] | Polyline; `id_trecho_`, `nome`, `nomeabrev`, `eixoprinci`, `fonte`, `regime`, `navegabili` e atributos físicos | Possível caminho de investigação; equivalência entre `id_trecho_` e `cotrecho` das ottobacias **não comprovada** |
| [Hosted/HIDROGRAFIA_1/FeatureServer/0][S14] | Polygon; campos `cod_imovel`, `cod_tema`, `des_condic`, `ind_status`, `nom_tema` e medidas | Não contém chave de estação/rede. Somente metadados inspecionados, sem consulta de registros de imóveis |
| [Hosted/vias_atingidas_nivel_inundacao_publica_view/FeatureServer/0][S15] | Polyline; `id_trecho`, `id_via_ori`, `transb_m`, `nivel_cm`, `faixa_10cm`, `situacao`, `classe_sen`, `cota_via_publico`, `publico` e cadastro viário | Possível informação por nível/cota, mas sem campo DC nem referência vertical/metodológica na descrição. Não comparar seus números aos limites de telemetria |
| [Hosted/vias_geo_defesa_civil_2026_view/FeatureServer/0][S16] | Polyline; `vias_sensiveis`, `vias_alagadas_inundadas`, `data_edicao` e cadastro viário | Candidato contextual mais recente; não define área de influência de estação |
| [Hosted/mancha_inundacao_final/FeatureServer/0][S17] | Polygon; `bairro`, `cod_bairro`, `descricao_`, `diferença`, áreas, nomes/IDs e medidas | Potencial alternativa vetorial a investigar; não foi provada equivalência com o raster solicitado e não foi usada como substituta |

Todas as camadas dessa tabela apresentaram `relationships=[]` e descrição vazia na inspeção. Isso não prova inexistência de documentação externa, apenas que esses vínculos não foram publicados nos metadados consultados. Não foram consultados registros de imóveis ou dados individuais.

### 6.4 Documentação textual e acesso

A [listagem pública oficial de monitoramento][S18] corrobora as denominações atuais. Notícias de inundações ou obras não foram utilizadas para converter bairros atingidos historicamente em abrangência atual de uma estação.

A busca localizou indexação de um [plano de contingência antigo][S19] com diferenças relevantes: DC08 aparece associada à referência Rio do Meio/Fazenda da Lagoa e DC09 a Ariribá, enquanto o cadastro atual consultado identifica DC08 na Rua Benjamin Dagnoni e DC09 no Ribeirão da Murta. **A leitura direta do endereço supostamente PDF retornou HTML da aplicação, não PDF**, e o [endereço alternativo de download][S20] também foi apresentado como HTML pelo navegador de pesquisa. Assim, o trecho indexado foi registrado apenas como alerta de possível documento desatualizado; não é evidência validada para alterar cursos, coordenadas, bairros ou limites. A versão/documento vigente precisa ser obtida antes de reconciliação.

A pasta [defesacivil no ArcGIS][S21] respondeu erro **499 — Token Required**. Não houve tentativa de contornar o acesso. O conteúdo protegido não pôde ser avaliado, e não se afirma que ali inexistam relações complementares.

## 7. Conclusão para validação

**Sem evidência suficiente para atribuir bairro físico pelo método obrigatório:** DC01, DC03, DC04, DC05, DC06, DC07, DC08, DC10 e DC11. Seus resultados devem permanecer indefinidos. DC02/Salseiros e DC09/Cordeiros têm evidência espacial positiva, limitada ao bairro físico nessa camada.

**Sem evidência suficiente para aprovar abrangência territorial/hidrológica operacional: todas as DC01–DC11.** Há curso nominal oficial para todas e unidades de ottobacia/interseções candidatas, mas falta a cadeia validada estação → trecho/rede → área contribuinte/influência → bairros. Mesmo as duas localizações físicas positivas não suprem essa falta.

**Casos com lacuna adicional:** DC05, DC08, DC10 e DC11 não retornaram bairro nem na interseção complementar de suas ottobacias. DC10/Limoeiro e DC11/Santa Regina–Volta de Cima continuam apenas referências nominais; não foram descartadas, mas tampouco promovidas a resultado GIS. DC08/DC09 exigem atenção à divergência de documentos antigos.

Validação necessária antes de implementar: aceitar ou revisar o tratamento de 0/1/>1; decidir quais camadas complementares serão oficialmente adotadas; obter o dicionário/versão de hidrografia e áreas de influência; esclarecer os campos de vias e o modelo raster. Nenhuma dessas pendências foi resolvida por aproximação geográfica ou por histórico de inundação.

**Trabalho encerrado na descoberta técnica. Nenhuma implementação do `territorio.json` definitivo, integração GIS operacional, alteração do motor, uso de dados individuais ou avanço de fase foi realizado. Aguardando validação.**

## 8. Fontes oficiais e reprodução

Os links Q01–Q11 abaixo reproduzem exatamente as consultas obrigatórias, incluindo coordenadas e parâmetros. Os dados podem mudar após o horário do levantamento; a matriz registra as respostas desta execução. Evidências brutas e comandos intermediários ficaram apenas na pasta temporária da sessão, sem novos arquivos operacionais no projeto.

## 9. Segunda rodada — condição hidrológica, cenários e território

### 9.1 Conclusão e classificação

**C — não viável com os dados públicos examinados para converter nível atual de DC em bairros potencialmente atingíveis.** A ausência de uma transferência documentada entre leitura da estação e cenário territorial impede também a afirmação mais moderada de potencial atingimento diante da condição atualmente observada. Isso se aplica a **DC01, DC02, DC03, DC04, DC05, DC06, DC07, DC08, DC09, DC10 e DC11**.

Há uma descoberta positiva além da vulnerabilidade histórica: aplicações municipais documentam cenários de suscetibilidade HAND, e consultas reais selecionam vias desses cenários e bairros que as intersectam. Essa **subcadeia cenário hipotético → vias → bairro é tecnicamente executável**. Não foi classificada como B para a cadeia solicitada porque nenhum rio, DC ou condição observada teve o elo inicial comprovado. A disponibilidade de um cenário selecionável não demonstra qual cenário corresponde ao nível atual.

Vocabulário adotado: **fato documentado** é conteúdo explicitamente publicado; **resultado geométrico** é resposta de operação espacial; **candidato** precisa de confirmação semântica/metodológica; **relação validada** limita-se ao vínculo efetivamente demonstrado; **não comprovada** não significa inexistente, mas insuficientemente sustentada nas fontes acessíveis consultadas.

### 9.2 Vias por nível: semântica, estrutura e evidência

Inspecionados [serviço público][R1], [camada pública][S15], item do Portal `6986e7e35651447aa1a7ab9eee316487`, seus dados/popups, domínio, renderer e relacionamento público `Service2Service` reverso. O serviço contém somente a camada 0 (`vias_atingidas_nivel`), sem tabelas; a camada tem `relationships: []`, descrição vazia e não expõe `definitionExpression`, `viewDefinitionQuery` ou `adminLayerInfo` nessas respostas. O relacionamento reverso retornou zero itens; isso não prova ausência de origem interna. O pedido de metadata XML desse item retornou HTTP 400.

Geometria: linha, EPSG:31982; OID **fid**, limite de resposta de feições 1.000, capacidade `Query`. Estatísticas, agrupamento, ordenação, paginação e filtros espaciais são anunciados. Consultas agregadas e espaciais foram executadas com sucesso. `id_trecho` e `id_via_ori` são Double; representam identificadores cadastrais candidatos, sem chave documentada para DC ou rede Otto. Não há campo DC nem relação de curso d'água declarada.

Foram lidas configurações públicas de aplicações e seus blocos HTML/JavaScript incorporados, sem executar código baixado. Três aplicações consomem **outra view**, [vias_atingidas_nivel_inundacao_view/0][R2]: [Vias potencialmente sensíveis à inundação][R3], [Cenários de Impacto por Inundação][R4] e [Cenários de Impacto por Inundação / Educação e Saúde][R5]. Não foi encontrado consumidor direto da view `publica` entre as aplicações examinadas. Portanto, a documentação delas é evidência explícita para a outra view e **corroboração**, não certificação integral de equivalência, para a pública. Os atributos comuns dos `fid=1,2,3` coincidiram; essa amostra não prova equivalência completa de geometrias, filtros ou atualizações.

Na aplicação R3, `widgets.widget_1.config.embedCode` explica que HAND usa a diferença altimétrica do terreno em relação à drenagem hidrologicamente conectada. A classificação das vias usa intervalos de 10 cm. O controle representa cenários de suscetibilidade, sem representar avanço temporal de inundação ou previsão operacional. O código usa `nivel_cm = level` no modo exato e `nivel_cm <= level` no acumulado. Popups rotulam `nivel_cm` como nível do cenário em centímetros e `transb_m` como nível em metros. Nenhuma conversão de uma DC é apresentada nesse mecanismo.

| Campo | Evidência encontrada e interpretação permitida | O que permanece sem comprovação |
|---|---|---|
| `nivel_cm` | Inteiro. Na aplicação R3 é nível do cenário em cm. Na view pública, 40 grupos de 10 a 400, passo 10; relação numérica com `transb_m` confirmada em todos os registros consultáveis. | Não é leitura de DC, profundidade local de água ou altitude absoluta demonstrada. A transferência da semântica entre views ainda requer confirmação do produtor. |
| `transb_m` | Double. Popup da outra view indica nível em m. Na pública, 0,1 a 4,0 e `nivel_cm = transb_m * 100`, sem divergências ou nulos. É coerente com o parâmetro de cenário HAND. | O nome não comprova altura de transbordamento de um rio. Não foram publicados datum vertical, zero de régua, equação de conversão ou calibração por estação. |
| `faixa_10cm` | String. Grupos vão de `0.00 a 0.10 m` até `3.90 a 4.00 m`; correspondem aos limites do cenário. | Não há regra explícita de inclusão das bordas nem demonstração de profundidade na via. |
| `cota_via_publico` | Double sem descrição explicativa. Valores observados 10–400, sem nulos; **326 registros diferem de `nivel_cm`**. | Unidade física e motivo das alterações não documentados. Não substituir `nivel_cm`, converter para metros ou usar como cota absoluta sem esclarecimento. |
| `situacao` | Todos os **139.515 registros** retornam o texto `Atingida`. Contexto de cenário potencial. | Esse texto não demonstra inundação atual, vistoria ou ocorrência datada. Não há data de evento no mecanismo examinado. |
| `classe_sen` | Distribuição observada: Muito alta 10–50 cm; Alta 60–100; Moderada 110–200; Baixa 210–300; Muito baixa 310–400. R3 documenta maior sensibilidade relativa nos cenários menores. | Não equivale a probabilidade, risco individual ou classe do motor hidrológico. |
| `publico` | Domínio `1=sim`, `2=nao`; 28.220 registros com `2`, 111.295 nulos e nenhum `1`. | O nome da view não garante filtro `publico=1`. Não deduzir restrição de acesso ou aprovação operacional a partir desse campo. |

O renderer da view pública possui quebras até 110, embora os registros cheguem a 400. **Legenda não delimita cobertura dos dados.** EPSG:31982 é referência horizontal; `falseZ`/tolerâncias de armazenamento não estabelecem datum vertical. A referência conceitual HAND é relativa à drenagem conectada; não foi encontrado o conjunto de metadados do terreno, tratamento hidráulico, referência vertical absoluta e calibração necessários à conexão com telemetria.

As consultas `nivel_cm <= L` são possíveis e reproduzem o filtro acumulado encontrado na aplicação da outra view. Nesta descoberta, L é sempre **hipotético**, independente dos thresholds das DCs. Registros são fragmentos de vias: somar contagens entre cenários ou bairros não produz quantidade de ruas únicas, extensão inundada ou pessoas atingidas.

### 9.3 Aplicações adicionais e manchas

O [dashboard Simulação inundação][R6] e a aplicação `292926f9e0194262ac17ef3424a3e62f` usam o [WebMap Inundações cotas][R7]. Ele referencia `Hosted/Inundação_cotas/FeatureServer`, cujas camadas 0–3 se chamam `3`, `2`, `1`, `4`. Seus campos são `fid`, `dn`, `SHAPE__Length`, `SHAPE__Area`; sem descrição ou domínio que permita converter `dn` em nível de DC. Os nomes numéricos não bastam para atribuir metros, profundidade ou frequência. A existência desse dashboard não resolve o elo atual → cenário.

A [aplicação Inundação em Tempo Real][R8] consulta `Hosted/vias_geo_defesa_civil_2026_view/0` e filtra `vias_alagadas_inundadas` pelos valores `1`, `sim`, `Sim`, `SIM`, repetindo a leitura a cada 60 segundos. No mecanismo examinado, isso atualiza o cadastro publicado; não é transformação automática de DC em via. A aplicação `43d5cd9cac00458fb6f6f8583d089b1b` filtra `vias_sensiveis` de forma semelhante. Algumas aplicações também contêm pesquisa por distância e análise com proximidade de lotes: **esses mecanismos não foram utilizados nem aceitos como evidência desta descoberta**. Nenhum cadastro individual foi consultado.

| Produto | Estrutura e representação demonstradas | Nível, referência vertical e ligação atual |
|---|---|---|
| [mancha_inundacao/MapServer][S6] | Item `7fbdedd0f88a414bb97343ebf20f02ef` tem tag/snippet HAND; camada raster `07_manchas_0-4m_filtrada.tif`, EPSG:31982. Legenda exibe `4 - 0`; metadata XML tem identificação/extensão, sem linhagem suficiente. É um produto associado a HAND, candidato a cenário modelado. | Não há dicionário de pixel, máscara NoData, classes, datum vertical ou correspondência DC publicada nas fontes lidas. O valor pontual anteriormente obtido não foi interpretado. Nome do arquivo não prova profundidade, máximo histórico ou condição atual. |
| [Hosted/mancha_inundacao_final/0][S17] | Polígonos EPSG:3857, OID `objectid1`. Campos de bairro e agregações: `bairro`, `nome_1`, `cod_bairro`, `numero`, `descricao_`, `area_m2`, `area_em_km`, `soma_de_an`, `soma_de__1`, `diferença`, além de identificadores/geometria. Amostra inicial de 10 feições tem atributos de Brilhante II repetidos e diferentes pequenos polígonos. | Não há campo de cenário/nível, DC, data de inundação ou descrição metodológica suficiente. `diferença` não pode ser interpretada como altura. Não foi comprovado se é histórico, modelado ou máximo. Não é possível escolher cenário por nível observado. |
| Comparação entre os dois | Um é raster e outro conjunto vetorial com atributos territoriais. Nomes semelhantes não documentam derivação. | **Equivalência não comprovada**: não foi encontrada transformação raster→polígono, valor de corte, mesma versão ou regra de agregação. Não substituir um pelo outro. |

Na amostra vetorial, `area_m2` próximo de zero coexistiu com `SHAPE__Area` não zero e `area_em_km` repetido para o bairro. Esses atributos não foram usados para calcular área atingida; sua semântica precisa de esclarecimento. As duas amostras de feições (vias:12; mancha:10) indicaram `exceededTransferLimit=true` e foram tratadas somente como amostras, nunca como cobertura integral.

### 9.4 Otto e rede: contexto complementar, sem delimitação de atingimento

O [manual oficial ANA de construção da base hidrográfica ottocodificada][R9], páginas físicas 129–131 (impressas 121–123), define `cobacia` como código da ottobacia, `cocursodag` como código do curso, `cotrecho` como identificador de trecho e `nuordemcda` como ordem contada a partir da foz no mar. Essa documentação fornece o significado metodológico geral; **não certifica que a publicação municipal de 2012 mantenha toda a topologia e a versão descritas no manual**.

Os 11 pontos intersectaram uma unidade cada na primeira rodada. É defensável descrever o resultado como **“unidade hidrográfica ottocodificada que contém a coordenada publicada da estação, segundo esta camada municipal”**, evidência espacial complementar de contexto. “Bacia monitorada pela DC”, “área integral contribuinte ao sensor” e “área potencialmente atingida por esse nível” continuam não comprovadas. Atribuir função operacional exige confirmação do posicionamento, alcance da unidade e conexão correta com o trecho.

| DC | `cobacia` | `cocursodag` | `cotrecho` | `nuordemcda` | Bairros intersectados pela unidade na rodada 1; somente geometria |
|---|---|---|---:|---:|---|
| DC01 | 775432131 | 775432 | 4651 | 1 | Dom Bosco; São Judas |
| DC02 | 775432153 | 775432 | 4378 | 1 | Salseiros |
| DC03 | 77542123 | 7754212 | 6098 | 2 | Cordeiros |
| DC04 | 775432133 | 775432 | 3052 | 1 | Cordeiros |
| DC05 | 775423131 | 77542 | 6293 | 1 | Nenhum na camada Bairros consultada |
| DC06 | 7754215 | 77542 | 8215 | 1 | Cidade Nova; Dom Bosco |
| DC07 | 775432145 | 77543214 | 3051 | 2 | Salseiros |
| DC08 | 775422551 | 775422 | 6035 | 2 | Nenhum na camada Bairros consultada |
| DC09 | 775432143 | 77543214 | 3050 | 2 | Cordeiros; Salseiros |
| DC10 | 775423773 | 77542 | 5973 | 1 | Nenhum na camada Bairros consultada |
| DC11 | 7754321773 | 775432 | 3182 | 1 | Nenhum na camada Bairros consultada |

Não foi demonstrada associação dos códigos de curso aos nomes atuais das estações. A consulta candidata `id_trecho_ IN (4651,4378,6098,3052,6293,8215,3051,6035,3050,5973,3182)` em [Trecho_de_drenagem_(INDE_2012)/0][S11] retornou **zero feições**, sem truncamento. Portanto, não há join validado entre `cotrecho` e `id_trecho_` para os pontos. Não usar igualdade aparente de nomes de campo ou posição espacial próxima como substituto.

[Hidrografia_Trecho_Drenagem][S7] e [Drenagem_Integrada_][S10] expõem geometria/nome e propriedades físicas, mas não os campos explícitos de conectividade `nutrjus`, `nutrmon`, `nutrafl`, `dedirec` descritos no modelo ANA. Os esquemas consultados não permitiram reconstruir e validar direção de fluxo/topologia por chaves. Ordem de vértices de uma linha não foi tratada como direção hidrológica. O resultado genérico da APP SDS (mesma feição para os pontos, nomes nulos) tampouco resolve esse elo. `nuareacont=0` nas unidades e outros atributos genéricos recomendam confirmação da qualidade dos dados, sem reinterpretar zero como ausência de drenagem.

### 9.5 Plano V17: confirmação e correção da referência anterior

Foi baixado o [Plano V17 no endereço atual do site municipal][R10]. A capa informa versão 17 e atualização de 22/12/2025. O caminho antigo em `/wp-content/uploads/2025/12/` respondeu HTML; o novo endereço foi encontrado no JavaScript público do site, que aponta para `/documentos/Plano-de-Contingencia-de-Inundacao-ALTERADO-EM-22-12-25.pdf`. A Tabela 11, página 23, foi extraída e conferida visualmente após renderização.

Confirma DC07–Portal I, DC08–Rio do Meio, DC09–Bairro Murta, DC10–Limoeiro e DC11–Santa Regina (Volta de Cima), com os rios/ribeirões indicados pelo usuário. **A referência anterior que associava DC09 a Ariribá pertence a outro documento e não deve orientar este projeto.** A Tabela 11 estabelece subfases de alerta por nível de rio; não relaciona seus valores aos campos HAND investigados.

Há diferenças de representação que precisam permanecer explícitas: DC02 tem referência Praça da Murta no Plano, enquanto o ponto retorna Salseiros em `Bairros`; DC09 tem referência Bairro Murta no Plano, mas retorna Cordeiros na mesma camada. Isso não autoriza corrigir manualmente o resultado GIS. DC07 tem localização Portal I, sem bairro físico retornado nessa camada. As zonas operacionais incluem Cordeiros/Murta na Zona 2, São Vicente na Zona 3 e Cidade Nova na Zona 4, porém **não documentam que uma DC represente todos os seus componentes**. Localidade documental, bairro jurídico/cartográfico, curso e área de impacto são conceitos distintos.

### 9.6 Testes territoriais reais, inclusive São Vicente

Uma consulta integral `where=1=1&outFields=objectid,nome&returnGeometry=false` a `Bairros/0` retornou apenas **seis feições**: Cidade Nova, Cordeiros, Salseiros, São Judas, Dom Bosco e uma com nome nulo (OID37). Não retornou São Vicente ou Murta. Isso contextualiza os nove PIP indefinidos e a cobertura limitada dos cruzamentos Otto × bairros; **não altera os resultados obrigatórios daquela camada**.

Para os testes adicionais foram encontradas três fontes municipais distintas: [Limites_Bairros/0][R11], [Hosted/bairros2025/0][R12] e [Hosted/bairros_Itajai/0][R13]. São Vicente e Murta existem nas três. Foram consultados por nome, obtidas suas geometrias em EPSG:4674 e executado `esriSpatialRelIntersects` com as vias e a mancha final. Não houve raio, escolha de vizinho ou geocodificação. Esses limites adicionais são candidatos à futura base territorial; não substituem silenciosamente `Bairros` nem foram declarados juridicamente equivalentes.

| Bairro / fonte usada no teste | Identificador | Vias `nivel_cm <= 10` | Vias `<= 50` | Vias `<= 100` | Polígonos `mancha_inundacao_final` intersectados |
|---|---:|---:|---:|---:|---:|
| Cidade Nova — Bairros | objectid 13 | 12 | 51 | 146 | 1 |
| Cordeiros — Bairros | objectid 26 | 37 | 229 | 849 | 26 |
| Salseiros — Bairros | objectid 19 | 8 | 27 | 45 | 0 |
| São Vicente — Limites_Bairros | objectid 8 | 39 | 366 | 918 | 14 |
| Murta — Limites_Bairros | objectid 14 | 10 | 157 | 298 | 88 |
| São Vicente — bairros2025 | fid 20 | 39 | 366 | 918 | 14 |
| Murta — bairros2025 | fid 17 | 10 | 157 | 298 | 88 |
| São Vicente — bairros_Itajai | objectid 28 | 39 | 366 | 918 | 14 |
| Murta — bairros_Itajai | objectid 22 | 10 | 157 | 298 | 88 |

**Resultado geométrico validado:** existem fragmentos classificados nesses cenários que intersectam os cinco bairros nas bases especificadas. Para São Vicente, a evidência não depende exclusivamente de histórico: há 39/366/918 feições da camada de cenários nos três filtros. **Relação não comprovada:** nenhuma dessas contagens permite selecionar São Vicente ou outro bairro diante do nível atualmente observado de uma DC.

As três delimitações adicionais de São Vicente/Murta produziram contagens iguais, mas suas geometrias/áreas diferem: isso não prova equivalência das bases. `bairros2025.memorial` menciona Itajaí-Mirim e canal em São Vicente, Itajaí-Açu e Córrego Murta em Murta; o texto disponível é truncado em 254 caracteres. É evidência documental complementar de limites com cursos, sem mapeamento de cenário à DC. A ausência de interseção da mancha final em Salseiros não comprova ausência de suscetibilidade, como ilustra a própria presença de vias de cenário.

### 9.7 Matriz de evidências consolidada

| Fonte/camada | O que representa | Relação com nível/cota | Relação com DC | Relação territorial | Pode ser usada operacionalmente? | Limitações | Evidência/URL oficial |
|---|---|---|---|---|---|---|---|
| Telemetria DC01–DC11 | Pontos e leituras hidrológicas | Nível observado da estação | Direta por código | Coordenada/local de instalação | Sim, no escopo já validado da Fase 03 | Sem transformação pública para área | [Rios][S1] |
| Plano V17 | Localização e subfases de alerta | Limiares por estação | Explícita na Tabela 11 | Localidades e zonas operacionais | Referência documental; não distribuição automática de impacto | Zero da régua não relacionado a HAND; zona não é bacia | [Plano, p.23][R10] |
| Vias pública por nível | Fragmentos classificados em faixas | Valores 10–400 cm; coerentes com cenários da outra view | Ausente | Interseção com polígonos de bairro executada | Consulta exploratória de cenário; ativação por DC não autorizada pela evidência | Sem conversão vertical/DC; campo público sem semântica completa | [Camada][S15], [app correlata][R3] |
| Vias de cadastro atual | Flags de suscetibilidade/atingimento | Não demonstrada | Não demonstrada | Linhas e cadastro de ocorrência | Exibição fiel com proveniência/frescura a validar | Atualização a cada minuto não comprova atualização da informação em campo | [Camada][S16], [app][R8] |
| Raster mancha | Produto identificado como HAND | Nome e legenda sugerem faixa; sem dicionário de pixel | Ausente | Raster identificável espacialmente | Contexto após validar semântica; não regra atual | Sem datum, derivação e equivalência DC | [MapServer][S6] |
| Mancha final vetorial | Polígonos com atributos de bairro | Não documentada | Ausente | Cruzamento espacial possível | Apenas contexto com natureza ainda pendente | Origem histórica/modelada e equivalência raster não comprovadas | [Camada][S17] |
| Histórico de inundações | Eventos e cotas históricas catalogados | Específica de cada evento/camada | Sem transferência atual demonstrada | Polígonos cruzáveis | Histórico identificado por fonte/época | Não pode ativar cenário atual sozinho | [Layers][S3] |
| Bacias ottocodificadas | Unidades hidrográficas cartográficas | Não mapeia nível | Contenção geométrica de cada ponto | Contexto complementar | Sim como contexto explicitamente limitado, sujeito à validação futura | Sem área afetada e sem join/topologia validados | [Camada][S5], [ANA][R9] |
| Rede hidrográfica municipal/INDE | Traçados e atributos de drenagem | Sem cenário de inundação | Nenhum join testado bem-sucedido | Contexto de cursos | Não para propagação automática | Campos de conectividade/direção insuficientes nas camadas examinadas | [Trechos][S7], [Integrada][S10], [INDE][S11] |
| Bairros e limites alternativos | Delimitações cadastrais | Nenhuma | Somente PIP físico | Suporte ao cruzamento de cenário | Após escolha e validação da base territorial | Cobertura e versões distintas; primeira camada incompleta para os testes | [Bairros][S2], [Limites][R11], [2025][R12], [Itajaí][R13] |

Não há matriz válida de DC/condição → áreas resultantes. A matriz parcial abaixo registra precisamente o que existe; confiança significa completude técnica da evidência, nunca probabilidade de inundação.

| DC/condição | Curso d'água | Dado observado | Mecanismo territorial encontrado | Áreas resultantes | Tipo de evidência | Grau de confiança técnica | Limitações |
|---|---|---|---|---|---|---|---|
| DC01–DC11, qualquer leitura atual | Itajaí-Açu; Itajaí-Mirim/canais; Murta; Canhanduba, conforme cadastro e V17 | Telemetria por estação disponível; não convertida em cenário | PIP físico e contenção Otto; sem elo leitura→cenário | Nenhuma área de potencial impacto validada | Documental + geométrica, incompleta para impacto | Insuficiente para a cadeia operacional | Mesmo curso ou mesma unidade não basta; aplica-se individualmente às 11 DCs |
| Cenários hipotéticos 10/50/100 cm, sem DC | Curso específico não publicado na camada | Parâmetro de cenário escolhido para teste, não observação | Filtro de vias + interseção com bairro | Cinco bairros da tabela 9.6, com fragmentos e contagens | Consulta reproduzível; interpretação HAND corroborada pela aplicação da outra view | Alta para resposta geométrica; incompleta para equivalência de views; insuficiente para ligação à condição atual | Não representa bairro inteiro, profundidade ou probabilidade; limites/versionamento pendentes |

### 9.8 Auditoria e consultas reproduzíveis

Levantamento em 01/10/2026. REST municipal: `https://arcgis.itajai.sc.gov.br/server/rest/services/`. Portal oficial: `https://arcgis.itajai.sc.gov.br/portal/sharing/rest/`. Foram lidos `?f=pjson`, `/layers?f=pjson`, itens, `/data?f=json`, `/resources?f=json&num=100`, `/resources/config/config.json?f=json` e metadata XML quando disponível. A busca temática do Portal recuperou 200 resultados; buscas adicionais de WebMaps e aplicações tiveram resultados maiores que a página inspecionada. A investigação foi dirigida às fontes e aplicações relacionadas acima; **não é prova de inexistência em todo o catálogo**, em serviços restritos ou em documentação interna. A pasta `defesacivil` que pediu token não foi contornada.

Consultas de segunda rodada feitas por POST de leitura com formulário URL-encoded; os corpos abaixo permitem repetir sem depender de geometrias copiadas manualmente. Todas as respostas de estatísticas/contagens/join usadas nas tabelas foram JSON sem erro ArcGIS e sem truncamento. Arquivos temporários de evidência: `r2-tests.json` (21 consultas), `r2-alternatives.json` (27) e `r2-follow.json` (4); amostras de feições explicitamente parciais ficam separadas. Nenhum desses arquivos foi incluído no produto operacional.

```text
# V = Hosted/vias_atingidas_nivel_inundacao_publica_view/FeatureServer/0/query
f=json; where=1=1; returnGeometry=false
groupByFieldsForStatistics=nivel_cm,transb_m,faixa_10cm,classe_sen
outStatistics=[{"statisticType":"count","onStatisticField":"fid","outStatisticFieldName":"n"}]
# Repetir agrupamento para situacao, publico e cota_via_publico.
# Controle de consistência: V, f=json, returnCountOnly=true, separadamente:
where=nivel_cm <> transb_m*100                       # 0
where=nivel_cm <> cota_via_publico                   # 326
where=nivel_cm IS NULL OR transb_m IS NULL OR cota_via_publico IS NULL # 0

# Geometrias principais: Bairros/FeatureServer/0/query
f=json; where=nome IN ('São Vicente','Cordeiros','Salseiros','Cidade Nova','Murta')
outFields=objectid,nome; returnGeometry=true; outSR=4674
# Só 3 nomes encontrados. Controle integral: where=1=1; outFields=objectid,nome;
# returnGeometry=false. Retornou 6 feições.

# Alternativas: Limites_Bairros/FeatureServer/0/query e
# Hosted/bairros2025/FeatureServer/0/query
f=json; where=UPPER(nome) LIKE '%VICENTE%' OR UPPER(nome) LIKE '%MURTA%'
outFields=*; returnGeometry=true; outSR=4674
# Em Hosted/bairros_Itajai/FeatureServer/0/query substituir nome por nome_1.

# Para cada polígono retornado: V
f=json; where=nivel_cm <= 10          # repetir para 50 e 100
geometry=<geometry retornada acima, com spatialReference.wkid=4674>
geometryType=esriGeometryPolygon; inSR=4674
spatialRel=esriSpatialRelIntersects; returnCountOnly=true
# Repetir mesmo corpo espacial em Hosted/mancha_inundacao_final/FeatureServer/0/query
# com where=1=1. Contagem é de feições intersectadas, inclusive toque na borda.

# Join candidato: Hosted/Trecho_de_drenagem_(INDE_2012)/FeatureServer/0/query
f=json; where=id_trecho_ IN (4651,4378,6098,3052,6293,8215,3051,6035,3050,5973,3182)
outFields=fid,id_trecho_,nome,fonte; returnGeometry=false
# Resultado: []

# Otto: Hosted/Bacias_Ottocodificada/FeatureServer/0/query
f=json; where=objectid1 IN (855,883,61,847,86,70,860,348,845,615,881)
outFields=objectid1,cobacia,cocursodag,cotrecho,nuordemcda; returnGeometry=false

# Amostra comparativa na view sem "publica":
# Hosted/vias_atingidas_nivel_inundacao_view/FeatureServer/0/query
f=json; where=fid IN (1,2,3)
outFields=fid,id_trecho,transb_m,nivel_cm,faixa_10cm,situacao,classe_sen
returnGeometry=false
```

### 9.9 Relações validadas, candidatas e pendências para decisão

**Validadas no alcance indicado:** DC↔curso/localização documental no V17; PIP obrigatório na camada original; contenção espacial em unidade Otto; filtro por nível de cenário na aplicação examinada; interseções de vias de cenário com os cinco bairros nas fontes identificadas; igualdade numérica `nivel_cm=100*transb_m` na view pública. Nenhuma delas isoladamente é uma regra de impacto atual.

**Candidatas:** uso de HAND como cenário territorial potencial separado da telemetria; equivalência semântica entre as duas views; limites alternativos como base territorial; Otto como contexto hidrográfico complementar. A associação de limites de São Vicente/Murta a cursos no memorial é documental, sem associação automática às DCs desses cursos.

**Pendências materiais:** (1) referência vertical/zero das DCs e relação calibrada com cenário, incluindo limites de validade e efeitos de jusante/maré quando pertinentes; (2) metodologia e procedência do HAND e das vias, significado de `cota_via_publico`, critérios de `situacao`/`publico` e equivalência das views; (3) linhagem e dicionário do raster e da mancha vetorial, inclusive eventual equivalência; (4) base vigente e completa de bairros/localidades e suas divergências; (5) versão/topologia da rede e correspondência dos trechos Otto com estações; (6) confirmação institucional de quais cenários podem ser ativados por quais condições observadas. Não foi inventada uma transformação para suprir essas lacunas.

**Verificação do escopo:** somente este relatório foi alterado. Os SHA-256 de `hydrology.ts`, `alert-engine.ts`, `contracts.ts`, `status.json` e `territorio.json` permaneceram iguais ao registro inicial. Não se executaram alterações no motor, coletor, frontend ou regras territoriais. Não houve uso de dados individuais de colaboradores. Testes realizados foram consultas de descoberta, controles de completude e conferência documental; não foi necessária nova execução de testes de aplicação para uma alteração exclusivamente documental.

**Ponto de parada:** descoberta encerrada para validação do usuário. Nenhuma implementação territorial autorizada ou iniciada.

[R1]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_atingidas_nivel_inundacao_publica_view/FeatureServer?f=pjson
[R2]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_atingidas_nivel_inundacao_view/FeatureServer/0?f=pjson
[R3]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/0b7b849710b54e678637440696821823/resources/config/config.json?f=json
[R4]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/f9e115d6ee244febb447e9632a8eb6f3/resources/config/config.json?f=json
[R5]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/a63bb522df314a31a27eede98633e98b/resources/config/config.json?f=json
[R6]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/14bfc24f8e6c45f6ba5dc0defd7d1d85/data?f=json
[R7]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/2b3542be5e4348b996da6c598b890da9/data?f=json
[R8]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/f328f60c57a94e89938274e3174eb0d2/resources/config/config.json?f=json
[R9]: https://metadados.snirh.gov.br/files/e5fcac7d-926a-4bee-a6ca-e7aa120f49cd/MANUAL_DE_CONSTRUCAO_DA_BASE_v2_0.pdf
[R10]: https://defesacivil.itajai.sc.gov.br/documentos/Plano-de-Contingencia-de-Inundacao-ALTERADO-EM-22-12-25.pdf
[R11]: https://arcgis.itajai.sc.gov.br/server/rest/services/Limites_Bairros/FeatureServer/0?f=pjson
[R12]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/bairros2025/FeatureServer/0?f=pjson
[R13]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/bairros_Itajai/FeatureServer/0?f=pjson

[S1]: https://monitoramento.defesacivil.itajai.sc.gov.br/monitoramento/rios?municipio_id=1
[S2]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0?f=pjson
[S3]: https://arcgis.itajai.sc.gov.br/server/rest/services/historico_inundacoes/FeatureServer/layers?f=pjson
[S4]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/View__vias_alagamentos/FeatureServer/1?f=pjson
[S5]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/Bacias_Ottocodificada/FeatureServer/0?f=pjson
[S6]: https://arcgis.itajai.sc.gov.br/server/rest/services/mancha_inundacao/MapServer?f=pjson
[S7]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hidrografia_Trecho_Drenagem/MapServer/0?f=pjson
[S8]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hidrografia_Massa_Dagua/FeatureServer/0?f=pjson
[S9]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/APP_hidrografia_integrada_SDS/FeatureServer/0?f=pjson
[S10]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/Drenagem_Integrada_/FeatureServer/0?f=pjson
[S11]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/Trecho_de_drenagem_(INDE_2012)/FeatureServer/0?f=pjson
[S12]: https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/
[S13]: https://developers.arcgis.com/rest/services-reference/enterprise/identify-map-service/
[S14]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/HIDROGRAFIA_1/FeatureServer/0?f=pjson
[S15]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_atingidas_nivel_inundacao_publica_view/FeatureServer/0?f=pjson
[S16]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_geo_defesa_civil_2026_view/FeatureServer/0?f=pjson
[S17]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/mancha_inundacao_final/FeatureServer/0?f=pjson
[S18]: https://defesacivil.itajai.sc.gov.br/monitoramento/
[S19]: https://defesacivil.itajai.sc.gov.br/wp-content/uploads/2025/07/1%C2%B0-Versao-Plano-de-Contingencia-de-Inundacao-ALTERADO-18-01-24.pdf
[S20]: https://defesacivil.itajai.sc.gov.br/download.php?id=59
[S21]: https://arcgis.itajai.sc.gov.br/server/rest/services/defesacivil?f=pjson

[Q01]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.6516%2C%22y%22%3A-26.90923%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false
[Q02]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.710217%2C%22y%22%3A-26.875683%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false
[Q03]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.71922%2C%22y%22%3A-26.91182%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false
[Q04]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.68838%2C%22y%22%3A-26.8941%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false
[Q05]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.74776%2C%22y%22%3A-26.93336%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false
[Q06]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.68576%2C%22y%22%3A-26.92442%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false
[Q07]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.735573%2C%22y%22%3A-26.892699%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false
[Q08]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.711948%2C%22y%22%3A-26.979694%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false
[Q09]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.700308%2C%22y%22%3A-26.879777%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false
[Q10]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.861419%2C%22y%22%3A-27.03353%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false
[Q11]: https://arcgis.itajai.sc.gov.br/server/rest/services/Bairros/FeatureServer/0/query?f=json&where=1%3D1&geometry=%7B%22x%22%3A-48.761549%2C%22y%22%3A-26.879641%2C%22spatialReference%22%3A%7B%22wkid%22%3A4674%7D%7D&geometryType=esriGeometryPoint&inSR=4674&spatialRel=esriSpatialRelIntersects&outFields=nome&returnGeometry=false

