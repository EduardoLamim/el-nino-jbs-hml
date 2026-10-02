# Fase 04.1 — descoberta técnica de Mobilidade Atual

Data: **02/10/2026**. Escopo: consultas públicas, inspeção de configuração oficial e teste geométrico local. Nenhum coletor, contrato, integração ou regra operacional foi implementado. As Fases 03 e 04 permanecem preservadas.

## 1. Conclusão

**C — NÃO VIÁVEL COMO MOBILIDADE ATUAL, com a temporalidade pública demonstrada nesta investigação.**

Existe intenção operacional documentada: o resumo do item municipal descreve cadastro para informar risco de inundação e trechos atualmente alagados. A aplicação usa o campo `vias_alagadas_inundadas` para selecionar registros apresentados como ocorrências confirmadas. Entretanto, o texto da própria aplicação ressalva que o mapa não confirma alagamento naquele momento nem segurança para tráfego. Não foi encontrada vinculação confiável entre timestamp e início, confirmação, persistência ou encerramento do estado da via. O editor tracking está desativado; a aplicação não consulta datas para decidir atualidade.

Portanto, **há suporte para “registros sinalizados no cadastro público da Defesa Civil, consultados em determinado horário”**, mas não para converter essa publicação em confirmação operacional de via atualmente alagada. A classificação C decorre da insuficiência temporal, não da ausência de intenção operacional nem do resultado zero. B exigiria uma regra de manutenção/validade do estado suficientemente esclarecida para que a ressalva temporal não escondesse a principal incerteza do produto.

Resultado real: **7.208 feições; zero positivas em `vias_alagadas_inundadas`; zero positivas em `vias_sensiveis`**. Isso significa ausência de marcação positiva na camada nos instantes consultados, **não ausência de alagamentos em Itajaí**. Não há ocorrências positivas desta coleta para avaliar frescura individual ou listar como atuais.

Recomendação: não integrar ainda como “Mobilidade Atual”. Se houver autorização futura para uma exibição estritamente cadastral, rotular a marcação como publicação da fonte com frescura da ocorrência desconhecida, separar horário de consulta de data relacionada ao registro e nunca afirmar segurança da via. Para admitir uso operacional, esclarecer com o produtor o significado e o ciclo de atualização da flag, o vínculo de `data_edicao` com essa flag, a forma de retirar ocorrências encerradas e a expectativa oficial de manutenção. Nenhum prazo de staleness foi criado.

## 2. Fontes e alcance da inspeção

- [L — camada pública][L], [S — serviço][S], versão ArcGIS 10.91.
- [I — item de serviço][I], ID `9a3f169220ad48de9995ca61b42c32c5`, proprietário público `geoportal`, acesso `public`, tag `defesacivil`. Descrição nula; resumo menciona risco de inundação e trechos atualmente alagados.
- [ID — itemData e popup padrão][ID]. Metadata XML em `/info/metadata/metadata.xml`: tentativa retornou HTTP 400. Não foi contornada restrição nem consultado endpoint administrativo.
- [A — aplicação Inundação em Tempo Real][A], ID `f328f60c57a94e89938274e3174eb0d2`, proprietário `geoportal`, acesso público. [Configuração][AC] e [itemData][AD] lidos como dados; HTML/JavaScript incorporado inspecionado, sem execução de código baixado.
- [P — aplicação Projeção de Vias Inundáveis][P], ID `43d5cd9cac00458fb6f6f8583d089b1b`, [configuração][PC], consumindo a mesma camada com outro filtro.
- Bases locais aprovadas `public/data/bairros.geojson` e `public/data/territorio.json`, somente leitura.

