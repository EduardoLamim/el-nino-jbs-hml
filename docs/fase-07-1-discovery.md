# Fase 07.1 — Discovery geoespacial do mapa

Consulta: **03/10/2026**, entre 13h04 e 13h13, America/Sao_Paulo (horários UTC individuais no anexo). Escopo: descoberta técnica, sem implementação. A Fase 07 permanece a baseline aprovada; seus itens 6, 7 e 8 continuam deliberadamente pendentes.

**Conclusão:** as manchas históricas e os trechos históricos têm geometrias consultáveis e volumes administráveis. Há candidatos municipais para Aérea e Cartográfica, mas seus metadados não esclarecem direitos de reutilização. Os 40 valores de 10–400 cm são confirmados em um catálogo **linear**: permitem separar trechos por valor, mas não demonstram a extensão de uma área inundável por cenário. Não foi encontrada relação oficial inequívoca entre cenários e DC01–DC11.

Legenda de evidência: **CONFIRMADO** = resposta ou documentação diretamente examinada; **INFERIDO** = avaliação técnica fundamentada, ainda sem implementação/benchmark; **NÃO CONFIRMADO** = falta evidência suficiente, não significa inexistência. Classificação A/B/C aparece ao final e não autoriza implementação.

## 1. Método, evidências e limites

