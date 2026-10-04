# Fase 08 — automação, GitHub Actions e preparação para Pages

**Implementação e validação local concluídas em 04/10/2026.** Workflows preparados, coleta real executada, artefato estático completo gerado e testado em subpath. Não foram feitos commit/push desta entrega, execução remota dos novos workflows, deploy ou alterações no Supabase. Ativação remota depende da entrega dos arquivos e configuração descrita em [operação](operacao.md); a aplicação não está sendo declarada homologada para produção. Fases 09 e 10 não foram iniciadas.

Referência preservada: [Fase 07.1 aprovada](fase-07-1-implementacao.md).

## Resultado implementado

O workflow operacional reutiliza `scripts/collectors/pipeline.ts` e o motor aprovado. A nova camada de automação valida o snapshot anterior, executa coleta/normalização/motor, valida a saída e substitui `public/data/status.json` atomicamente. Build e gates antecedem persistência no Git e upload. Nenhum coletor, regra de qualidade, threshold, histerese ou componente visual foi reescrito.

O snapshot completo é lido da ponta atual da branch padrão e persistido nela após validação, contendo a memória compacta `motor` necessária ao ciclo seguinte. Não usa cache ou artefato temporário como fonte da histerese. O único arquivo atualizado automaticamente é `public/data/status.json`; Git fornece versionamento/recuperação desse snapshot, sem novo banco, série ou tela de histórico operacional.

Histórico de inundação e vias permanecem locais, íntegros e separados da coleta operacional. `npm run map:collect` continua manual; não há schedule ou consulta desses FeatureServers a cada 15 minutos.

## Workflows e concorrência

| Workflow | Disparo | Entrega |
| --- | --- | --- |
| `ci.yml` — novo | Push `main`, pull request e `workflow_dispatch` | Lint, suíte, validação de dados, build de Pages/typecheck, validação do artefato, navegador e upload do pacote |
| `deploy-pages.yml` — atualizado | `schedule: 7,22,37,52 * * * *` e `workflow_dispatch` | Atualização operacional, gates, persistência, upload, deploy opcional e diagnóstico de fontes |

Frequência-alvo: **15 minutos**, em UTC, deslocada do início da hora. O serviço pode atrasar/omitir execuções; não há promessa de periodicidade exata. Execução manual permite `publish=true`; `PAGES_DEPLOY_ENABLED=true` habilita deploy recorrente. Por padrão, prepara sem publicar. A publicação automática antiga em cada push foi substituída por CI no push e pelo fluxo operacional, evitando concorrência entre pipelines de publicação.

Grupo `operational-pages`, `cancel-in-progress: false`, abrange todos os jobs do ciclo. Execuções antigas reexecutadas fazem checkout da ponta atual e coletam novamente. Push exclusivamente fast-forward; conflito com mudança de branch aborta, sem force ou rebase do snapshot. CI tem grupo próprio por ref e pode cancelar verificações obsoletas, pois não escreve estado nem publica.

Actions utilizadas: `checkout@v6`, `setup-node@v6`, `configure-pages@v5`, `upload-pages-artifact@v4`, `deploy-pages@v4`. Node.js 24; dependências instaladas por `npm ci` a partir do lockfile. `contents: write` fica somente no job que persiste o snapshot; Pages e OIDC somente no deploy. Não foi criado PAT nem segredo novo.