No Portal oficial, busca de WebMaps da organização por `defesa OR inund* OR vias*` recuperou 32 itens, sem página restante. Todos os 32 itemData foram inspecionados; nenhum referenciou textualmente `vias_geo_defesa_civil_2026`. Busca temática de Web Experiences/Web Mapping Applications/Dashboards recuperou 19 itens, sem página restante; inspeção de itemData/configuração acessível encontrou os dois consumidores acima. Seus itemData e configurações referenciam a camada diretamente. Relacionamentos públicos `Map2Service` reverso e `Service2Service` reverso do item retornaram listas vazias.

Isso **não prova inexistência de outros consumidores**: as buscas são temáticas e a ausência de relacionamento cadastrado não impede referência por URL dentro de uma aplicação. Não foram lidos registros pessoais de outras camadas encontradas em mapas candidatos.

## 3. Estrutura completa da camada

Polyline, `hasZ=false`, `hasM=false`, campo geométrico `shape`, OID `fid`, campo de exibição `cod`. CRS original WKID102100/latestWKID3857; geometrias de teste solicitadas em EPSG:4326. Limite padrão de feições por resposta: 1.000. Consulta, estatísticas, agrupamento, ordenação, paginação, IDs, extent e predicados espaciais, incluindo `Intersects`, são anunciados. As consultas desta descoberta confirmaram contagem, agrupamento, ordenação e obtenção de geometria.

| Campo | Alias | Tipo / tamanho | Domínio | Significado comprovado ou limite |
|---|---|---|---|---|
| `fid` | fid | OID | Nenhum | Identificador da feição nesta publicação; não equivale a rua inteira. |
| `cod` | cod | String 254 | Nenhum | Código cadastral; repete entre feições da mesma via. |
| `codsecao` | codsecao | String 254 | Nenhum | Identificador textual de seção; amostra `463.271`. Sem declaração pública de unicidade global. |
| `hierarquia` | hierarquia | String 254 | Nenhum | Atributo cadastral sem dicionário adicional. |
| `largura` | largura | String 254 | Nenhum | Atributo nominal de largura; unidade não comprovada nesta inspeção. |
| `leidata` | leidata | String 254 | Nenhum | Não é campo Date nem timestamp comprovado de ocorrência. |
| `nome` | nome | String 254 | Nenhum | Nome da via, usado pela aplicação para agrupamento. |
| `nomeabrev` | nomeabrev | String 254 | Nenhum | Nome abreviado; não é chave única. |
| `passeiod` | passeiod | String 254 | Nenhum | Atributo cadastral de passeio, sem semântica temporal. |
| `passeioe` | passeioe | String 254 | Nenhum | Idem. |
| `zonadm` | zonadm | String 254 | Nenhum | Não documentado como bairro; cinco amostras contêm espaço em branco. Não usado como ligação territorial. |
| `objectid` | objectid | Integer | Nenhum | Identificador adicional; o OID da camada consultável é `fid`. |
| `st_length_` | st_length_ | Double | Nenhum | Comprimento usado pela aplicação, dividido por 1.000; não validado aqui como extensão de impacto. |
| `SHAPE__Length` | SHAPE__Length | Double, virtual | Nenhum | Campo de comprimento geométrico, alternativa usada pela aplicação. |
| `vias_sensiveis` | vias_sensiveis | String 256 | `"1"→sim`, `"2"→nao` | Marca seleção para o mapa de suscetibilidade/projeção. |
| `vias_alagadas_inundadas` | vias_alagadas_inundadas | String 256 | `"1"→sim`, `"2"→nao` | Marca seleção para o mapa de ocorrências; temporalidade não garantida. |
| `data_edicao` | data_edicao | Date; metadado length29 | Não exposto | Data relacionada ao cadastro; não documentada como horário de confirmação/ocorrência. |

`shape` é campo Geometry, alias Shape, descrito separadamente em `geometryField`. Os campos cadastrais e as flags aparecem como editáveis no esquema, enquanto o acesso público efetivo anuncia apenas `capabilities=Query`; isso **não autoriza nem demonstra edição anônima**.