Foram executadas consultas HTTPS anônimas de catálogo, metadados, contagens, estatísticas e geometria. Os catálogos municipais examinados foram [raiz](https://arcgis.itajai.sc.gov.br/server/rest/services?f=pjson), [Hosted](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted?f=pjson), [Restituicao_2024](https://arcgis.itajai.sc.gov.br/server/rest/services/Restituicao_2024?f=pjson) e [defesacivil](https://arcgis.itajai.sc.gov.br/server/rest/services/defesacivil?f=pjson); este último não listou serviços. A origem sintética `https://example.github.io` permitiu observar CORS, mas não substitui um teste futuro no domínio real de GitHub Pages. Inspecionaram-se HTML e JavaScript públicos como texto, sem copiar a interface ou executar código baixado. Não foram baixados corpos de tiles, ortofotos ou imagens de basemap; duas requisições **HEAD**, sem corpo, verificaram disponibilidade/cabeçalhos.

As geometrias ficaram somente em armazenamento temporário de investigação. Foram persistidos neste projeto apenas este relatório e [fase-07-1-evidencias.json](fase-07-1-evidencias.json), com URLs, parâmetros, horários, status, cabeçalhos, hashes disponíveis e métricas, sem coleções de coordenadas. Não houve simplificação, geração de dataset definitivo ou nova geometria em `public/`.

Bytes neste relatório são UTF-8 do corpo descomprimido; “compacto” significa serialização JSON sem espaços; “gzip” é compressão local de referência, não promessa de compressão do GitHub Pages. OIDs e quantidades recuperadas foram conferidos; nos cenários, todas as 157 páginas somaram 139.515 OIDs únicos. Vértices incluem coordenadas de fechamento de anéis. Tamanhos dependem dos campos selecionados, descritos abaixo.

Uma consulta de item do Portal falhou transitoriamente e foi repetida com sucesso. O caminho antigo `.js` do MapLibre retornou 404; foi consultado o `.mjs` declarado pelo pacote. HTTP 200 não foi tratado como sucesso automaticamente: a resposta Esri com erro 499 foi identificada como exigência de token.

## 2. Mapa público da Defesa Civil

**CONFIRMADO no código servido na data da consulta:** [página municipal](https://monitoramento.defesacivil.itajai.sc.gov.br/monitoramento/mapa) carrega [entrada Vite](https://monitoramento.defesacivil.itajai.sc.gov.br/build/assets/app-CS6ae12O.js), que importa [MapaEstacoes-CJ9hUd5B.js](https://monitoramento.defesacivil.itajai.sc.gov.br/build/assets/MapaEstacoes-CJ9hUd5B.js). O componente contém Leaflet **1.9.4**, montagem Vue e `tileLayer` com o template abaixo:

```text
https://monitoramento.defesacivil.itajai.sc.gov.br/img/portal/mapa/{z}/{x}/{y}.jpg
minNativeZoom: 13; maxNativeZoom: 15; maxZoom: 17
bounds: [[-27.0973,-48.8702],[-26.8357,-48.5177]]
attribution: Defesa Civil de Itajaí
```

O mapa configura zoom mínimo 10; ampliar até 17 não prova detalhe nativo acima de 15. As estações chegam como dados embutidos no HTML (`estacoes`), com coordenadas, capacidades e leituras municipais. Ícones são arquivos locais `/img/portal/`. No componente examinado não há consumidores ArcGIS REST, FeatureServer, MapServer, WMS ou WMTS, nem URL externa de tiles. A presença de código genérico WMS dentro da biblioteca Leaflet não significa uso de WMS pelo mapa.

**Limite da evidência:** análise estática do HTML/entrada/componente, não auditoria completa de tráfego ou de backend. Os endpoints GIS examinados nas próximas seções pertencem ao catálogo municipal e não foram atribuídos artificialmente a esse componente.

HEAD de um tile dentro da região retornou 200 e `image/jpeg`, sem `Access-Control-Allow-Origin`. Isso não impede necessariamente exibição por `<img>`, mas impede presumir leitura de pixels em canvas/WebGL entre origens. **NÃO CONFIRMADOS:** fornecedor original das imagens, licença, autorização de hotlink, resolução de aquisição, data das imagens e SLA. Não é defensável copiar esse template para o projeto apenas porque funciona no site oficial. Nenhuma imagem foi baixada para presumir se o conteúdo é aéreo ou cartográfico.

## 3. Bases Aérea, Cartográfica e Simplificada

### 3.1 Aérea: alternativas verificadas

| Fonte | Endpoint e tecnologia | Cobertura, detalhe e atualização | Acesso, CORS e GitHub Pages | Direitos e recomendação |
|---|---|---|---|---|
| Prefeitura / Engemap | [Ortoimagem_restituição_2020/MapServer](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/Ortoimagem_restitui%C3%A7%C3%A3o_2020/MapServer?f=pjson), ArcGIS raster Tile Service; `/tile/{z}/{y}/{x}` | Item informa voo **dez/2020**, Engemap. Extensão publicada: lon −48,867762 a −48,620857; lat −27,052961 a −26,838024. Não comprova cobertura integral de todos os polígonos municipais. Cache ativo LOD 10–20; EPSG:3857; tile 256 px. Resolução de grade no z20 ≈0,1493 m/pixel em Web Mercator; **não é GSD de aquisição**, que não foi informado. | Metadados 200 sem chave/login; CORS devolveu origem enviada. GitHub Pages tecnicamente compatível em HTTPS, sujeito a validação de tiles reais após autorização de uso. | [Item municipal](https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/e21545ff02fc444bb016964411feddd9?f=json) sem `licenseInfo`/créditos formais. `exportTilesAllowed=true` é capacidade, não licença. **Candidato municipal prioritário**, condicionado a direitos, cobertura e antiguidade aceitável. |
| Governo de SC / SIGSC | [WMS GetCapabilities](https://sigsc.sc.gov.br/sigserver/SIGSC/wms?service=WMS&request=GetCapabilities), WMS 1.3.0, layer `OrtoRGB-Landsat-2012`; [WMTS GetCapabilities](https://sigsc.sc.gov.br/sigserver/gwc/service/wmts?SERVICE=WMTS&REQUEST=GetCapabilities), `SIGSC:OrtoRGB-Landsat-2012`, JPEG | Estadual. Aerolevantamento 2010–2012, elemento de resolução 0,39 m segundo [metadados matriciais](https://sigsc.sc.gov.br/1_Metadados_Matriciais_v1.pdf). Esse detalhe é do levantamento, não garantia de resolução uniforme em qualquer zoom do mosaico combinado com Landsat. | Ambos HTTPS 200 sem autenticação, CORS `*`. WMTS anuncia matriz `EPSG:31982-UFSC`; WMS anuncia EPSG:31982 na camada; uso deve respeitar CRS/matrizes anunciados, sem inventar XYZ. Pode ser consumido em Pages com biblioteca apropriada. | [Página institucional](https://sigsc.sc.gov.br/wms-urls.html) oferece serviços para aplicações GIS; capabilities informam `Fees=NONE` e `AccessConstraints=NONE`. Não foi localizada licença detalhada de redistribuição/offline. Alternativa institucional tecnicamente publicada, porém bem mais antiga. Creditar Governo de SC/SIGSC e época do levantamento; esclarecer termos antes de cache próprio. |
| Prefeitura / imagens CBERS | [CBERS_4A_WPM_20230513_corret_tif/MapServer](https://arcgis.itajai.sc.gov.br/server/rest/services/CBERS_4A_WPM_20230513_corret_tif/MapServer?f=pjson) e [Cbers_4a_2m_18_ProjectRaster/MapServer](https://arcgis.itajai.sc.gov.br/server/rest/services/Cbers_4a_2m_18_ProjectRaster/MapServer?f=pjson), raster dinâmico, não cache de tiles | Extensão regional municipal em EPSG:3857. Data 20230513 e “2m” aparecem nos nomes; **não foram promovidas a metadados certificados** de aquisição/resolução. | Metadados públicos com CORS, capacidade `Map,Query,Data`, `singleFusedMapCache=false`. Exportação de imagem seria dependência dinâmica. | `mapName` declara **“WEBSIG MAPA USO EXCLUSIVO INIS”**. Não recomendar reutilização pela JBS sem esclarecimento explícito. Nenhuma imagem exportada. |
| Esri / ArcGIS Location Platform | [World Imagery autenticado](https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer?f=pjson), tiles `/tile/{z}/{y}/{x}`; [estilo imagery](https://developers.arcgis.com/rest/basemap-styles/arcgis-imagery-style-get/) | Global; resolução e atualidade variam por imagem/local. Não verificadas especificamente em Itajaí nesta etapa sem conta/chave. | Endpoint devolveu erro ArcGIS **499 Token Required**, embora HTTP 200; CORS `*`. Exige conta/token apropriado. Pages pode usar chave de cliente limitada ao domínio/serviço, nunca segredo administrativo. | Alternativa comercial consolidada caso fonte oficial não seja licenciada/adequada. Aplicam-se [termos](https://developers.arcgis.com/documentation/terms-of-use/) e atribuição Esri + provedores. Não criar conta, contratar ou presumir uso gratuito de endpoints legados. |

**INFERIDO:** existe caminho técnico para Aérea, mas nenhuma alternativa deve ser ativada automaticamente. Prioridade: confirmar autorização e cobertura da ortoimagem municipal de 2020; avaliar SIGSC se a antiguidade for aceitável; recorrer a Esri mediante condições de conta/licença. A modificação do item de catálogo não equivale à atualização das imagens.

Todos os basemaps externos dependem de rede em runtime. Falha, ausência de cobertura ou limite de serviço deve permitir **Simplificada**, mantendo sobreposições locais. Não se propõe espelhamento de tiles.

### 3.2 Cartográfica: município primeiro, alternativas explícitas

**CONFIRMADO:** [Hosted/basemap_itajai_urb/VectorTileServer](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/basemap_itajai_urb/VectorTileServer?f=pjson) publica tiles PBF `tile/{z}/{y}/{x}.pbf`, EPSG:3857, tile 512 px, estilo versão 8 e [root.json](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/basemap_itajai_urb/VectorTileServer/resources/styles/root.json). O estilo lista sistema viário com rótulos, drenagens/massas de água, divisão administrativa, parques e outras referências municipais. Fonts e sprites usam caminhos relativos ao serviço.

Metadados e estilo responderam sem chave, com CORS aceitando a origem sintética. `minLOD=0`, `maxLOD=19`, mas `maxzoom=22`: **não confundir limites declarados com detalhe efetivo**. Extensão global do serviço/item não comprova cobertura cartográfica mundial; o conteúdo do estilo é municipal. Frescor dos dados e resolução efetiva por zoom não documentados. Não se baixaram PBF, fontes ou sprites; renderização completa e cobertura visual ficam para a implementação autorizada.

O [item](https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/7a110ef9198540068341e6908c6bf298?f=json) tem licença/créditos vazios e descrição `basemap_sem_estilo`, embora o endpoint de estilo exista. `exportTilesAllowed=false`: não planejar cópia/offline. **Recomendado como candidato prioritário municipal**, com confirmação de uso e prova de integração do estilo/fontes/sprites. Compatibilidade Pages é inferência técnica baseada em HTTPS/CORS, não teste de deploy.

| Alternativa | Serviço, licença e acesso | Adequação e limites |
|---|---|---|
| OpenStreetMap Standard / OSM Foundation | XYZ `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, global, sem chave; HEAD 200, CORS `*`. Atribuição visível [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Seguir [política de tiles](https://operations.osmfoundation.org/policies/tiles/). | Caminho simples em HTTPS/Pages; ruas, hidrografia e referências dependem da cobertura comunitária. Não substitui bairros aprovados. Atualização do mapa não significa ocorrência operacional. Serviço sem SLA, sujeito a bloqueio/capacidade: não deve sustentar funcionalidade essencial. Manter Referer, respeitar cache, sem prefetch/bulk/offline. |
| Esri | [Basemap Styles](https://developers.arcgis.com/documentation/mapping-and-location-services/mapping/basemaps/introduction-basemap-styles-service/), estilos de ruas, vetoriais; [Static Basemap Tiles](https://developers.arcgis.com/rest/static-basemap-tiles/) como opção raster. | Global, conta/token, atribuições e termos próprios; biblioteca pode ser de terceiros. Frescor/detalhe de Itajaí não aferidos. Alternativa sob contratação/uso autorizado, não dependência criada nesta fase. |

**INFERIDO:** usar municipal quando direitos e integração estiverem resolvidos; OSM Standard é alternativa viável para demanda moderada com suas restrições, sem garantia operacional. Não recomendar que a indisponibilidade de um provedor dispare downloads massivos em outro. Provedor deve ser configurável; toda base é apenas referência geográfica.

### 3.3 Simplificada

**CONFIRMADO:** o modelo atual depende de dados locais aprovados, sem tiles. **INFERIDO:** pode ser preservado conceitualmente com fundo neutro, limites, agregados JBS e estações, tanto no SVG atual quanto como base vazia em biblioteca cartográfica. O nome deve ser **Simplificada**. A projeção de tela SVG atual não pode simplesmente receber tiles Mercator por baixo: uma evolução terá de usar uma projeção/coordenadas consistentes, preservando seleção, controles e detalhes acessíveis.

## 4. Histórico de inundação: geometria real

Fonte: Prefeitura de Itajaí, [historico_inundacoes/FeatureServer](https://arcgis.itajai.sc.gov.br/server/rest/services/historico_inundacoes/FeatureServer?f=pjson) e [layers](https://arcgis.itajai.sc.gov.br/server/rest/services/historico_inundacoes/FeatureServer/layers?f=pjson), IDs 0–9. **CONFIRMADO:** todas são `esriGeometryPolygon`, EPSG:4326, com `Query`, JSON/GeoJSON/PBF, `maxRecordCount=1000` e paginação anunciada. Consulta de cada layer: `/ID/query`.

Filtro `where=1=1`, sem recorte ou seleção arbitrária. Para medição: `outFields=objectid`, `outSR=4326`, `returnGeometry=true`, `f=geojson`, ordenação por `objectid`. Todas as contagens couberam numa página e coincidiram com as feições recebidas.

| Layer | Referência histórica do nome | Feições | Vértices | GeoJSON recebido (bytes) | Compacto (bytes) | Gzip local (bytes) |
|---|---|---:|---:|---:|---:|---:|
| 0 | 1983 | 1 | 1106 | 46361 | 45304 | 17248 |
| 1 | 1984 | 1 | 5521 | 230863 | 225521 | 83615 |
| 2 | 2001 | 1 | 820 | 34453 | 33708 | 13009 |
| 3 | 2008 | 1 | 20489 | 856221 | 836531 | 306181 |
| 4 | 2011 (anual) | 32 | 2936 | 126097 | 123262 | 44674 |
| 5 | 2011-09 | 5 | 13578 | 571291 | 558057 | 196086 |
| 6 | 2013-07 | 48 | 424 | 22735 | 22323 | 5308 |
| 7 | 2013-09 | 58 | 481 | 26161 | 25702 | 7008 |
| 8 | 2014-06 | 55 | 534 | 28071 | 27561 | 7713 |
| 9 | 2015-10 | 155 | 1014 | 58609 | 57667 | 13422 |

Total: **357 feições, 46.903 vértices, 1.955.636 bytes compactos**, soma gzip por camada **694.264 bytes**. JSON Esri em SR nativo, com os mesmos campos e consultas completas, somou **1.984.027 bytes**. Diferenças de envelope/formatação fazem o GeoJSON recebido diferir do compacto.

Atributos: todos têm OID e área/comprimento de geometria; 0 inclui `area` qualificado e `hectares`; 1–2 `sum_area/sum_hectar`; 3 `text`; 4 `areas`; 5–9 `situa`. A época foi extraída do nome oficial da camada, não de uma data por polígono. Essas colunas não documentam profundidade nem condição atual. Os campos geométricos em SR geográfico não foram usados para estimar metros quadrados.

**INFERIDO:** coleta automatizada e arquivos locais separados por referência são adequados. Preservar IDs/camada/data de coleta; verificar contagem e validade antes de publicação. Não somar 4 (2011) e 5 (setembro/2011) como dois eventos independentes. Não dissolver todas as épocas numa mancha sem explicar perda de proveniência. Geometria pode atravessar vários bairros; não transformar interseção em todo bairro inundado.

Simplificação é opcional para esse volume, sobretudo layer 3. Se autorizada futuramente, fazê-la em CRS métrico apropriado com preservação de topologia, furos e ilhas; medir erro e comparar visualmente. Não se aplicou tolerância agora. Licença de redistribuição não está explicitada no [item histórico](https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/32c4ca9500d6497fa47f3c92a17618f3?f=json); o identificador exato e resposta estão no anexo, via `serviceItemId` do serviço. Não equiparar acesso público a licença aberta.

## 5. Vias com histórico de inundação

Fonte: Prefeitura, [Hosted/View__vias_alagamentos/FeatureServer/1](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/View__vias_alagamentos/FeatureServer/1?f=pjson), nome `Sistema_viario_alagamentos`. **Filtro aprovado preservado:** `trecho_alagado = '1'`.

**CONFIRMADO:** `esriGeometryPolyline`, EPSG:31982, OID `fid`, `maxRecordCount=1000`, JSON/GeoJSON/PBF, paginação/ordenação/estatísticas. Resultado completo: **555 feições**, **1.543 vértices**, **185.926 bytes GeoJSON recebido**, **185.881 compactos**, **31.858 gzip**. JSON Esri nativo completo: **145.474 bytes**. Uma página de 1000 foi suficiente.

Campos medidos: `fid,nome,cod,codsecao,target_fid,trecho_alagado,data`. O schema também possui `join_count`, hierarquia/largura/passeios, pares com sufixo `_1`, `trecho_alagado_11` e comprimento. Não substituir o filtro aprovado por campos de nome parecido.

| Verificação | Resultado e limite |
|---|---|
| OIDs | 555 feições recebidas; identificador de feição não representa rua única. |
| Nome/código | 176 valores distintos de `nome` e 176 de `cod`; 95 nomes aparecem em mais de uma feição. Igual quantidade não certifica cadastro único de ruas. |
| `target_fid` | 536 valores distintos para 555 feições: repetição cadastral; não remover automaticamente. |
| Geometria | Zero duplicatas por igualdade exata da geometria serializada. Não é teste topológico de sobreposição parcial, orientação inversa ou tolerância. |
| `data` | 473 nulos e 82 preenchidos em três valores de outubro/2023. Não atribuir a todas as feições uma data de evento, nem interpretar esse campo como atualização operacional. |

**INFERIDO:** preparar arquivo local pequeno sob demanda, com proveniência e filtro registrados. Simplificação provavelmente desnecessária: muitas linhas têm poucos vértices; redução indiscriminada pode eliminar trechos. Não agrupar por nome nem deduplicar por `target_fid` sem regra do produtor. Manter o texto aprovado: **“Trechos/feições associados a registros históricos de inundação. Não representa a condição atual das vias.”** Nenhum dado de mobilidade atual da Fase 04.1 foi integrado.

## 6. Cenários: o que é possível desenhar

### 6.1 Catálogo público de linhas e investigação da origem

Fonte: Prefeitura, [vias_atingidas_nivel_inundacao_publica_view/FeatureServer/0](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_atingidas_nivel_inundacao_publica_view/FeatureServer/0?f=pjson). Serviço possui a camada 0, `vias_atingidas_nivel`, sem tabela complementar documentando uma relação DC. **CONFIRMADO:** polilinha EPSG:31982, OID `fid`, `maxRecordCount=1000`, JSON/GeoJSON/PBF, filtros SQL, estatísticas, ordenação, paginação e filtros espaciais.

Campos relevantes: `id_trecho`, `id_via_ori`, `nivel_cm`, `transb_m`, `faixa_10cm`, `classe_sen`, `situacao`, `cota_via_publico`, `publico`, além de cadastro viário. Nenhum campo documenta conversão de DC. `relationships: []`. [Item público](https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/6986e7e35651447aa1a7ab9eee316487?f=json) tem descrição/licença nulas e snippet “defesa civil”. Consulta reversa `Service2Service` retornou lista vazia; isso não revela a origem interna nem prova sua ausência.

A busca pública por `vias_atingidas_nivel` encontrou também:

- [vias_atingidas_nivel_inundacao_view/0](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_atingidas_nivel_inundacao_view/FeatureServer/0?f=json), outra view, usada pela aplicação explicativa municipal;
- [vias_atingidas_nivel_publicacao_populacao/layers](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/vias_atingidas_nivel_publicacao_populacao/FeatureServer/layers?f=json), camada 0 `lines`, igualmente polilinha e com campos de cenário. Somente schema/item foram inspecionados; nenhum registro individual de população foi acessado. Descrição vazia, sem linhagem metodológica suficiente.

Também na outra view o relacionamento reverso público ficou vazio. **NÃO CONFIRMADOS:** projeto original de processamento, DEM utilizado, resolução do modelo, tratamento hidráulico, ligação documental entre essas publicações, datum vertical e versão equivalente. Nome semelhante não autoriza intercâmbio de fontes.

### 6.2 Valores, quantidades e tamanho por grupo exato

**CONFIRMADO:** agrupamento por `nivel_cm,transb_m,faixa_10cm` retornou exatamente os 40 grupos abaixo. Consulta real de geometria para cada um: `where=nivel_cm = L`, `f=geojson`, `outSR=4326`, `outFields=fid,id_trecho,id_via_ori,nivel_cm,transb_m,faixa_10cm`, `orderByFields=fid`, páginas de 1000. Os tamanhos são dos grupos **exatos**, não do filtro acumulado `<= L`.

| `nivel_cm` | Feições | Vértices | GeoJSON compacto (bytes) | Gzip local (bytes) | Páginas |
|---:|---:|---:|---:|---:|---:|
| 10 | 288 | 602 | 80163 | 13428 | 1 |
| 20 | 473 | 952 | 130579 | 21482 | 1 |
| 30 | 646 | 1301 | 179490 | 29176 | 1 |
| 40 | 810 | 1627 | 225762 | 36315 | 1 |
| 50 | 939 | 1891 | 261913 | 41983 | 1 |
| 60 | 1063 | 2132 | 296091 | 47314 | 2 |
| 70 | 1177 | 2365 | 328085 | 52418 | 2 |
| 80 | 1296 | 2599 | 361038 | 57698 | 2 |
| 90 | 1432 | 2878 | 399265 | 63952 | 2 |
| 100 | 1573 | 3164 | 437123 | 69930 | 2 |
| 110 | 1900 | 3822 | 536502 | 83787 | 2 |
| 120 | 2153 | 4325 | 608724 | 95065 | 3 |
| 130 | 2314 | 4641 | 653985 | 101947 | 3 |
| 140 | 2286 | 4597 | 646603 | 101652 | 3 |
| 150 | 2398 | 4819 | 678159 | 106192 | 3 |
| 160 | 2721 | 5470 | 769598 | 120329 | 3 |
| 170 | 3088 | 6215 | 873733 | 136194 | 4 |
| 180 | 3430 | 6878 | 969463 | 151239 | 4 |
| 190 | 4039 | 8128 | 1142816 | 178015 | 5 |
| 200 | 4543 | 9137 | 1276148 | 200518 | 5 |
| 210 | 4987 | 10027 | 1410621 | 219396 | 5 |
| 220 | 5626 | 11308 | 1591213 | 247193 | 6 |
| 230 | 5971 | 11990 | 1688468 | 261724 | 6 |
| 240 | 5885 | 11819 | 1664395 | 258683 | 6 |
| 250 | 5743 | 11524 | 1623610 | 252228 | 6 |
| 260 | 5849 | 11745 | 1653895 | 256833 | 6 |
| 270 | 5906 | 11878 | 1670836 | 260023 | 6 |
| 280 | 5763 | 11578 | 1629804 | 253622 | 6 |
| 290 | 5715 | 11487 | 1616325 | 251307 | 6 |
| 300 | 5608 | 11273 | 1574896 | 246692 | 6 |
| 310 | 5410 | 10879 | 1533580 | 238539 | 6 |
| 320 | 5156 | 10414 | 1475868 | 228686 | 6 |
| 330 | 4895 | 9836 | 1399108 | 216592 | 5 |
| 340 | 4692 | 9446 | 1341936 | 208139 | 5 |
| 350 | 4610 | 9274 | 1318006 | 203993 | 5 |
| 360 | 4273 | 8605 | 1222040 | 189754 | 5 |
| 370 | 3961 | 7970 | 1132652 | 175687 | 4 |
| 380 | 3764 | 7580 | 1076509 | 167192 | 4 |
| 390 | 3680 | 7417 | 1052699 | 163521 | 4 |
| 400 | 3452 | 6943 | 980018 | 153594 | 4 |

Total completo: **139.515 feições/OIDs únicos**, **280.536 vértices**, **39.510.120 bytes compactos** e **6.158.470 gzip** quando concatenados. São 139.515 `id_trecho` distintos, mas **5.713 `id_via_ori`**; destes, **5.258 aparecem em mais de um valor**. Não são 139.515 ruas. As 157 páginas contêm aproximadamente o mesmo volume mais seus envelopes; o total de corpos recebidos foi **39.523.464 bytes**, registrado no anexo.

Uma amostra de 1000 em JSON Esri nativo mediu **210.521 bytes**, separadamente (`scenarioRawSample` no anexo); não se apresenta extrapolação dessa amostra como tamanho nativo completo. GeoJSON transformado para 4326 e atributos mínimos já foi integralmente medido. Acrescentar nomes/popups aumentará o volume.

### 6.3 Semântica oficial e sobreposições

A [configuração pública da aplicação municipal](https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/0b7b849710b54e678637440696821823/resources/config/config.json?f=json), bloco `widgets.widget_1.config.embedCode`, descreve suscetibilidade HAND ligada à diferença altimétrica em relação à drenagem conectada e classificação em intervalos de 10 cm. O código permite seleção exata `nivel_cm = level` e acumulada `nivel_cm <= level`. **Essa aplicação usa a outra view**, não a pública aprovada; a descrição corrobora o contexto, mas não prova equivalência completa entre publicações.

Consultas de controle na view pública: zero nulos de `nivel_cm`; zero divergências em `nivel_cm <> transb_m*100`; **326 divergências em `nivel_cm <> cota_via_publico`**. Portanto, não substituir o campo de cenário por `cota_via_publico`. Faixas variam de `0.00 a 0.10 m` a `3.90 a 4.00 m`. Conversão numérica de unidades não estabelece significado físico de profundidade ou nível de rio.

**Sobreposição:** uma feição possui um valor; grupos exatos têm OIDs distintos e não são, por definição, seleções cumulativas. Foram encontradas zero geometrias exatamente repetidas, inclusive entre grupos. Isso **não prova ausência de cruzamentos, contatos ou sobreposição parcial**; não foi executada união/interseção topológica de todas as linhas. A mesma via cadastral aparece em vários grupos, com fragmentos diferentes. Seleções `<= L` são conjuntos aninhados por construção SQL, não comprovação de manchas progressivas. Não há teste defensável de sobreposição de áreas quando a fonte é linear.

**Não interpretar:** profundidade local de água, altura acima de régua DC, altitude absoluta, tempo de chegada, probabilidade, via bloqueada hoje ou colaborador afetado hoje. O texto `Atingida` do catálogo de modelagem não cria uma ocorrência atual. Nenhum cenário deverá alterar Nível de Alerta JBS, gatilhos, estação ou Plano de Ação.

### 6.4 Fontes de polígonos/raster examinadas separadamente

| Fonte municipal | Geometria e volume observado | Evidência semântica e decisão |
|---|---|---|
| [mancha_inundacao/MapServer](https://arcgis.itajai.sc.gov.br/server/rest/services/mancha_inundacao/MapServer?f=pjson), raster layer 0 | EPSG:31982; `07_manchas_0-4m_filtrada.tif`; `Map,Query,Data` no serviço não transforma raster em FeatureServer de polígonos. Pode oferecer renderização/identify, não GeoJSON de manchas por 10 cm. | Item associado a HAND; faltam dicionário de pixels, NoData, regra de corte e correspondência com catálogo linear. Não baixar/limiarizar raster para inventar 40 manchas. |
| [Hosted/mancha_inundacao_final/FeatureServer/0](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/mancha_inundacao_final/FeatureServer/0?f=pjson) | **3.158 polígonos**, EPSG:3857, OID `objectid1`, limite 2000, paginação/GeoJSON. Amostra de 100: 16.711 vértices e 692.112 bytes GeoJSON; não é o dataset completo. | Campos territoriais/áreas/agregações (`bairro`, `nome_1`, `diferença` etc.), **sem identificador de cenário**. Origem histórica/modelada e equivalência ao raster não documentadas. Não converter `diferença` em altura. |
| [Hosted/Inundação_cotas/FeatureServer/layers](https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/Inunda%C3%A7%C3%A3o_cotas/FeatureServer/layers?f=pjson) | Polígonos EPSG:31982, `fid,dn,SHAPE__Length,SHAPE__Area`, limite 2000, paginação/GeoJSON. Layer 0 nome `3`: **49.909**; 1 nome `2`: **27.061**; 2 nome `1`: **6.597**; 3 nome `4`: **55.706**. | [Item](https://arcgis.itajai.sc.gov.br/portal/sharing/rest/content/items/99d0c21086bf4abfa1f16a29b9188713?f=json) apresenta snippet de teste, descrição/licença vazias. Amostras têm `dn` 3/2/1/4 respectivamente, mas nomes/valores não comprovam unidade física, intervalos ou relação com 10–400 cm. |

Nas quatro camadas `Inundação_cotas`, amostras ordenadas de 100 feições tiveram, respectivamente, 698/762/1.380/1.449 vértices e 39.147/41.749/66.963/69.827 bytes. **Não extrapolar com confiança:** a primeira página pode não representar a distribuição de complexidade. Apenas como ordem de grandeza, multiplicação linear daria cerca de 19,5/11,3/4,4/38,9 MB; são estimativas frágeis, não medições completas. Para `mancha_inundacao_final`, a mesma conta daria ~21,9 MB. Não houve coleta integral desses candidatos sem semântica resolvida.

**Conclusão territorial:** há polígonos públicos candidatos, mas não existe evidência suficiente nas fontes examinadas para identificá-los como as 40 extensões correspondentes aos valores do catálogo. Não interpolar entre `dn=1,2,3,4`, não criar buffers das vias e não usar raio geográfico. Não substituir áreas por bairros inteiros.

### 6.5 Seletor: decisão que precisa de validação

**CONFIRMADO tecnicamente:** um seletor pode filtrar as **linhas** pelos 40 valores publicados. **NÃO CONFIRMADO para o objetivo de áreas:** não há fonte validada para desenhar a extensão inundável de cada valor. A lista exata foi descoberta, não presumida.

**B com ressalvas para seletor de trechos**, se o usuário aprovar essa representação limitada e a fonte esclarecer a aplicação da semântica à view pública; **C para seletor que prometa área inundada**. Escolher entre faixa exata (`=`) e acumulado (`<=`) altera a interpretação: fica registrado como pendência, sem decisão arbitrária. Futura interface deve mostrar unidade tal como publicada e explicação de cenário territorial hipotético, sem vínculo com a condição atual.

**DC01, DC02, DC03, DC04, DC05, DC06, DC07, DC08, DC09, DC10 e DC11:** não há documentação oficial inequívoca encontrada que relacione a leitura de cada estação a esses cenários. A lacuna permanece para todas. Não se buscou fórmula para preenchê-la.

## 7. Arquitetura cartográfica e dependências

Avaliação **INFERIDA**, apoiada em documentação e métricas, sem instalação ou protótipo. Todas as opções abaixo podem integrar React por ciclo de vida e referências; nenhuma biblioteca, isoladamente, exige API key. A exigência pertence ao provedor. GitHub Pages pode servir bundles/dados estáticos e consumir serviços HTTPS autorizados.

| Opção | Tiles, GeoJSON, navegação e camadas | Acessibilidade/mobile/performance | Tamanho e manutenção |
|---|---|---|---|
| SVG/React atual | Adequado à Simplificada e pequeno conjunto local. Tiles georreferenciados exigiriam implementar grade, projeção, cache, atribuição e gestão de zoom. | DOM permite elementos acessíveis, mas milhares de paths/estado React aumentam custo. Não recomendado para 139 mil feições. | Zero biblioteca nova; crescimento de código cartográfico próprio e testes seria alto. Preservar a baseline não exige manter para sempre sua renderização interna. |
| [Leaflet](https://leafletjs.com/) 1.9.4 | Raster XYZ/WMS, GeoJSON, zoom/pan/camadas; SVG ou Canvas. Base vazia simples. VectorTile/estilo municipal precisa plugins/adaptadores adicionais. | Touch/teclado e [orientações de acessibilidade](https://leafletjs.com/examples/accessibility/); Canvas perde semântica por feição, exigindo seletores/lista externa. Bom candidato para raster + volumes pequenos/filtrados. | JS distribuído medido: **147.552 B**, gzip **42.706 B**, sem CSS/plugins. BSD-2-Clause. Menor ponto de partida, mas plugins vetoriais reduzem a vantagem. |
| [OpenLayers](https://openlayers.org/) 10.10.0 | Raster XYZ/WMS/WMTS, GeoJSON, MVT, projeções e camadas; Canvas/WebGL conforme renderer. Estilo municipal versão 8 pode demandar `ol-mapbox-style` e resolução de fontes/sprites. | Navegação touch/teclado; [exemplo acessível](https://openlayers.org/en/latest/examples/accessible.html). Preservar lista/controles HTML externos. Mais opções para formatos/CRS e dados vetoriais densos; sem garantia de FPS sem benchmark. | Distribuição completa medida: **1.043.059 B**, gzip **291.207 B**, sem CSS/adaptadores. Imports modulares Vite podem reduzir; tamanho final não medido. BSD-2-Clause; maior complexidade inicial, menor necessidade de inventar infraestrutura GIS. |
| [MapLibre GL JS](https://maplibre.org/projects/gl-js/) 6.11.2 | Vetores/estilos e raster, GeoJSON, GPU/WebGL; pode usar fundo neutro sem basemap. | Forte para vetores/estilo; GPU/contexto e workers acrescentam pontos de falha em dispositivos. Sobreposições em canvas exigem representação acessível externa. Seguir [guia de grandes dados](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/). | Entrada ESM medida **590.228 B**, gzip **150.454 B**, **incompleta**: importa shared e infraestrutura adicional; não comparar como bundle total menor que OpenLayers. BSD-3-Clause; integração/worker/CSP precisam teste. |

Tamanhos medidos em artefatos públicos temporários, sem instalar pacotes. Não são benchmark comparável de bundle final: Leaflet e OL foram distribuições completas, MapLibre entrada modular. Nenhuma alteração em `package.json` ou lockfile.

**Recomendação técnica: OpenLayers**, para conciliar raster/WMS/WMTS, GeoJSON e o basemap vetorial municipal em uma arquitetura, com imports modulares e camadas independentes. Leaflet continua alternativa proporcional se a implementação autorizada escolher apenas raster e geometrias pequenas por vez. Não recomendar dois motores simultâneos por padrão. A escolha de OpenLayers não autoriza carregamento de todo catálogo sem filtragem.

A futura transformação de GeoJSON 4326 para visualização em 3857 deve ocorrer de forma consistente; não tratar coordenadas 31982 como latitude/longitude. Interações e controles React não devem recriar todas as geometrias a cada mudança de leitura. O carregamento da biblioteca pode ser restrito à página do mapa, preservando dashboard e Plano de Ação.

## 8. Estratégia de dados, performance e resiliência

| Camada | GIS direto no navegador | Preparação/publicação local futura recomendada |
|---|---|---|
| Basemaps | Necessário para tiles oficiais/provedor, sujeito a CORS, licença, quotas e indisponibilidade. | Não espelhar imagens/tiles. Simplificada é a alternativa local. |
| Histórico | Possível, mas cria dez dependências de consultas e mistura mudanças da fonte durante uso. | **Preferível**, arquivos por referência, versão, fonte, hash, data e controle de completude. ~1,96 MB compacto total; carregar só ao ativar/selecionar época. |
| Vias históricas | Possível, uma consulta atual cabe no limite. | **Preferível**, ~186 KB compacto. Congelar o filtro aprovado e conservar procedência. |
| Linhas de cenários, se autorizadas | SQL e paginação funcionam; até 157 páginas para todos os grupos. CORS observado não elimina risco de lentidão/falha. | **Preferível**, particionar por grupo exato, manifesto de valores/contagens. Um grupo: ~80 KB a ~1,69 MB compacto. Não carregar os 39,51 MB no início. |
| Polígonos candidatos | Tecnicamente consultáveis/amostrados, mas sem interpretação validada. | **Não preparar para produção** enquanto semântica/linhagem não forem resolvidas. |

Preparação futura deve preservar a filosofia existente: fonte → coleta/validação → arquivo versionado → frontend. Atualização histórica/modelada não precisa acompanhar telemetria a cada leitura; periodicidade deve refletir publicação do produtor e ser definida após validação. Em falha, manter última versão válida com sua data, sem substituir por coleção vazia. Publicação de vários arquivos requer manifesto/versionamento consistente para evitar mistura de versões em cache.

**Performance inferida, não benchmark:** 46.903 vértices históricos são moderados; carregar só a época ativa reduz parse/desenho. 555 trechos históricos são pequenos. Nos cenários, o custo também é de **139.515 objetos/estilos/eventos**, mesmo com só ~2 vértices por feição. Uma transferência de 39,51 MB leva, idealmente, ~31,6 s a 10 Mbit/s, sem latência/parse; 6,16 MB gzip ainda seria ~4,9 s. A memória decodificada será maior, sem multiplicador medido. Não publicar promessa de FPS/tempo mobile.

Lazy loading ao ativar camada, cancelamento de consultas obsoletas e cache limitado por versão são recomendados. Se no futuro for aprovado `<= L`, os grupos menores serão reutilizáveis, mas selecionar 400 alcançaria todo o catálogo: será necessário orçamento de memória/renderização e eventual preparação em tiles vetoriais locais, somente em outra implementação autorizada. Isso não requer nem autoriza agora banco geoespacial.

Não simplificar cegamente os cenários: eliminar vértices de segmentos de dois pontos não resolve o número de feições. Eventual fusão de linhas pode perder IDs/faixas/proveniência; exige regra validada. Simplificação de polígonos históricos pode ser avaliada posteriormente com tolerância em metros, validade, preservação de topologia e comparação de interseções. Nenhuma tolerância foi definida como regra nesta etapa.

**Fallback recomendado:** manter sobreposições próprias em fontes locais independentes da base. Detectar falha persistente de carregamento, exibir “Base indisponível” e oferecer/ativar Simplificada, preservando extensão, seleção, estações, bairros, agregados, legenda e detalhes. Falha de um tile isolado não deve destruir o mapa nem disparar troca repetida de provedor. Limitar retries e permitir tentativa manual. Falha de camada opcional deve afetar apenas essa camada, nunca alertas ou Plano de Ação.

Simplificada deve funcionar sem qualquer provedor externo de tiles após a aplicação/dados locais carregarem. Isso **não promete funcionamento offline total**: primeiro acesso ao GitHub Pages e atualização dos dados ainda exigem rede; não foi implementado service worker/cache offline. Manter os detalhes HTML acessíveis mesmo se renderer gráfico falhar.

## 9. Semântica visual, atribuição e privacidade

Recomendação futura, não estilo implementado: histórico em preenchimento violeta suave com hachura/época na legenda; vias históricas em traço azul tracejado; cenários, se legitimados, em ciano com contorno e valor explícito. Usar padrão, forma e texto além de cor; controlar transparência e ordem para não esconder estações/JBS. Validar contraste em Aérea e Cartográfica. Não preencher todo bairro com cor operacional por intersectar uma geometria.

Preservar verde Normalidade, amarelo Atenção, laranja Alerta, vermelho Emergência e preto Impacto JBS. A camada territorial não altera esses estados. “Colaboradores JBS” continua agregada, sem nomes, endereços ou geocodificação. Não se acessaram dados individuais nem se alteraram agregados.

Atribuições propostas, sujeitas aos termos do produtor: “Prefeitura de Itajaí / Defesa Civil — camada e época”; para ortoimagem, acrescentar Engemap e voo dez/2020; para SIGSC, Governo de Santa Catarina/SIGSC e época 2010–2012. Esses créditos **não substituem licença ausente**. OSM exige atribuição aos contribuidores e link; Esri exige atribuição Esri e provedores pertinente à área/escala. Preservar avisos de licença das bibliotecas na distribuição. Não retirar créditos quando trocar base; apresentar os correspondentes à base/camada ativa.

## 10. Respostas objetivas às 20 perguntas

| # | Pergunta | Resposta |
|---:|---|---|
| 1 | Podemos usar Aérea? | **INFERIDO: sim, com ressalvas** de direitos, cobertura e antiguidade; não há autorização automática dos tiles municipais. |
| 2 | Fonte aérea recomendada? | Ortoimagem municipal 2020 como candidata prioritária; SIGSC institucional e Esri sob termos como alternativas. |
| 3 | Podemos usar Cartográfica? | **INFERIDO: sim**, serviços e biblioteca adequados existem; validar integração/licença. |
| 4 | Fonte cartográfica recomendada? | Basemap vetorial municipal, condicionado a licença/fontes/sprites; OSM Standard como alternativa com política e sem SLA. |
| 5 | Preservar Simplificada? | **Sim**, fundo neutro e sobreposições locais; experiência preservável, sem dependência de tiles. |
| 6 | Geometria histórica disponível? | **CONFIRMADO**, dez layers poligonais, 357 feições. |
| 7 | Trechos históricos disponíveis? | **CONFIRMADO**, 555 feições no filtro aprovado. |
| 8 | Geometrias individuais dos cenários? | **CONFIRMADO para linhas separáveis**; **NÃO CONFIRMADO para extensão de áreas** por cenário. |
| 9 | Quais valores existem? | **CONFIRMADO**, 10 a 400 em incrementos de 10; tabela completa acima. |
| 10 | Seletor defensável? | Com ressalvas para trechos e definição de `=`/`<=`; não defensável como seletor de manchas de área ainda. |
| 11 | Semântica oficial? | Aplicação municipal descreve suscetibilidade HAND na outra view; equivalência integral com view pública pendente. Não profundidade nem leitura DC. |
| 12 | Relação cenário/DC? | **NÃO CONFIRMADA para todas as onze DCs**. |
| 13 | SVG/React adequado? | Sim para baseline Simplificada; não recomendado como infraestrutura completa da expansão. |
| 14 | Biblioteca recomendada? | **OpenLayers**, formatos/CRS/camadas vetoriais e raster; Leaflet alternativo para escopo raster reduzido. |
| 15 | Runtime ou local? | Basemaps externos runtime; geometrias aprovadas preparadas/versionadas localmente. |
| 16 | Impacto estimado? | Histórico 1,96 MB; vias 0,186 MB; todos os cenários lineares 39,51 MB compactos. Sob demanda; sem benchmark mobile. |
| 17 | Fallback? | Base neutra Simplificada, sobreposições/detalhes locais independentes e seleção preservada. |
| 18 | Atribuições/licenças? | Município/Defesa Civil e proveniência; Engemap/SIGSC quando aplicável; OSM ou Esri conforme provedor; licenças municipais não explicitadas. |
| 19 | Riscos técnicos? | CORS mutável, serviço externo sem garantia, cobertura/antiguidade, projeção, paginação incompleta, cache inconsistente, memória mobile, adaptação do estilo vetorial e interpretação indevida de linhas como área. |
| 20 | Evidência insuficiente? | Direitos municipais, linhagem/semântica dos polígonos candidatos, equivalência de views, interpretação de `cota_via_publico`, opção exata/acumulada, cenários/DC, benchmark e renderização integrada. |

## 11. Matriz final A/B/C

**A — implementável com evidência suficiente. B — implementável com ressalvas. C — não implementável de forma defensável no momento.** Classificação não autoriza implementação.

| Item | Classificação | Justificativa / condição |
|---|---|---|
| A. Base aérea | **B** | Candidatos técnicos oficiais e alternativa licenciada existem. Resolver autorização municipal, cobertura/frescor ou condições de provedor. |
| B. Base cartográfica | **B** | Basemap municipal vetorial e OSM/Esri viáveis; municipal sem licença explícita e estilo ainda sem prova de renderização; alternativas com restrições próprias. |
| C. Histórico de inundação | **B** | Geometria/volume confirmados. Esclarecer redistribuição, preservar épocas/proveniência e evitar contar 2011 duas vezes. Tecnicamente pronto para planejamento, não publicado. |
| D. Vias históricas | **B** | Filtro/geometrias/volume confirmados. Esclarecer redistribuição, conservar feições e não converter contagem em ruas nem condição atual. |
| E. Cenários de possível inundação | **C para extensão de áreas** | Catálogo validado é linear; polígonos/raster candidatos não têm correspondência metodológica comprovada com os 40 valores. Linhas seriam uma entrega diferente, possível com ressalvas, dependente de validação explícita. |
| F. Seletor de cenário | **C para o objetivo de áreas solicitado** | Filtro de valores realmente publicados funciona para linhas, alternativa B com ressalvas se aprovada como escopo diferente. Representação e escolha exata/acumulada precisam validação; não pode prometer mancha de inundação nem alterar operação. |
| G. Arquitetura cartográfica | **A** | Biblioteca cartográfica + camadas locais independentes + basemap opcional é tecnicamente fundamentado. Recomenda-se OpenLayers; desempenho final deve ser verificado durante implementação autorizada. |

## 12. Pendências e encerramento

Descobertas que afetam a interpretação: mapa DC usa tiles JPG municipais próprios, não o basemap ArcGIS presumido; ortoimagem municipal tem voo de 2020; “cenários” aprovados são fragmentos de vias e somam 139.515 feições; um catálogo de polígonos com nomes 1–4 existe, mas seu item é descrito como teste e não resolve os 40 níveis; `cota_via_publico` diverge em 326 registros. Nenhuma dessas descobertas altera regras aprovadas.

Antes de uma implementação de áreas, é necessário obter do produtor a definição de cada produto, o vínculo entre raster/polígonos/linhas, unidades, versão e regra de cenário. Antes de reutilizar basemaps municipais, esclarecer termos de uso, atribuição e limites. Para trechos selecionáveis, validar o escopo limitado e a semântica exata/acumulada. Não foi enviada mensagem a terceiros.

Arquivos criados: `docs/fase-07-1-discovery.md` e `docs/fase-07-1-evidencias.json`. **Nenhum arquivo de produção modificado**, nenhum pacote instalado, dataset permanente, CSS, frontend, motor, alerta, Plano de Ação, Supabase ou deploy alterado. Conferência SHA-256 de **63 arquivos** em `src/`, `scripts/`, `supabase/` e `public/` encontrou **zero diferenças e zero arquivos adicionados/removidos** nessas árvores; consta no anexo. Testes da aplicação não foram repetidos: esta entrega é exclusivamente documental; validações executadas foram consultas reais, completude, métricas, inspeção de schemas e integridade dos arquivos.

**Ponto de parada: discovery concluído para validação. Aguardar autorização antes de implementar a Fase 07.1.**
