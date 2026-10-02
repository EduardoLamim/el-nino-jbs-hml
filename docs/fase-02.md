# Fase 02.1 — substituição da fonte meteorológica

Registro histórico da entrega 02.1. A implementação e o estado corrente do motor estão em [fase-03.md](fase-03.md); as menções abaixo a nível não calculado descrevem o retrato anterior à Fase 03.

## Decisão e resultado

**CPTEC removido integralmente do caminho operacional da V1 por decisão arquitetural. INMET não foi pesquisado nem implementado. Epagri/Ciram é a única fonte meteorológica.** Defesa Civil continua responsável por situação atual, rios, chuva e barragens; ArcGIS fica para fase posterior.

Coleta real final concluída em **01/10/2026 às 18:20:53 UTC / 15:20:53 America/Sao_Paulo**, código de saída **0**: seis fontes com sucesso, 11 rios, 12 pluviômetros, três barragens e cinco dias de previsão municipal. `status.json` validado; `nivel_jbs = {nivel:null, desde:null, gatilhos:[]}`. A coleta anterior das 16:59 UTC também gravou com sucesso após resolver o bloqueio Windows.

As primeiras tentativas tiveram EPERM na renomeação do arquivo no Windows. Após encerrar o servidor Vite aberto anteriormente, a execução completa gravou normalmente. O arquivo anterior permaneceu preservado durante as falhas.

## Descoberta técnica e URLs