Renderer da camada: símbolo simples de linha sólida, RGBA `[170,152,47,255]`, largura1, transparência0, sem labeling. O popup do item tem título `{cod}`, lista atributos com rótulos iguais aos nomes, formata `data_edicao` como `shortDateLongTime`, sem expressão Arcade (`expressionInfos=[]`). Essa configuração não explica a data e é distinta do popup desativado na aplicação.

`relationships=[]`; `editFieldsInfo` explicitamente nulo. `timeInfo`, `editingInfo`, `lastEditDate`, `ownershipBasedAccessControlForFeatures`, `definitionExpression` e `viewDefinitionQuery` não estão expostos nas respostas lidas. Não presumir que propriedades ausentes signifiquem filtro interno inexistente. Serviço/camada indicam `isView=true`, `isUpdatableView=true`; o serviço expõe `editorTrackingInfo.enableEditorTracking=false`, `enableOwnershipAccessControl=false`, `allowOthersToQuery=true`, `allowOthersToUpdate=true`, `allowOthersToDelete=false`. O proprietário do item não é evidência de quem confirmou cada ocorrência.

## 4. Flags e estado real

Consultas principais: **02/10/2026 11:46:16.922–11:46:18.054 UTC**, ou **08:46:16.922–08:46:18.054 em Itajaí**. Confirmação das contagens positivas: **11:49:41.391/11:49:41.536 UTC** (08:49:41 local).

| Campo | Valor bruto | Quantidade | Interpretação permitida |
|---|---|---:|---|
| vias_alagadas_inundadas | `"2"` | 339 | Código de domínio “nao”; sem garantia de via atualmente livre. |
| vias_alagadas_inundadas | `null` | 6.869 | Sem marcação preenchida; não converter para “não alagada”. |
| vias_sensiveis | `"2"` | 339 | Código de domínio “nao”; não é classificação de condição atual. |
| vias_sensiveis | `null` | 6.869 | Sem informação preenchida. |
| Cada campo | `"1"`, `"sim"`, `"Sim"`, `"SIM"` | 0 no conjunto positivo | Variantes explicitamente aceitas pelo filtro da respectiva aplicação, nenhuma observada na coleta. |

O agrupamento conjunto retornou apenas `(2,2)=339` e `(null,null)=6869`. A igualdade dos valores nesta fotografia **não comprova equivalência dos conceitos**. O domínio tem dois códigos String; o filtro da aplicação inclui também três grafias textuais de sim. O código trata essas quatro alternativas como seleção positiva; não foram encontrados nesta fotografia registros que permitam demonstrar diferenças práticas entre suas grafias.

**Semântica de alagamento:** há intenção documental de apresentar trechos alagados e registros confirmados pela Defesa Civil. Não se encontrou especificação pública que determine se uma flag positiva dura até encerramento manual, se expira, se descreve uma vistoria ou se pode persistir após uma ocorrência. Não está comprovado que seja apenas histórico ou suscetibilidade; tampouco está comprovado que uma marcação represente a condição física neste instante. “Flag manual temporária” permanece hipótese, não fato demonstrado pelo nome ou pelo campo editável.

**Semântica de sensibilidade:** a aplicação P apresenta projeção de inundação e descreve origem no modelo HAND/INPE, deixando explícito o caráter potencial. Seleciona `vias_sensiveis` pelas mesmas quatro alternativas textuais. Isso documenta a função de suscetibilidade desse campo na aplicação, sem expor aqui calibração, limiares ou derivação individual de cada registro. Não usar como sinal de alagamento atual, nem como fallback de `vias_alagadas_inundadas`.

## 5. Datas e frescura

`data_edicao` é o único campo Date do esquema. `dateFieldsTimeReference.timeZone=UTC`, `respectsDaylightSaving=false`, `datesInUnknownTimezone=false`. Epoch recebido foi convertido de milissegundos; nenhuma mudança de timezone foi usada para ocultar idade.