Os dois YAMLs passaram em **actionlint 1.7.12**, com checksum da distribuição oficial conferido. ShellCheck/Pyflakes não foram executados; o actionlint verificou sintaxe, estrutura e expressões do Actions. Referências: [workflows Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [concorrência](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), [schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) e [actionlint](https://github.com/rhysd/actionlint/releases/tag/v1.7.12).

## Validação e última versão válida

O gate aplica o schema aprovado e exige memória completa DC01–DC11, timestamp de geração consistente com avaliação do motor, inventário/URLs das seis fontes, metadados de requisições, diagnóstico de falhas, qualidade e coerência entre nível público e memória. Não recalcula leituras nem muda a classificação.

Snapshot anterior ausente/corrompido aborta a automação, evitando zerar continuidade silenciosamente. Saída inválida, não posterior à anterior ou alteração do arquivo por outro escritor também aborta. O temporário é validado antes de renomear. Falha de schema não substitui a versão válida.

Falha de fonte é diferente de falha estrutural: um snapshot **válido e degradado** é preparado/publicável conforme as regras anteriores. O job `source-diagnostics` marca a execução como falha depois das etapas de publicação quando alguma aquisição falhou. Assim, o painel pode mostrar degradação atual sem ocultar a falha no Actions. O `collect` original mantém seu exit code e comportamento; `automation:update` fornece sinal separado para a orquestração.

Se build ou validação falhar, o snapshot remoto não é substituído. Se upload/deploy falhar após o push, a nova memória validada permanece no Git para o ciclo seguinte, e o site anterior permanece publicado. Não há sucesso presumido: logs de preparação e deploy devem ser consultados separadamente.

Timeout HTTP de 20 segundos, limite de resposta de 8 MiB e política dos coletores existentes foram preservados. Não há retry infinito. Jobs: 12 minutos de CI/preparação, 10 de deploy e 1 de diagnóstico. Os logs informam fontes, resultados, timestamps, qualidade e etapas, sem despejar credenciais.

## Coleta real

Executada por `npm run automation:update`; saída gerada em **2026-10-03T23:46:19.245Z** (03/10/2026, 20:46:19 em Brasília).

| Fonte | Aquisição | Qualidade informada |
| --- | --- | --- |
| Situação oficial | Sucesso | Não informada |
| Alertas oficiais | Sucesso | Não informada |
| Rios | Sucesso | Atualizado |
| Chuvas | Sucesso | Atualizado |
| Barragens | Sucesso | Atrasado |
| Epagri/Ciram | Sucesso | Não informada |

Resultado público: **parcialmente degradado**, sem mascarar atraso ou ausência de metadados. Nível ambiental do snapshot: Atenção, calculado pelo motor existente. Leituras atuais substituíram as antigas apenas como resultado da coleta real; nenhuma condição foi editada manualmente. A memória anterior foi fornecida ao motor.

A histerese continua exigindo três leituras válidas consecutivas, intervalo oficial + 60 segundos, tratamento de duplicatas/lacunas e atraso permitindo escalada e bloqueando redução. Três leituras não significam três ciclos do schedule; séries oficiais podem preencher o intervalo entre execuções. Isso está coberto nos testes novos e nos testes anteriores do motor.

## Pages, configuração pública e artefato

`vite.config.ts` tem modo `pages`, base inferida do repositório e override `PAGES_BASE_PATH`. Subpath validado: **`/el-nino-jbs-hml/`**. Repositório `*.github.io` usa raiz; domínio próprio exige override `/`. Build comum mantém base relativa. Rotas hash existentes foram preservadas; acesso direto e refresh não exigem backend.

Variáveis frontend continuam exclusivamente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O workflow aceita Actions Variables e os Secrets públicos já previstos no workflow anterior. Preparação operacional exige o par público válido; CI pode validar estrutura sem conexão Supabase. Demais controles (`PAGES_BASE_PATH`, `PAGES_DEPLOY_ENABLED`, `REQUIRE_PUBLIC_CONFIG`) não são segredos e não criam configuração operacional no bundle.

PIN, credencial backend, service_role e senhas não são entradas do build. O gate rejeita variáveis `VITE_` extras/chaves incompatíveis e procura formatos conhecidos de credenciais privadas no artefato. Nenhum segredo foi encontrado nos **22 arquivos** gerados; `.env`, código de desenvolvimento, fixtures, scripts e arquivos administrativos não entram no pacote.

Conteúdo final de `dist/`: index, cinco assets JS/CSS, manifesto Vite, status, território, bairros, manifesto histórico e 11 GeoJSON. Tamanho total sem compactação: **3.560.594 bytes**. Todos os dados do artefato foram comparados byte a byte aos arquivos de entrada; históricos também passaram por SHA-256, schema, contagem e vértices. São preservadas 357 feições históricas e 555 feições de vias, sem nova coleta territorial.

Pacote local: `.codex_work/fase08/pages-static.zip`, **1.076.798 bytes**, 22 arquivos (inclui `.vite/manifest.json`). SHA-256:

```text
7c3b9ab4dc33e78d2eb23988befc983cd8a54aaab758408ea4ff4db31e16c4ea
```

O pacote representa o build técnico local, **sem variáveis Supabase locais configuradas**: nesse artefato, a interface informa condição JBS não confirmada. O workflow de publicação exige a configuração pública real antes de gerar o pacote publicável, preservando a integração aprovada. Não houve tentativa de alterar Impacto JBS remoto para testar esta entrega.

Build final: principal 331,96 kB (gzip 97,68 kB); mapa lazy 361,30 kB (gzip 106,27 kB); adaptador vetorial 203,63 kB (gzip 58,21 kB); CSS 13,16 + 5,35 kB. Sem alerta de chunk acima de 500 kB. `.gitattributes` fixa LF para dados por hash, evitando diferenças Windows/Linux.

## Testes e navegador

| Verificação | Resultado |
| --- | --- |
| Suíte completa Vitest | **245 testes passaram, 17 arquivos** |
| Testes anteriores | 223 passaram |
| Fase 08 | 22 novos passaram |
| `npm run lint` | Passou |
| `npm run typecheck` + Edge Function | Passaram |
| `npm run pages:build` | Passou |
| `npm run data:validate` / `pages:validate` | Passaram |
| actionlint 1.7.12 | Dois workflows aprovados |
| Build servido sob subpath | 7 verificações integradas passaram em Edge 154.0.4258.53 |

A coleta real revelou dependência de três expectativas antigas dos valores mutáveis do arquivo público. A correção foi fixar a entrada dos testes de UI em `tests/fixtures/status-operacional.json`, snapshot aprovado já versionado, mantendo suas expectativas. Não se alteraram motor ou UI para acomodar os testes. A fixture não entra no build e não é fallback operacional.

Falhas simuladas/testadas: fonte totalmente indisponível com retenção, schema inválido, timestamp inválido, inventário incompleto, memória ausente, nível inconsistente, saída antiga, corrupção anterior, erro fatal de coleta, alteração concorrente do arquivo, subpath errado, chunk ausente, geometria corrompida, `.env` extra, credencial privada e status inválido no artefato. Continuidade da contagem, terceira leitura, atraso e lacuna temporal também foram exercitados.

O smoke test persistido em `scripts/automation/smoke.ts` verificou as quatro páginas, seções de Monitoramento, acesso direto/refresh, formulário Impacto acessível sem envio, lazy chunks, 35 bairros, 11 DC, histórico/vias sob subpath e ausência de consulta runtime ao FeatureServer. Aérea e Cartográfica reais retornaram estilo/sprites/PBF/tiles e renderizaram no build Pages. Fontes permanecem locais CSS conforme adaptação aprovada na Fase 07.1.

Em 390 e 320 px, quatro páginas ficaram sem overflow horizontal; mapa manteve controles, seleção, alerta e camadas locais mesmo com os dois basemaps bloqueados. Capturas foram inspecionadas. Zero erros de requests locais e zero exceções JavaScript. O console registrou 12 mensagens de rede: duas respostas 404 de tiles externos e falhas GIS provocadas para testar fallback, sem quebrar o mapa. Não confundir esses eventos com 404 de assets do Pages.

Evidência: [fase-08-browser.json](fase-08-browser.json). Capturas locais em `.codex_work/fase08/`. A emulação de viewport/toque não equivale a homologação em todos os aparelhos. O CI usa o mesmo smoke sem depender do GIS real; a validação real foi ativada localmente com `CHECK_GIS=true`.

## Arquivos

Criados:

- `.github/workflows/ci.yml` e `.gitattributes`.
- `scripts/automation/status.ts`, `update.ts`, `pages-config.ts`, `validate.ts`, `smoke.ts`.
- `tests/phase08.test.ts` e `tests/fixtures/status-operacional.json`.
- `docs/operacao.md`, `docs/fase-08-implementacao.md`, `docs/fase-08-browser.json`, `docs/fase-08-integridade.json`.

Alterados nesta fase:

- `.github/workflows/deploy-pages.yml`: coleta/schedule, concorrência, gates, persistência e deploy opcional.
- `package.json` e `package-lock.json`: comandos de automação/Pages e Playwright **1.62.1** como dependência de desenvolvimento (duas dependências instaladas contando `playwright-core`; nenhuma dependência runtime nova).
- `vite.config.ts`: modo Pages, validação do ambiente e manifesto de build.
- `index.html`: favicon vazio explícito para evitar requisição implícita à raiz do domínio; sem redesign.
- `.env.example`, `README.md`, `tests/fixtures/README.md`: operação e proveniência atualizadas.
- `public/data/status.json`: coleta operacional real validada.
- `tests/phase06.test.tsx`, `phase07.test.tsx`, `phase071-engine.test.ts`, `phase071-ui.test.tsx`: leitura da fixture estável em lugar do snapshot público mutável.

Artefatos locais de teste/empacotamento ficam em `.codex_work/`, já ignorado pelo Git, e `dist/`. Não fazem parte dos scripts de produção. Nenhum arquivo anterior foi removido.

## Integridade e regressão

Snapshot realizado no início da Fase 08 em `src`, `scripts`, `supabase`, `public` e `tests`: **98 arquivos anteriores intactos; seis alterados; sete criados; zero removidos**. Hashes e inventário em [fase-08-integridade.json](fase-08-integridade.json). Arquivos de configuração, workflows e documentos ficam fora desse inventário e estão listados acima. O diff Git contém também alterações preexistentes das fases anteriores; elas não foram revertidas ou atribuídas à Fase 08.

Todo `src/` anterior permaneceu byte a byte intacto: motor, gatilhos, histerese, qualidade, Impacto JBS, Realtime/reconciliação, Dashboard, Monitoramento, Mapa e Plano de Ação. Também ficaram intactos Supabase, Edge Function, migrations, PIN server-side, coletores Epagri/rios/chuvas/barragens, bairros, território, agregados, geometrias históricas e lógica Aérea/Cartográfica/Simplificada/fallback. Não foi encontrada regressão operacional nos testes executados.

## Definition of Done

| # | Critério | Resultado e evidência |
| ---: | --- | --- |
| 1 | Workflow operacional | Implementado em `deploy-pages.yml` |
| 2 | Execução periódica | Schedule de 15 minutos configurado no arquivo; ativação remota pendente da entrega |
| 3 | Execução manual | `workflow_dispatch`, com publicação opcional |
| 4 | Concorrência controlada | Grupo único, execução ativa não cancelada e push fast-forward |
| 5 | Validação pré-publicação | Schema e invariantes; saída atômica; gate do artefato |
| 6 | Sem Normalidade artificial | Falha simulada retém risco e dados ausentes; regressão do motor passa |
| 7 | Continuidade da histerese | Snapshot completo persistido; testes entre arquivos e terceira leitura |
| 8 | Pages sob subpath | Build e navegador em `/el-nino-jbs-hml/` |
| 9 | Assets locais | Zero requests locais 404/falhos |
| 10 | Chunks lazy | Mapa/adaptador sob demanda; manifesto e navegador |
| 11 | Dados territoriais | Integridade local/artefato; 35 bairros e agregados preservados |
| 12 | OpenLayers | Canvas e seleção verificados no build |
| 13 | Aérea | Tiles reais e renderização verificados |
| 14 | Cartográfica | Estilo/sprites/PBF reais e renderização verificados |
| 15 | Simplificada | Funcional com GIS bloqueado |
| 16 | Fallback | Falha das duas bases preserva mapa/seleção/alerta |
| 17 | Histórico | Arquivo local, lazy loading e referência verificados |
| 18 | Vias | 555 feições locais carregadas sob subpath |
| 19 | Impacto JBS | Código intacto, testes de banco/Edge/store/UI passam; configuração real exigida para deploy, sem escrita remota nesta fase |
| 20 | Ausência de segredos | Gate público e scanner passaram; 22 arquivos sem credenciais privadas encontradas |
| 21 | Artefato completo | `dist/` validado e ZIP conferido com 22 arquivos |
| 22 | Navegação completa | Quatro páginas, acesso direto e refresh verificados |
| 23 | Mobile 390/320 | Sem overflow nas páginas exercitadas; mapa e controles funcionais |
| 24 | Testes novos | 22/22 passaram |
| 25 | Testes anteriores | 223/223 passaram |
| 26 | Lint | Passou |
| 27 | Typecheck | Aplicação e Edge Function passaram |
| 28 | Build | Pages passou |
| 29 | Documentação | README atualizado e guia único de operação/recuperação |
| 30 | Regressão operacional | Nenhuma encontrada; 245 testes e integridade do código operacional |

## Pendências e encerramento

Sem pendência de implementação local identificada. **Ainda não foi validada a execução dos novos workflows nos runners do repositório nem o deploy remoto.** Para ativar, entregar os arquivos completos, conferir permissões/proteções da branch, configurar as duas variáveis públicas e Pages, executar manualmente e revisar os logs. Essas etapas não foram declaradas realizadas.

O artefato local demonstra a preparação técnica e não substitui um build configurado com a integração Supabase pública real. A origem CORS e a disponibilidade remota não foram modificadas. Aérea/Cartográfica continuam sujeitas à disponibilidade e cobertura municipal. A homologação final de falhas/HML pertence à Fase 09 e o refinamento visual à Fase 10. Trabalho encerrado na Fase 08, aguardando validação.
