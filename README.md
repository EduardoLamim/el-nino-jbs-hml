# Monitoramento El Niño — JBS Terminais

**Fase 05 — Impacto JBS manual:** implementação local pronta, com Supabase, histórico privado, Edge Function, Realtime e reconciliação a cada 60 segundos. Deploy e homologação HML pendentes. Consulte [relatório, segurança, testes e instruções HML](docs/fase-05.md). O motor ambiental permanece independente. As descrições de encerramento das fases abaixo registram o histórico anterior.

Base do painel de apoio à decisão do Comitê El Niño em Itajaí/SC. **Fase 03: motor do Nível de Alerta JBS, histerese, retenção e qualidade.** Epagri/Ciram continua sendo a única fonte de previsão meteorológica da V1. CPTEC foi removido; INMET está fora do escopo.

A coleta real obtém Defesa Civil e previsão municipal Epagri. O motor calcula a maior severidade efetiva entre a situação oficial e DC01–DC11. O JSON é um retrato datado; a execução continua manual. Algoritmo, decisões, resultado real e Definition of Done: [docs/fase-03.md](docs/fase-03.md).

## Executar

Node.js 22.12+ e npm:

```sh
npm ci
npm run collect
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck
npm test
```

`collect` roda em Node, independentemente do frontend. Valida cada fonte, agrega, valida o contrato completo e grava `public/data/status.json` por temporário e renomeação. Timeout de 20 segundos, limite de 8 MiB e diagnóstico por requisição. Falha parcial retorna código 1, após gravar os dados válidos das demais fontes; todas as consultas bem-sucedidas retornam 0. Avisos sobre metadados ausentes não são falhas HTTP.

Cada execução lê o `status.json` anterior antes de adquirir novos dados. O campo `motor` preserva apenas estado efetivo, última condição válida, timestamps e contagem de normalização; os dados brutos/contextuais continuam sendo da coleta atual. Em falha das fontes principais, a memória é mantida como stale. JSON anterior inválido gera diagnóstico e cálculo somente com dados atuais; erro de leitura diferente de arquivo ausente aborta a execução. Em indisponibilidade Epagri, a previsão fica indisponível, com dias vazios e sem suposição de ausência de chuva.

No Windows, se a renomeação falhar com EPERM, o arquivo anterior é preservado; encerrar processos locais que mantenham o arquivo aberto e repetir a coleta. Não há fallback de escrita parcial.

## Arquitetura

**Defesa Civil + Epagri/Ciram → collectors Node → normalização → motor puro + estado anterior → validação Zod → status.json → frontend React.** Nenhum componente consulta fonte externa ou calcula risco.

- `src/domain/`: schemas, classificação dinâmica, histerese e agregação global determinística.
- `scripts/collectors/`: URLs verificadas, HTTP, extração estruturada, parsers e pipeline.
- `src/services/`, `hooks/`: leitura validada dos JSONs locais e estado de carregamento.
- `src/components/`, `pages/`, `utils/`: navegação e quatro placeholders; não calculam risco.
- `tests/fixtures/`: recortes reais públicos para testes offline; nunca fallback em produção.
- `supabase/`: migration e Edge Function exclusivas do Impacto JBS manual; configuração HML em `docs/fase-05.md`.
- `scripts/territorial/`, `scripts/validation/`, `.github/workflows/`: reservados.

`status.json` contém nível calculado, todos os gatilhos, memória compacta, situação, rios, chuva, barragens, previsão e relatório de fontes. `territorio.json` guarda contexto estável e agregados de colaboradores, sem participação no motor. Build em `dist/`, base relativa e navegação hash; não houve publicação nem redesenho. O placeholder exibe somente a validação técnica de nível, qualidade e gatilhos.

## Fontes e qualidade

Defesa Civil: Situação Atual e alertas complementares via API; rios/chuvas/barragens pelo JSON `data-page` das páginas oficiais. Epagri: catálogo municipal e `prevMuniDia?cdCidade=4208203`, descobertos no bundle da aplicação oficial. Detalhes e evidências em [docs/fase-02.md](docs/fase-02.md).

Previsão municipal validada por nome Itajaí e código 4208203 no catálogo e resposta. O JSON não fornece UF, modelo ou timestamp de emissão: permanecem `null`. UF divergente, se fornecida, é rejeitada. O modelo WRF de outro produto gráfico não é atribuído ao JSON. Não há fallback regional silencioso nem classificação arbitrária de condições.

`coletado_em` é consulta; timestamps internos são da fonte; `status.atualizado_em` é geração do arquivo. A data de validade de cada previsão não é sua data de emissão. Offsets existentes são preservados. Apresentação futura: America/Sao_Paulo.

Qualidade `atual` da Defesa Civil vira `atualizado`; atraso/indisponibilidade são preservados. Qualidade não informada permanece `null`. Sem regra global arbitrária de staleness; sucesso HTTP não comprova atualidade meteorológica. Qualidade e risco são independentes.

## Regras e privacidade

Ordem: normalidade (verde) < atenção (amarelo) < alerta (laranja) < emergência (vermelho). O nível automático é a maior severidade efetiva entre Situação Atual e DC01–DC11, incluindo condições conhecidas retidas em falhas. Os limites hidrológicos são sempre da fonte. Sem dado não significa Normalidade: sem dados ou memória confiável, nível `null`.

Previsão Epagri, chuva, barragens, alertas complementares, históricos de inundação/vias e quantidade de colaboradores não alteram o nível. `alertas/ativo.data=null` não sobrescreve Situação Atual. Texto oficial não é interpretado por IA.

Histerese hidrológica: elevação imediata, inclusive salto; redução de um nível após três novas leituras válidas consecutivas abaixo do limite vigente. Amostra sem qualidade individual é elegível quando possui nível finito e timestamp confiável. Duplicatas não avançam; inválidas/lacunas/retorno ao limite reiniciam. Conforme decisão do usuário, qualidade oficial `atrasado` permite escalada e impede queda; a consecutividade admite o intervalo oficial mais 60 segundos. A flag da Situação Atual muda diretamente, sem histerese. Impacto JBS permanece somente interface independente preexistente.

Somente agregados de colaboradores: 380 total, 292 em Itajaí, 88 em outros municípios. Sem nomes, matrículas, cargos, CEPs ou endereços individuais. Nomes públicos de estações não são endereços de colaboradores. Zero significa nenhum; null significa não informado. Comportas nulas nunca viram zero. Relações territoriais exigem validação, sem inferência por histórico.

## Pendências futuras

**Atualização Fase 04:** base territorial estática e agregados JBS implementados; ver [documentação e Definition of Done](docs/fase-04.md). A coleção municipal contém 35 unidades e duas localidades JBS separadas; 380 colaboradores totais, 292 em Itajaí e 88 fora. Histórico/HAND são contexto, sem relação com condição atual. Regeneração: `npm run territory:prepare`, validação geométrica descrita na documentação e `npm run territory:generate`. Mapa/frontend territorial e Fase 05 permanecem fora do escopo. O parágrafo seguinte registra o encerramento anterior da Fase 03.

Os metadados ausentes da Epagri e a ausência de validade temporal na situação oficial continuam explícitos; nenhum prazo arbitrário foi criado. Limites ausentes ou inconsistentes impedem nova classificação e preservam a memória como stale. GIS, mapa, Supabase, Impacto JBS, Actions e identidade visual final continuam fora desta entrega. **Trabalho encerrado ao final da Fase 03.**