Para **positivos**, a consulta agrupada por data retornou zero linhas e a consulta de feições retornou `features=[]`, sem truncamento. Logo, data mais antiga/recente, quantidade por data e idade de positivos são **não aplicáveis**, e não “zero horas” ou “dados frescos”.

Para o **cadastro inteiro**, a distribuição foi:

| data_edicao UTC | Horário Itajaí | Registros | Idade na primeira consulta |
|---|---|---:|---:|
| 2026-09-30 17:24:21.141 | 30/09 14:24:21.141 | 25 | ≈42,37 h |
| 2026-09-30 17:29:13.698 | 30/09 14:29:13.698 | 40 | ≈42,28 h |
| 2026-09-30 17:57:08.401 | 30/09 14:57:08.401 | 34 | ≈41,82 h |
| 2026-09-30 18:40:13.337 | 30/09 15:40:13.337 | 7 | ≈41,10 h |
| `null` | — | 7.102 | Desconhecida |

Os 106 registros datados estão com flag `2`; outros 233 registros `2` têm data nula. Todos os 6.869 registros com flag nula também têm data nula. Não há datas futuras nessa distribuição. Idade de edição não equivale a idade da ocorrência; as 41–42 horas **não foram usadas como limiar de obsolescência**. Sem regra oficial de validade, não se pode declarar que são atuais nem que expiraram só por essa idade.

Item de serviço: criado 21/09/2026 11:26:32.223 UTC; modificado 21/09/2026 11:26:40.316 UTC. Item da aplicação: criado 30/09/2026 16:32:42.822 UTC; modificado 30/09/2026 18:39:33.505 UTC. Essas datas são do conteúdo/configuração do Portal, não de confirmação da ocorrência. O item do serviço foi modificado antes das datas existentes nos registros, exemplificando que esses relógios não são intercambiáveis.

**Conclusão temporal:** é possível informar quando a consulta ocorreu e, em 106 casos, qual data consta em `data_edicao`. Não é possível afirmar com a evidência disponível quando o estado de alagamento foi observado ou validado. Não foi encontrado SLA de confirmação em campo, frequência de manutenção das flags ou política de retirada. Editor tracking desativado e ausência de `editFieldsInfo` impedem presumir carimbo automático consistente.

## 6. O que a aplicação efetivamente faz

Na configuração AC, `widgets.widget_1.config.embedCode` contém a implementação consultada:

1. Cria `FeatureLayer` diretamente pela URL L, título **Inundação em Tempo Real**, `outFields=['*']`, `definitionExpression=PUBLIC_FILTER` e `popupEnabled=false`. Não depende de WebMap para essa camada.
2. Filtro: `(vias_alagadas_inundadas = '1' OR vias_alagadas_inundadas = 'sim' OR vias_alagadas_inundadas = 'Sim' OR vias_alagadas_inundadas = 'SIM')`. Não há condição por `data_edicao`.
3. Usa linhas azuis RGBA `[36,150,212,.96]`, largura3; legenda **Vias inundadas/alagadas**. Combina essa camada com `GraphicsLayer` de ponto consultado e basemap OSM, não com outra camada de ocorrências.
4. `update()` consulta IDs filtrados, busca atributos em lotes de 300 e rejeita `exceededTransferLimit`. Os atributos usados no resumo são `nome`, `st_length_` e `SHAPE__Length`. Agrupa por nome bruto, acumula quantidade interna de feições e soma comprimentos; esse agrupamento não certifica rua única.
5. Chama `layer.refresh()` e registra `lastRefresh=Date.now()`. A indicação de atualização usa `new Date().toLocaleTimeString(...)`, isto é, **relógio do navegador no processamento da consulta**, não data da ocorrência. Nenhuma leitura de `data_edicao` foi encontrada no HTML/JavaScript incorporado.
6. `REFRESH_MS=60000`, inicialização por `update()`, intervalo de verificação, atualização ao retornar à visibilidade quando o prazo passou e ao voltar à conexão. Acrescenta `_ts:Date.now()` às requisições para evitar cache. Isso não é SLA de campo; não foi encontrado `refreshInterval` que estabeleça validade das flags.
7. Pesquisa textual filtra a lista; seleção de uma via acrescenta condição por `nome` ao enquadramento. Há pesquisa de endereço/GPS e lógica de proximidade de 1 km, que **não foi executada nem utilizada nos testes territoriais**.
8. O tratamento de falha informa impossibilidade de atualizar e, quando já havia dados, possibilidade de desatualização. O caso vazio é apresentado como ausência de registros no mapa naquele momento. Não foi encontrada expiração automática por idade ou retirada de registros antigos: continuam selecionáveis enquanto atenderem à flag.