1. Página [Previsão Município](https://ciram.epagri.sc.gov.br/index.php/previsao-municipio/) incorpora `https://ciram.epagri.sc.gov.br/ciram_arquivos/site/prev-modelo-setamuni-new.html?4205407`. O parâmetro padrão é Florianópolis; **não foi usado como previsão de Itajaí**. O seletor publica Itajaí com valor `4208203`.
2. O produto atual usa HEAD para procurar rodadas 12/00, recuando até cinco dias, e GET de PNG/SVG em `https://ciram.epagri.sc.gov.br/meteogramas/figs/`. Não expõe JSON nessa aplicação. Os modelos GFS e WRF são identificados nos controles.
3. O HTML oficial ainda referencia, em comentário, `https://ciram.epagri.sc.gov.br/prevmuni-client/`. Essa aplicação permanece acessível e carrega `main-es2015.74ee76f5927cfa0d3442.js`.
4. A leitura desse bundle, sem execução, encontrou os endpoints estruturados abaixo. Ambos responderam HTTP 200, JSON UTF-8, com dados de Itajaí para as datas atuais da coleta. Foram priorizados em relação a parsing de gráficos ou HTML.

| Uso operacional | Método e URL |
| --- | --- |
| Catálogo municipal | GET `https://ciram.epagri.sc.gov.br/api/prevmuni-server/resources/listaJson/muni` |
| Previsão diária municipal | GET `https://ciram.epagri.sc.gov.br/api/prevmuni-server/resources/listaJson/prevMuniDia?cdCidade=4208203` |

O collector valida que o catálogo tenha uma única entrada com `texto=Itajaí`, `valor=4208203`. Exige `nmMunicipio=Itajaí` em todos os dias. O código é o publicado nos dois componentes oficiais; identifica Itajaí/SC. **A API não emite campo UF**: o contrato mantém `uf=null`, sem fabricar resposta; se o campo aparecer, deve ser SC. Nome, código ou UF divergentes causam falha explícita. Não basta aceitar o primeiro resultado da busca.

Não se encontrou identificação do modelo no JSON nem no componente que o apresenta. Por isso `modelo=null`, apesar de outros produtos da Epagri identificarem WRF/GFS. Não se infere modelo pela semelhança ou diferença de números.

## Produto gráfico e regional investigados

URLs municipais gráficas verificadas:

- `https://ciram.epagri.sc.gov.br/meteogramas/figs/wrf/2026100112/4208203.svg`: 404; tentativa conforme sequência da própria aplicação.
- `https://ciram.epagri.sc.gov.br/meteogramas/figs/wrf/2026100100/4208203.svg`: 200. SVG Matplotlib, caminhos gráficos, ícones raster e comentários; identificação explícita `WRF-CIRAM 3Km`, texto de referência `30/09/2026 21h`. Não foi convertido em valores por OCR/interpretação geométrica.
- `https://ciram.epagri.sc.gov.br/meteogramas/figs/banner/wrf/2026100100/4208203.png`: 200, banner Itajaí com cinco dias. Foi inspecionado somente na descoberta; não usado para normalizar ou preencher lacunas do JSON.

A página [Previsão Região](https://ciram.epagri.sc.gov.br/index.php/previsao-regiao/) incorpora:

- `https://ciram.epagri.sc.gov.br/pesca_sul_norte/previsao_regiao_gfs_5d.jsp`;
- `https://ciram.epagri.sc.gov.br/pesca_sul_norte/previsao_regiao_wrf_5d.jsp`.

O segundo foi consultado: HTTP 200, HTML com charset ISO-8859-1, tabelas de cinco dias com região, mínima, máxima e condição. O modelo WRF é explicitamente associado ao embed pela página. Região não é município; mínimas e máximas são extremos regionais. O produto não segue necessariamente divisões administrativas, conforme explicação oficial. **Nenhum produto regional foi incluído no status ou usado como fallback**, pois a previsão municipal estruturada está acessível.

O serviço municipal JSON está ligado à aplicação anterior, não ao produto gráfico atualmente incorporado. Sua continuidade, modelo e processo de atualização precisam ser confirmados com a Epagri para eventual uso operacional. HTTP 200 e datas de previsão não comprovam a hora de emissão.

## Contrato genérico e normalização

`previsao` agora possui fonte, modelo, abrangência municipal/regional, município/código, UF, região, atualização, coleta, disponibilidade e dias. O schema proíbe rotular dados regionais como municipais. Previsão indisponível não contém dias presumidos. Nenhuma severidade meteorológica arbitrária foi criada.

| Campo real | Campo normalizado / regra |
| --- | --- |
| `nmMunicipio` | Município validado como Itajaí |
| `data` DD/MM/AAAA | `dias[].data` ISO; preserva dia de validade, não é emissão |
| `nmCondicao` | `condicao` e `descricao`, texto oficial sem interpretar palavras |
| `tempMin`, `tempMax` com °C | `temperatura_min_c`, `temperatura_max_c` |
| `mmChuva` com mm | `precipitacao_mm` |
| `dirVento` | `vento.direcao`, texto original |
| `velVentoMed` | `vento.velocidade_media_kmh` |
| `velVentoMax` | `vento.rajada_kmh`; o componente oficial apresenta esse campo como Rajada |
| `umidadeRel`, `umidadeRelMinMax` | Umidade relativa/mínima/máxima; `N/D` e `null-N/D` viram null por componente |
| `fenomeno1…4` | Quando presentes, descrição e código do ícone, campos usados no componente oficial; todos nulos na amostra real |
| Probabilidade, período intradiário | Não fornecidos neste JSON: null |
| Modelo / timestamp de emissão | Não fornecidos: null |

O campo `curTemp` é apresentado pelo cliente como condição atual, não mínima/máxima prevista, e não foi misturado ao contrato de previsão. `iconPrev` é identificador gráfico, não código de severidade; descrição oficial é preservada. Sem conversão de ícone em classificação.

Unidades são verificadas antes de converter números. Null, vazio e marcadores explícitos de ausência não viram zero. Datas inválidas/duplicadas, resposta vazia, unidade desconhecida ou município divergente são rejeitados. Descrições não são inseridas como HTML.

`previsao.coletado_em` corresponde à requisição da previsão, separado da consulta ao catálogo em `fontes.epagri.requisicoes`. `atualizado_em=null` porque a fonte não informa emissão; não foi preenchido com data HTTP, coleta, primeiro dia ou referência do SVG de outro produto. Timestamps explícitos continuam suportados pelo contrato, com offset preservado.

## Exemplo real normalizado

Horizonte observado: **01 a 05/10/2026 (cinco dias)**. Coleta final da previsão: `2026-10-01T18:20:53.085Z`. Modelo, UF e emissão: não informados no JSON.

| Data | Descrição oficial | Mín./máx. °C | Chuva mm |
| --- | --- | --- | --- |
| 01/10 | Encoberto com chuva | 15 / 16 | 6,4 |
| 02/10 | Nebulosidade variável e chuva isolada | 14 / 16 | 0,3 |
| 03/10 | Céu encoberto | 13 / 17 | 1,4 |
| 04/10 | Encoberto com chuva | 16 / 22 | 6,1 |
| 05/10 | Encoberto com chuva | 16 / 18 | 43,6 |

Em 01/10: direção ESE/NNW, vento médio 3 km/h, rajada 10 km/h. Umidade e probabilidade ausentes permanecem nulas. São valores oficiais desse produto, não observações atuais nem gatilhos de risco.

## Defesa Civil e falhas

Base `https://monitoramento.defesacivil.itajai.sc.gov.br`, rotas preservadas:

- `/api/v1/situacao-atual`: flag, texto e atualização; sem inferência por IA.
- `/api/v1/alertas/ativo`: complementar; data nula não representa Normalidade.
- `/monitoramento/rios?municipio_id=1`, `/monitoramento/chuvas?municipio_id=1`, `/monitoramento/barragens?municipio_id=1`: JSON `#app[data-page]`, usando parse5 + JSON.parse.

Limites e séries dinâmicos permanecem preservados. Sem regra global de staleness. Atraso explícito da fonte é preservado; qualidade ausente não é presumida válida.

Falha Epagri fica em `fontes.epagri` com motivo, URL, horário, HTTP status e resposta de erro limitada. A previsão fica `indisponivel`, dias vazios e nível JBS nulo; Defesa Civil continua atualizada. CLI retorna 1 por falha parcial depois de gravar os resultados válidos; em sucesso de todas as fontes retorna 0. Não há fallback CPTEC, INMET, regional ou mock.

## Arquivos e validação

Criados: `scripts/collectors/epagri.ts`, `tests/epagri.test.ts`, `tests/fixtures/epagri-itajai.json`, `tests/fixtures/epagri-municipio.json`.

Alterados: `src/domain/contracts.ts`, `scripts/collectors/sources.ts`, `pipeline.ts`, `collect.ts`, `tests/collectors.test.ts`, `public/data/status.json`, `package.json`, `package-lock.json`, `README.md`, `docs/fase-02.md`, `tests/fixtures/README.md`.

Removidos: `scripts/collectors/cptec.ts`, `src/domain/cptec.ts`, `tests/fixtures/cptec-documentacao.xml`, testes de integração/classificação exclusivos do CPTEC e dependência `fast-xml-parser`. Não há collector, pesquisa de API ou redundância INMET. Frontend e território não foram redesenhados/alterados.

Executados: consultas HTTP às URLs documentadas, `npm uninstall --save-dev fast-xml-parser --offline=false`, `npm run collect`, `npm run lint`, `npm run typecheck`, `node node_modules/vitest/vitest.mjs run`, `npm run build`. Instalação: zero vulnerabilidades. Fixtures derivam de respostas reais, sem dados pessoais. Variantes de erro/modelo regional são MOCK explícitos apenas em testes.

## Definition of Done — Fase 02.1

| Item | Resultado |
| --- | --- |
| CPTEC removido do caminho operacional | Sim |
| INMET não implementado | Sim |
| Mecanismo real Epagri identificado | Sim, API JSON da aplicação oficial |
| Coleta real Epagri executada | Sim, HTTP 200 |
| Previsão municipal Itajaí ou impossibilidade documentada | Sim, cinco dias municipais obtidos |
| Regional corretamente identificado | Sim na descoberta; não incorporado nem usado como municipal |
| Contrato meteorológico ajustado | Sim |
| Status atualizado | Sim |
| Falha da previsão não bloqueia Defesa Civil | Sim, testado |
| Nível JBS continua null | Sim |
| Build | Passou; Vite 6.4.3, 45 módulos, saída dist/ |
| Lint | Passou |
| Typecheck | Passou |
| Testes | 32 passaram |
| Documentação atualizada | Sim |

**Definition of Done da Fase 02.1 atingido**, com limitações de metadados explicitamente registradas abaixo. Verificação final: nenhuma referência operacional a CPTEC/INMET em src/, scripts/, status.json ou dependências; nomes aparecem somente em documentação da decisão e teste de ausência de chamadas.

## Limitações para decisão humana

Confirmar manutenção do serviço municipal anterior e esclarecer modelo, emissão e validade com a Epagri. Enquanto não informados, continuam nulos. A comparação com o produto WRF gráfico não autoriza atribuir seu modelo/datas ao JSON. A fonte não fornece UF explicitamente: validação usa nome e código oficial; eventual exigência de UF textual fornecida demandará esclarecimento com a fonte.

As decisões futuras de validade temporal, retenção e histerese permanecem fora desta correção. **Nenhum avanço para a Fase 03.**
