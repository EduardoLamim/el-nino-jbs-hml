# Fase 09 — Homologação HML

**Resultado: homologada em HML, com os 40 critérios do DoD atendidos no escopo e nas condições de teste descritos abaixo.** Nenhum Impacto JBS de teste permaneceu ativo. Não houve implementação da Fase 10.

Homologação realizada em **04/10/2026**, com testes remotos iniciados às 04:04 UTC (01:04 Brasília) e conclusão das verificações às 16:26 UTC (13:26 Brasília). Os horários técnicos abaixo estão em UTC; a interface apresenta Brasília.

## Ambiente e versão

- Repositório: [EduardoLamim/el-nino-jbs-hml](https://github.com/EduardoLamim/el-nino-jbs-hml), branch `main`.
- Aplicação: [Pages HML](https://eduardolamim.github.io/el-nino-jbs-hml/).
- Commit de código homologado: `49923e310e7a37548c384dc940c186c2c0f7cd24` — consolidação das entregas aprovadas das Fases 06–08 e testes da Fase 09.
- Snapshot publicado ao fechar a verificação: `f9d60ba042a308e5161d92b3b1919491d20ccc5a`, gerado em `2026-10-04T16:23:58.508Z`.
- Supabase: exclusivamente o projeto HML já aprovado, `ufeahglxwygvlugfsopi`. Nenhuma migração, RPC, Edge Function, credencial ou política de acesso foi alterada.
- Referências: [Fase 08](fase-08-implementacao.md), [operação](operacao.md), [Fase 07.1](fase-07-1-implementacao.md).
- Evidências: [execuções, snapshots e Supabase](fase-09-evidencias.json), [browser remoto](fase-09-browser.json), [integridade por arquivo](fase-09-integridade.json).

## Pre-flight, segurança e envio

Antes do push, `main` local e remoto coincidiam em `88f6739aeaf4d1f137b7d5fd70c07061f559b06b`. Foram revisados diff, destino HML, arquivos candidatos, configuração do subpath, workflows e gates. Passaram testes, lint, typecheck da aplicação e da Edge, build Pages, validação de dados/artefato, actionlint e `git diff --check`.

A inspeção dos 139 arquivos candidatos não encontrou credenciais privadas. `.env`, `dist`, `node_modules`, `.codex_work` e temporários não foram enviados. O gate do bundle rejeita padrões privados; os únicos valores frontend esperados são URL Supabase e chave publicável. Literais falsos usados por testes de rejeição não são credenciais. PINs foram digitados pelo usuário diretamente no formulário HML, sem leitura, captura, persistência em arquivos ou inclusão neste relatório.

O commit `49923e3` foi enviado sem force. Os avanços posteriores da branch foram commits do workflow alterando exclusivamente `public/data/status.json`; sua ancestralidade foi conferida antes da sincronização local por fast-forward. Não houve divergência, rebase, reset ou sobrescrita de histórico.

## GitHub Actions, configuração e cron

Actions habilitado; workflows ativos na branch padrão `main`; Pages configurado com `build_type=workflow`, ambiente `github-pages` e permissões necessárias. Os dois Secrets públicos de build já existiam e foram preservados. O base path padrão `/el-nino-jbs-hml/` foi validado; não foi necessário criar `PAGES_BASE_PATH`.

Inicialmente `PAGES_DEPLOY_ENABLED` estava ausente. Os três primeiros deploys usaram `publish=true`; os dois ciclos agendados seguintes coletaram, validaram e persistiram, sem deploy, conforme a configuração então vigente. Para concluir a configuração HML, foi criada somente a variável não sensível **`PAGES_DEPLOY_ENABLED=true`**. O ciclo final foi disparado com **`publish=false`** e publicou com sucesso pela variável, comprovando o caminho usado pela publicação automática. Nenhum Secret foi alterado.

| Execução | Disparo | Resultado |
|---|---|---|
| [37175906151](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37175906151) | Push / CI | Sucesso: instalação, lint, 259 testes, dados, build, artefato e smoke browser |
| [37176021026](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37176021026) | Manual N, `publish=true` | Coleta, memória, persistência e deploy aprovados |
| [37177837917](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37177837917) | Manual N+1 | Sucesso; lê saída de N e publica novo snapshot |
| [37177839402](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37177839402) | Manual concorrente N+2 | Sucesso; aguarda execução anterior, lê a ponta atual e publica |
| [37195671539](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37195671539) | Schedule, 10:32:05 | Sucesso; coleta e persistência; deploy ainda desabilitado por configuração |
| [37213143044](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37213143044) | Schedule, 15:28:38 | Sucesso; coleta e persistência; deploy ainda desabilitado por configuração |
| [37216600262](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37216600262) | Manual, `publish=false`, variável habilitada | Sucesso até deploy, encerrado às 16:24:40 |

O schedule remoto `7,22,37,52 * * * *` está reconhecido e houve execuções efetivamente disparadas por `schedule`. **Isso não comprova nem promete pontualidade ou intervalo real de 15 minutos.** Os horários observados evidenciam atraso do agendador. O primeiro disparo agendado posterior à habilitação da variável não foi aguardado; seu caminho de publicação foi validado pelo ciclo manual com `publish=false`.

## Snapshot e continuidade da memória

| Snapshot | Commit | Geração |
|---|---|---|
| Anterior ao primeiro ciclo | `49923e3` | 03/10 23:46:19.245 |
| N | `79e78a0` | 04/10 04:06:31.775 |
| N+1 | `2887ab5` | 04/10 04:44:08.163 |
| N+2 | `2953ac1` | 04/10 04:45:05.085 |
| Agendado 1 | `32e4295` | 04/10 10:32:22.956 |
| Agendado 2 | `0c551cd` | 04/10 15:28:55.899 |
| Publicação automática habilitada | `f9d60ba` | 04/10 16:23:58.508 |

Todos os snapshots passaram pelo contrato e pelas invariantes de publicação: DC01–DC11, seis fontes, qualidade, proveniência e memória completa, com `motor.avaliado_em` igual à geração. O nível agregado permaneceu **Atenção**; mudanças nas medições, séries e horários são coleta real, não regressão. A qualidade parcialmente degradada foi preservada quando aplicável; sucesso de HTTP/coleta não transforma dado oficial atrasado em atualizado.

Evidência encadeada dos logs:

1. N+1 validou `2026-10-04T04:06:31.775Z` antes de coletar e persistiu `2887ab5`.
2. N+2 validou `2026-10-04T04:44:08.163Z` antes de coletar, embora seu evento tivesse sido criado com a mesma referência inicial de N+1, e persistiu `2953ac1`.
3. O código homologado passa o snapshot completo validado ao coletor/motor (`pipeline(undefined, anterior)`); a memória não é reiniciada entre processos.
4. Os commits intermediários alteraram somente o snapshot; o motor ficou intacto.

Na concorrência de workflows, N+1 preparou entre 04:43:52–04:44:34 e terminou o deploy às 04:44:48; N+2 só começou a preparação às 04:44:52. Ambas as solicitações, feitas com dois segundos de diferença, terminaram sem sobreposição nem cancelamento. Não se generaliza esse teste para garantia FIFO de filas do GitHub.

O JSON servido pelo Pages retornou HTTP 200, passou por `validarStatusPublicavel` e corresponde byte a byte ao snapshot `f9d60ba`, SHA-256 `1f992d665b9712e44bf342d6037f95045ce8b24b73d8db748126ca8d4d069032`. O comparativo completo e as memórias por DC constam em `fase-09-evidencias.json`.

As condições reais não foram manipuladas para forçar rebaixamento 3/3. A continuidade remota foi comprovada estruturalmente; o comportamento 3/3 continua coberto por testes determinísticos entre processos e pela suíte do motor.

## Pages, páginas, GIS, mobile e acessibilidade

Smoke em Microsoft Edge 154, no endereço HTTPS HML real, repetido ao final da regressão. Dashboard, Monitoramento (rios, chuva, previsão e barragens), Mapa e Plano de Ação passaram em navegação, acesso direto e refresh das rotas hash. Assets, CSS, chunks e GeoJSON funcionaram sob o subpath. Não houve 404 de recursos locais nem exceção JavaScript.

- **Dashboard:** Atenção, motivo da Defesa Civil, qualidade, resumo dos 11 rios, previsão Epagri, exposição 292/88 e chuva com a regra exclusiva de última 1h. Estações sem dado válido não são tratadas como sem chuva. Impacto preto e condição ambiental foram verificados no teste real.
- **Monitoramento:** 11 DC com níveis, estados, limites por estação, tendências e horários. DC01 apresentou limites 1,21/1,61/1,75 m, série de até 12h, mínimo/máximo e tabela acessível. Gaps e normalização X/3 são cobertos pelas fixtures; não foram inventados no dado real. A apresentação consome os estados calculados no snapshot, sem recalcular o motor no navegador.
- **Mapa:** OpenLayers, 35 bairros, 11 DC, exposição, seleção, zoom, pan, detalhes, histórico e 555 vias históricas. Histórico de 1983 e troca para 2008 carregaram. Dashboard não baixou o chunk do mapa nem dados históricos antecipadamente.
- **GIS real:** estilo, sprites e PBF cartográficos, além de tiles de ortoimagem, responderam e renderizaram a partir da origem Pages. Isso valida CORS no ambiente remoto. Referência aérea 2020 e avisos de contexto histórico permaneceram presentes. Respostas 404 de tiles municipais fora da cobertura e erros induzidos por interceptação estão separados dos recursos locais no JSON de evidência; não foram ocultados como console limpo.
- **Fallback:** interrupção exclusivamente no cliente das bases Aérea e Cartográfica manteve Simplificada, seleção DC01, camadas locais e barra de alerta. Falhas independentes de histórico/vias foram verificadas com mocks nos testes de UI, mantendo as demais camadas e seleção. Nenhum servidor público foi derrubado ou bloqueado.
- **Plano de Ação:** acesso, orientação vigente e consulta de níveis funcionaram; a suíte confirmou que consultar orientação não muda o estado operacional.
- **Mobile:** emulação touch de 390 e 320 px nas quatro páginas, sem overflow horizontal; controles do mapa e detalhes utilizáveis. Não foi utilizado dispositivo físico.
- **Acessibilidade:** smoke por teclado, controles HTML com labels, radios e checkboxes, formulário/erros textuais, nível identificado por texto além de cor. Em HML, Tab focou “Consultar valores da série” com `:focus-visible` e contorno sólido de aproximadamente 2,67 px; Enter abriu a tabela. Controles do mapa também foram acionados por teclado no smoke. Não equivale a auditoria WCAG completa ou teste com leitor de tela.

## Supabase, Impacto JBS e Realtime

Teste real em duas abas HML, com registro claramente identificado como **TESTE HML — Fase 09** nos campos responsável/observação. O PIN válido foi inserido somente pelo usuário no formulário.

| Etapa | Evidência e resultado |
|---|---|
| Estado inicial | Consulta pública confirmou inativo |
| Primeiro acionamento, ~04:49 | Edge confirmou; interface preta, tipo “Acesso operacional ao Terminal comprometido”, horário e condição ambiental Atenção; segunda aba atualizou |
| PIN inválido no encerramento | Uma tentativa controlada rejeitada com “PIN inválido ou origem não autorizada”; impacto permaneceu ativo |
| Primeiro encerramento, ~04:50 | Servidor confirmou; ambas as abas voltaram a inativo/Atenção |
| PIN inválido na ativação | Uma tentativa controlada rejeitada; nenhum impacto criado |
| Segundo acionamento, 04:51:54 | Registro TESTE/HML para concorrência; revisão pública 9, ativo |
| Ativação duplicada pela segunda aba | Formulário aberto anteriormente enviado com PIN válido; rejeitado com “O estado mudou ou já existe impacto ativo. Aguarde a reconciliação.”; somente o impacto existente permaneceu |
| Encerramento final, 04:54:29 | Confirmado pelo servidor; revisão pública 10, `ativo=false` |
| Realtime | Assinatura `SUBSCRIBED`; evento PostgreSQL `UPDATE`, commit 04:54:29.873, recebido 04:54:31.240, revisão 10, `ativo=false`; ambas as abas voltaram a inativo |
| Reconciliação | Segunda aba reconciliou o estado após conflito e encerramento; nova consulta/navegação às 13:25 Brasília confirmou “Nenhum impacto físico confirmado” |

O observador Realtime adicional foi estritamente de leitura pública, usando a mesma configuração publicável do site. Não acessou PIN, histórico privado ou dados individuais. Não se confundiu apenas atualização por polling com comprovação do Realtime: o evento público de alteração foi efetivamente registrado. Não houve brute force. Nenhum impacto de teste ficou ativo ao concluir.

## Failure testing e regressão

Foram adicionados **14 testes em `tests/phase09.test.ts`**, elevando a suíte a **259 testes em 18 arquivos**. Não foi encontrada necessidade de correção em código operacional.

| Grupo | Cenários e resultado |
|---|---|
| Fontes | Falha 503 individual de situação, alertas, rios, chuvas, barragens e Epagri, e de todas juntas: indisponibilidade/qualidade explícitas, sem zeros fabricados; estado anterior retido conforme contrato |
| Risco | DC01 em Alerta ou Emergência desaparece; Normalidade desaparece/stale: último estado conhecido preservado, com degradação. SEM DADO não vira Normalidade |
| Snapshot | Ausente, JSON corrompido, saída/schema inválido, timestamp não posterior e memória incompleta: abortam sem substituir snapshot válido, cobertos pelas suítes 08/09 |
| Build real isolado | Base path inválido faz `pages:build` sair com código 1; hashes de status e artefato anterior preservados |
| Persistência isolada | Dois clones de repositório temporário: push do escritor obsoleto rejeitado; snapshot mais novo preservado; branch HML não corrompida |
| Artefato | Base path incorreto, asset ausente, status inválido, dataset territorial/geométrico corrompido, arquivo extra e padrão de segredo: rejeitados pelo gate |
| GIS/UI | Falhas de bases no navegador remoto e histórico/vias em mocks locais: preservam mapa disponível, seleção e condição operacional |
| Supabase/UI | PIN inválido, concorrência e encerramento reais; testes existentes cobrem falha de rede, cache degradado, reconciliação e encerramento obsoleto por ID |

Regressão final local: `npm test` **259/259**, `npm run lint`, `npm run pages:build` (inclui `tsc --noEmit` e `typecheck:edge`), `npm run data:validate`, `npm run pages:validate` e actionlint **1.7.12**, todos aprovados. Actionlint foi executado com integrações shellcheck/pyflakes desabilitadas; a validação YAML/expressões do actionlint passou. O smoke remoto final passou. O ciclo remoto final repetiu instalação, lint, testes, typecheck/Edge, build, validações, persistência e deploy com o snapshot mais recente.

## Integridade e alterações

Comparação com o inventário capturado antes da Fase 09, representando a entrega local aprovada da Fase 08:

- **Alterado:** somente `public/data/status.json`, por coletas reais dos workflows autorizados, sem edição manual de telemetria.
- **Criados:** `tests/phase09.test.ts` e os quatro documentos/evidências `docs/fase-09-homologacao.md`, `docs/fase-09-evidencias.json`, `docs/fase-09-browser.json`, `docs/fase-09-integridade.json`.
- **Removidos:** nenhum.
- **Intactos:** motor, thresholds, histerese, coletores, schemas, frontend, Supabase/Edge/RPC, workflows aprovados, datasets territoriais e históricos, e demais arquivos do inventário. A lista individual com SHA-256 está em `fase-09-integridade.json`.

Alteração remota de configuração: variável `PAGES_DEPLOY_ENABLED=true`, necessária para publicação dos ciclos automáticos. Não houve refatoração, redesign, nova funcionalidade, mudança de acesso ou segredo. Scripts auxiliares, logs brutos e diretórios de testes ficaram em `.codex_work`, fora do Git e do artefato Pages.

## Definition of Done — resultado individual

| # | Critério | Resultado | Evidência |
|---|---|---|---|
| 1 | Pre-flight local | Aprovado | Gates locais e inspeção antes do push |
| 2 | Entrega no HML | Aprovado | Commit `49923e3` |
| 3 | Workflows reconhecidos | Aprovado | CI, manual e schedule executados |
| 4 | CI remoto | Aprovado | `37175906151` |
| 5 | Workflow operacional remoto | Aprovado | Quatro ciclos manuais e dois agendados |
| 6 | Snapshot remoto válido | Aprovado | Contrato, invariantes e hash do Pages |
| 7 | Memória entre execuções | Aprovado | N → N+1 → N+2 e logs de entrada |
| 8 | Concorrência do workflow | Aprovado | N+2 começa após deploy de N+1 |
| 9 | Pages HML publicado | Aprovado | Deploy `37216600262`, HTTP 200 |
| 10 | Dashboard | Aprovado | Smoke remoto e teste de impacto |
| 11 | Monitoramento | Aprovado | Quatro seções e detalhes DC01 |
| 12 | Mapa | Aprovado | OpenLayers e dados locais |
| 13 | Plano de Ação | Aprovado | Smoke remoto e suíte de UI |
| 14 | Aérea remota | Aprovado | Tiles/renderização na origem Pages |
| 15 | Cartográfica remota | Aprovado | Estilo/sprites/PBF/renderização |
| 16 | Simplificada | Aprovado | Base inicial e fallback duplo |
| 17 | Histórico | Aprovado | Carregamento e troca 1983/2008 |
| 18 | Vias históricas | Aprovado | 555 feições carregadas |
| 19 | Fallback cartográfico | Aprovado | Interceptação cliente; alerta preservado |
| 20 | Supabase conectado | Aprovado | Leitura pública e Edge HML |
| 21 | Ativar Impacto | Aprovado | Dois registros TESTE/HML confirmados |
| 22 | Realtime entre sessões | Aprovado | Duas abas e evento PostgreSQL registrado |
| 23 | Encerrar Impacto | Aprovado | Confirmação do servidor e retorno ambiental |
| 24 | Rejeitar PIN inválido | Aprovado | Rejeição ao ativar e encerrar |
| 25 | Concorrência do Impacto | Aprovado | Segunda ativação rejeitada e reconciliação |
| 26 | Nenhum teste ativo | Aprovado | Revisão 10 inativa e reconfirmação final |
| 27 | Falhas de fontes | Aprovado | Testes 503 individuais/conjuntos |
| 28 | SEM DADO ≠ Normalidade | Aprovado | Retenção Alerta/Emergência/stale |
| 29 | Preservar snapshot válido | Aprovado | Falhas estruturais e conflito isolado |
| 30 | Rejeitar artefato inválido/inseguro | Aprovado | Gates e fixtures de corrupção/segredo |
| 31 | Mobile 390 | Aprovado | Emulação remota nas quatro páginas |
| 32 | Mobile 320 | Aprovado | Emulação remota nas quatro páginas |
| 33 | Smoke de acessibilidade | Aprovado | Teclado, foco, labels, controles e mensagens |
| 34 | Suíte completa | Aprovado | 259 testes / 18 arquivos |
| 35 | Lint | Aprovado | Local e Actions |
| 36 | Typecheck | Aprovado | TypeScript da aplicação |
| 37 | Edge typecheck | Aprovado | Projeto TypeScript da Edge |
| 38 | Build Pages | Aprovado | Local e Actions, artefato validado |
| 39 | Actionlint | Aprovado | 1.7.12; limites informados acima |
| 40 | Ausência de regressão observada | Aprovado | Integridade, suíte e cadeia HML real |

## Limitações e encerramento

Não há pendência impeditiva dos 40 itens no escopo testado. A homologação é uma verificação pontual, não garantia de disponibilidade futura de fontes/GIS/GitHub/Supabase. Mobile foi emulado; acessibilidade foi smoke; o rebaixamento real 3/3 não foi forçado. Falhas destrutivas foram simuladas localmente, sem corromper HML. O cron apresentou atrasos e não deve ser tratado como relógio preciso. A publicação automática foi comprovada pelo caminho da variável; não foi aguardado novo evento schedule após habilitá-la.

**Fase 09 encerrada para validação do usuário. A Fase 10 não foi iniciada.**