O texto informativo combina alegação de confirmação pela Defesa Civil com ressalva de não garantir estado físico atual ou segurança para tráfego. Essa tensão documental foi preservada na análise, sem escolher apenas o título como prova. A aplicação P, por sua vez, descreve explicitamente potencial modelado, usando `vias_sensiveis`. Polling de ambas não converte cadastro em observação contínua.

## 7. Unidade de contagem e teste espacial

Unidade recomendada: **registro/feição sinalizada**, podendo explicar que sua geometria representa segmento do cadastro viário. Evitar “N ruas”; “N trechos” só com ressalva de trechos cadastrais, sem afirmar N ocorrências independentes.

Evidência de fragmentação: agrupamento `nome,cod`, ordenado por contagem decrescente, retornou `Rod. BR-101`, código 1288, com **129 feições**; `Rod.Dep.Antônio Heil`, código 1235, com 126; `Av.Ver.Abrahão João Francisco`, código 265, com 109. Foi amostra dos dez maiores grupos (`exceededTransferLimit=true`), não contagem integral de ruas. Nomes/códigos repetidos impedem `1 feição=1 rua`. Não se validou estabilidade do `fid` entre republicações nem unicidade global de `codsecao`.

Como não havia positivos, foram usados **somente para teste geométrico** os cinco primeiros registros por `fid ASC`. Linhas obtidas com `outSR=4326`; `MultiLineString(paths)` comparado por Shapely 2.1.2 `intersects` com todos os 35 Polygon/MultiPolygon do arquivo aprovado. Cinco linhas válidas. Sem buffer, raio, snapping, centroides, escolha arbitrária ou modificação da base. Todas as interseções são preservadas em lista; nesta amostra cada linha intersectou uma unidade. Não houve caso multibairro observado, portanto não se afirma ter testado empiricamente uma ocorrência positiva multibairro.

**A tabela abaixo NÃO contém ocorrências atuais nem registros positivos.**

| Registro / codsecao | Nome bruto da via | Flag de alagamento | Data relacionada (UTC) | Unidade intersectada | JBS residentes na unidade | Observação |
|---|---|---|---|---|---:|---|
| fid1 / 463.271 | R. Carlos Alberto Mayer | `2` | 30/09/2026 17:29:13.698 | Barra do Rio — itajai-1 | 10 | Teste geométrico; residentes não são afetados. |
| fid2 / 1527.5968 | R. Benta Custodio Vieira | null | null | Paciência — itajai-33 | 1 | Teste geométrico; desconhecido não significa alagado/livre. Residentes não são afetados. |
| fid3 / 1927.7199 | R. Mauri Antonio Holtim | null | null | Paciência — itajai-33 | 1 | Mesmo agregado repetido para referência, não somar como pessoas distintas/afetadas. |
| fid4 / 268.1194 | R. Brusque | null | null | Dom Bosco — itajai-16 | 11 | Teste geométrico; residentes não são afetados. |
| fid5 / 1691.1196 | R. José Testoni | null | null | Dom Bosco — itajai-16 | 11 | Mesmo agregado; não somar nem inferir rotas. |

Capacidade demonstrada: **registro cadastral → geometria → unidade → agregado territorial**. Não demonstrado: temporalidade de registro positivo; funcionário usando a via; impedimento de acesso ao terminal; pessoa afetada. Portal 2 e Brilhante I não foram associados: não possuem polígonos próprios nessa base.

Uma futura apresentação poderia separar nome do bairro, agregado residente e quantidade de registros sinalizados na consulta, sempre com a incerteza temporal visível. A redação “trechos atualmente alagados” não é sustentada por este teste. São Vicente possui agregado de 67 na base aprovada; não existe nesta coleta evidência de três ocorrências positivas nesse bairro, e esse exemplo não foi fabricado.

## 8. Estados de consulta e qualidade — análise, sem contrato implementado

| Caso | Evidência necessária / possibilidade | Distinção obrigatória |
|---|---|---|
| A — sucesso e zero positivos | HTTP e JSON válidos, sem erro ArcGIS; contagem explícita zero e consulta completa. Observado nesta execução. | Zero marcações na camada; não cidade sem alagamentos. Temporalidade continua desconhecida. |
| B — fonte indisponível | Erro de rede, timeout, HTTP inválido, erro ArcGIS ou resposta inválida. | Não converter em zero; preservar indicação de falha e eventual último retrato, se futuramente autorizado. |
| C — disponível, potencialmente desatualizada | Publicação consultável, mas sem validade de campo demonstrada. | Possibilidade identificada; não inventar prazo nem marcar “atualizado” só por HTTP200. |
| D — positivos atuais | Exige confirmação de que a flag permanece válida e de sua atualização/expiração. | Não é reconhecível de forma confiável com a evidência desta descoberta. |
| E — positivos sem timestamp confiável | Flag positiva com data nula ou sem relação comprovada com o estado. | Distinguível como publicação positiva de frescura desconhecida, não ocorrência atual confirmada. Não observado hoje porque positivos=0. |

Dados incompletos/truncados não são resposta completa. Valores não reconhecidos e nulos devem permanecer explicitamente desconhecidos; o código `2` também não comprova segurança viária. Esses estados podem coexistir com uma consulta recente: disponibilidade da API e frescura do fato são eixos diferentes. A descoberta não implementa enum, prazo ou contrato operacional.

## 9. Matriz final de evidências

| Campo/fonte | Significado comprovado | Temporalidade | Uso na aplicação oficial | Pode entrar na V1? | Limitações | Evidência |
|---|---|---|---|---|---|---|
| vias_alagadas_inundadas | Flag de seleção para mapa de ocorrências confirmadas/publicadas; domínio sim/não | Estado observado em campo sem timestamp confiável demonstrado | Quatro alternativas positivas; demais fora do filtro | Não como condição atual; candidato cadastral sujeito a validação | Ciclo de confirmação/encerramento desconhecido; ressalva do próprio mapa | L, I, AC |
| vias_sensiveis | Seleção de vias de projeção/suscetibilidade associada a HAND na aplicação | Modelagem/cadastro, sem evento atual | Filtro na aplicação P | Somente contexto de suscetibilidade em eventual escopo autorizado | Não substituir flag de ocorrência nem derivar atualidade | L, PC |
| data_edicao | Campo Date UTC associado ao registro | 106 datas preenchidas; 7.102 nulas | Popup padrão pode formatar; app A não usa para frescura | Como data relacionada, se claramente rotulada; não como hora da ocorrência | Tracking desativado; vinculação à flag não comprovada | L, ID, consultas agrupadas |
| Item created/modified | Mudança de item/configuração no Portal | Datas administrativas | Não definem seleção de positivos | Apenas proveniência técnica | Não representam edição de cada ocorrência | I e item A |
| REFRESH_MS / horário exibido | Verificação da publicação a cada 60s e relógio local da consulta | Momento de leitura do cadastro | Atualiza lista e camada | Horário de consulta, em futura integração autorizada | Não SLA de campo nem expiração | AC |
| fid/cod/codsecao/nome | Identificação de feição e atributos cadastrais | Estabilidade entre republicações não comprovada | Agrupamento pelo nome e consulta por IDs | Tecnicamente úteis como identificação | Nome/código repetidos; usar registros, não ruas únicas | L e agrupamento nome,cod |
| Geometria + bairros.geojson | Interseção geométrica exata com base aprovada | Snapshot cartográfico | App A não usa essa base local; teste é desta descoberta | Capacidade técnica comprovada, sem implementação | Toque de borda conta; cobertura da Fase04 continua com suas limitações | Teste Shapely com 35 polígonos |
| Agregado JBS | Residentes associados à unidade territorial | Base estática aprovada | Não faz parte das apps municipais | Pode contextualizar futuramente, sem afetados | Sem rota, residência individual ou acesso ao terminal inferidos | territorio.json preservado |

## 10. Consultas reproduzíveis e auditoria

Endpoint Q: `https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_geo_defesa_civil_2026_view/FeatureServer/0/query`. Requisições POST de leitura, formulário URL-encoded, `f=json`. Metadados, itemData e configurações via GET. Não se exigiu autenticação.

```text
# Total
where=1=1
returnCountOnly=true
# Resposta: 7208

# Distintos e contagens; executar para cada campo e para ambos juntos
where=1=1
groupByFieldsForStatistics=vias_alagadas_inundadas
outStatistics=[{"statisticType":"count","onStatisticField":"fid","outStatisticFieldName":"n"}]
returnGeometry=false
# Repetir groupBy para vias_sensiveis e vias_alagadas_inundadas,vias_sensiveis.

# Positivos de cada campo
where=vias_alagadas_inundadas IN ('1','sim','Sim','SIM')
returnCountOnly=true
# Repetir para vias_sensiveis. Ambos: 0.

# Distribuição temporal dos positivos
where=vias_alagadas_inundadas IN ('1','sim','Sim','SIM')
groupByFieldsForStatistics=data_edicao
outStatistics=[{"statisticType":"count","onStatisticField":"fid","outStatisticFieldName":"n"}]
returnGeometry=false
# Repetir where=1=1 para cadastro total; depois agrupar data_edicao,vias_alagadas_inundadas.

# Feições positivas: nenhuma
where=vias_alagadas_inundadas IN ('1','sim','Sim','SIM')
outFields=*
returnGeometry=true
outSR=4326
resultRecordCount=1000

# Amostra geométrica, explicitamente sem significado de condição atual
where=1=1
outFields=fid,nome,nomeabrev,cod,codsecao,zonadm,vias_alagadas_inundadas,vias_sensiveis,data_edicao
orderByFields=fid ASC
returnGeometry=true
outSR=4326
resultRecordCount=5

# Fragmentação cadastral: dez maiores grupos, amostra
where=1=1
groupByFieldsForStatistics=nome,cod
outStatistics=[{"statisticType":"count","onStatisticField":"fid","outStatisticFieldName":"n"}]
orderByFields=n DESC
resultRecordCount=10
returnGeometry=false
```

As distribuições completas e a consulta de positivos retornaram `exceededTransferLimit=false`; as amostras de cinco feições e dez grupos retornaram `true`, como esperado e explicitamente tratado como amostragem. Nenhuma delas foi usada para estimar total de ruas ou cobertura de ocorrência. Somas dos grupos de cada flag e das datas conferem 7.208.

Busca no Portal `/portal/sharing/rest/search`, `f=json`, `num=100`:

```text
q=orgid:0123456789ABCDEF AND type:"Web Map" AND (defesa OR inund* OR vias*)
q=orgid:0123456789ABCDEF AND (inund* OR vias*) AND (type:"Web Experience" OR type:"Web Mapping Application" OR type:"Dashboard")
```

Os resultados brutos, os scripts descartáveis de consulta e as configurações ficaram somente em `%TEMP%/jbs-f041`, fora do produto/repositório. Não constituem coletor operacional. Para auditoria futura, respostas podem mudar; este relatório registra a fotografia desta execução. Impressões SHA-256 dos arquivos temporários principais:

| Evidência | SHA-256 |
|---|---|
| layer.json | E992EDD7C649ADD2DBA14FC08A321237E707A1F0351B359795D410D7556D564F |
| service.json | 7B62A5F27155CF388B105C7F9560114988E9D423F7792EFD1EE5A84FE4D7D47D |
| app.json — configuração A | 946F955599EA318F41A70CC273E9949C4ED9142E406061AEA0E1103B994A0CC5 |
| queries.json — parâmetros, horários e respostas principais | 23D1B18165BF732F00601CBCEACD4F9771275BBF5B5512B74EDACDB7A82AEA09 |
| confirmation.json — confirmação positiva e datas/flags | D14CF8360253E692B4A054466D67448B5DBA57AAC0FF2FC6DB4C74C02E5748D9 |

## 11. Preservação e ponto de parada

Único arquivo criado no projeto: `docs/fase-04-1-mobilidade-atual-descoberta.md`. `docs/fase-04.md` não foi alterado. Não houve alterações em código, contratos, dados públicos, frontend, motor ou infraestrutura. Nenhum dado individual de colaborador foi consultado. A análise geométrica utilizou exclusivamente cadastro público e agregados já publicados.

SHA-256 antes/depois (valores idênticos, conferidos ao término):

| Arquivo | Antes = depois |
|---|---|
| src/domain/hydrology.ts | D722BCD06AA14074652F2978EACF7E2288EB15F90A23D3EC9FF5A998AD41D861 |
| src/domain/alert-engine.ts | F62B29D1FFD848FABE6ACE588261D79666EFC30A8D82A5D72D5F94C6DA46BA57 |
| src/domain/contracts.ts | 9CA3D3689DAAA6D361B0FC166EDDBA0D3210AE21576ACEC17AAB4F8DC5C2931F |
| public/data/status.json | 8702E180296545F8CB6CDBADC796AAE6EE629CF0F92934B680E4BD6134125406 |
| public/data/territorio.json | 9D1FDF8D86B04C4BAB56209EFD889FFDE05202ECC09362F1B866E91BD47DE222 |
| public/data/bairros.geojson | 60018B85B6BDD3B8711905F679BCC6C49CE138FD13610D0DAB753519612480FA |

Validações desta etapa: respostas reais e completude, contagens por flags/data, inspeção de aplicações e metadados, cinco testes geométricos contra os 35 polígonos, correspondência de agregados e preservação dos seis hashes. Build/lint/testes da aplicação não foram repetidos, pois não houve alteração de implementação.

**Parada:** descoberta concluída. Integração depende de validação do usuário; nenhuma implementação de Mobilidade Atual autorizada por este documento.

[L]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_geo_defesa_civil_2026_view/FeatureServer/0?f=pjson
[S]: https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_geo_defesa_civil_2026_view/FeatureServer?f=pjson
[I]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/9a3f169220ad48de9995ca61b42c32c5?f=json
[ID]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/9a3f169220ad48de9995ca61b42c32c5/data?f=json
[A]: https://arcgis.itajai.sc.gov.br/portal/apps/experiencebuilder/experience/?id=f328f60c57a94e89938274e3174eb0d2
[AC]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/f328f60c57a94e89938274e3174eb0d2/resources/config/config.json?f=json
[AD]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/f328f60c57a94e89938274e3174eb0d2/data?f=json
[P]: https://arcgis.itajai.sc.gov.br/portal/apps/experiencebuilder/experience/?id=43d5cd9cac00458fb6f6f8583d089b1b
[PC]: https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/43d5cd9cac00458fb6f6f8583d089b1b/resources/config/config.json?f=json

