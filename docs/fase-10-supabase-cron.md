# Fase 10 — Supabase Cron HML

## Estado desta rodada

**Correção mínima autorizada após a investigação:** removidas somente as duas linhas de `on.schedule` do workflow GitHub. Supabase permanece como único agendador automático, com frequência inalterada. `workflow_dispatch`, concurrency, `cancel-in-progress: false` e pipeline integral preservados. Esta decisão posterior substitui a condição anterior de manter o schedule até 12 ciclos. Não foi iniciada nova homologação, nem efetuado retry manual. O histórico abaixo descreve a implantação e a tentativa anterior.

**Ação manual para observabilidade:** a CLI precisa de perfil autenticado em conta que tenha acesso ao HML `ufeahglxwygvlugfsopi`. No terminal, executar `supabase login --profile el-nino-hml` e concluir o login no navegador com essa conta. Depois, `supabase whoami --profile el-nino-hml --output-format json` e `supabase projects list --profile el-nino-hml --output json`; confirmar que o projeto HML aparece. Não enviar token/secret pelo chat e não conceder acesso público aos schemas internos. O vínculo local já aponta para o HML e não precisa de novo `link`. A consulta administrativa posterior deve usar explicitamente esse perfil. Nenhum login, troca de perfil ou grant foi feito pelo agente nesta rodada.

05/10/2026: retomado após confirmação “Secret salvo”. **Implementação local validada; Edge e Cron HML ativos; homologação dos 12 ciclos em andamento.** Não declarar esta rodada concluída até o fechamento da matriz de ciclos e remoção do schedule GitHub.

Foram lidos `fase-10-finalizacao.md`, `fase-10-investigacao-atualizacao.md` e `operacao.md`. A consulta administrativa confirmou a presença de `GITHUB_DISPATCH_TOKEN`, sem ler seu valor. A pausa anterior foi resolvida pelo solicitante.

## Arquitetura aprovada para implementação

Supabase Cron HML → Edge `trigger-monitoramento` → GitHub REST `workflow_dispatch` → workflow existente → coleta/motor/validação → snapshot Git → Pages HML.

- Supabase HML: `ufeahglxwygvlugfsopi`.
- Repositório: `EduardoLamim/el-nino-jbs-hml`; branch: `main`.
- Workflow existente: `.github/workflows/deploy-pages.yml`, “Atualizar estado operacional e preparar Pages”.
- Endpoint GitHub: `POST https://api.github.com/repos/EduardoLamim/el-nino-jbs-hml/actions/workflows/deploy-pages.yml/dispatches`.
- Endpoint previsto da Edge: `https://ufeahglxwygvlugfsopi.supabase.co/functions/v1/trigger-monitoramento`; método POST.
- Job proposto: `monitoramento-hml-10min`; expressão `2,12,22,32,42,52 * * * *` (UTC).
- Sem migração de coletor/motor ou armazenamento ambiental no Supabase. Histerese continua 600s + 120s, com três leituras oficiais válidas consecutivas.

Plano original da transição: manter schedule até 12 ciclos. **Substituído pela autorização posterior registrada acima:** retirada antecipada somente do gatilho GitHub para eliminar a disputa comprovada pela fila pendente.

## Ação manual necessária — credencial GitHub

1. No GitHub, abrir Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token: <https://github.com/settings/personal-access-tokens/new>.
2. Nome sugerido: `monitoramento-hml-dispatch`. Resource owner: `EduardoLamim`. Definir expiração explícita adequada ao período HML e anotar a renovação fora do repositório.
3. Em Repository access, escolher **Only select repositories** e selecionar somente **el-nino-jbs-hml**.
4. Em Repository permissions, conceder somente **Actions: Read and write**. Metadata: Read-only é a permissão básica automática. Não adicionar Contents write, Administration ou permissões de conta.
5. Gerar o token e copiá-lo diretamente para o armazenamento server-side descrito abaixo. Não enviar pelo chat, terminal, screenshot ou arquivo do projeto.
6. Abrir <https://supabase.com/dashboard/project/ufeahglxwygvlugfsopi/functions/secrets> → Edge Functions → Secrets. Adicionar **GITHUB_DISPATCH_TOKEN**, colar o token no campo de valor e salvar.
7. Informar apenas que o secret foi salvo. Não informar o valor.

A permissão Actions write é o mínimo da API de dispatch; ela concede outras operações Actions dentro do repositório escolhido, não se restringe a um único workflow. A futura Edge deverá fixar destino, workflow e branch no servidor, sem aceitar alvos arbitrários do cliente. Não reutilizar a credencial ampla do Git Credential Manager.

## Autorização Cron → Edge, a implementar

Foi gerado no Vault um segredo criptográfico dedicado de 32 bytes, **MONITORAMENTO_CRON_SECRET**, instalado também nos secrets da Edge. O valor foi transferido por processo administrativo sem saída em console e o arquivo temporário ignorado foi removido. O Cron lê o Vault em tempo de execução. A Edge valida Bearer por comparação dos digests SHA-256 antes de qualquer dispatch. Ausência de configuração falha fechada. Não há CORS público nem autorização por publishable key. `verify_jwt=false` permite essa autenticação dedicada, validada pelo próprio handler; não significa aceitar chamada anônima.

O token GitHub fica somente nos secrets da Edge. Repo, workflow, branch e publish são fixos no servidor; corpo enviado pelo chamador não pode substituí-los. API versionada `2026-03-10` retorna run ID, utilizado na correlação. Timeout de 15s na Edge e 25s no pg_net; redirecionamentos rejeitados. Sem retry automático: falha de rede após aceitação é `dispatch_unconfirmed`, exigindo verificar Actions antes de repetir. Erros GitHub retornam 502 com status numérico, sem corpo remoto, headers ou segredos. Sucesso retorna 202, não significa publicação concluída.

O job `monitoramento-hml-10min` (jobid 1) chama a função privada `monitoramento_hml.trigger_dispatch()`. Ela enfileira POST à Edge e registra apenas request ID, horário esperado e horário solicitado em tabela com RLS, sem grants a anon/authenticated. Não há dados ambientais no banco. O SQL de ativação é separado da migration, impedindo disparo antes da instalação dos secrets. O histórico é consultado por `scripts/automation/inspect-hml-cron.sql`; nunca consultar headers/fila HTTP para gerar relatórios, pois contêm a autorização.

`cron.job_run_details` prova o SQL, e `net._http_response` prova a resposta HTTP; o segundo tem retenção temporária, por isso as evidências são exportadas durante a observação. Logs Edge usam somente correlação, horários, status e run ID. Os jobs Actions, commit e conteúdo Pages completam a cadeia. Falha SQL/HTTP/Edge/workflow deve ser investigada; não há novo serviço de alertas nesta rodada.

## Validação inicial

- Teste manual pelo caminho privado: request 1, `2026-10-05T17:43:52.480287Z`; Edge recebeu `17:43:53.200Z`; GitHub aceitou `17:43:54.943Z` com HTTP 200.
- [Workflow 37350606157](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37350606157): `workflow_dispatch`, sucesso, publicação concluída `17:45:09Z`. **Não conta como ciclo automático.**
- 319 testes em 25 arquivos: 302 anteriores preservados + 13 casos de Edge/orquestração + quatro de UI. Lint, typecheck, typecheck:edge, build Pages, data:validate, pages:validate e actionlint passaram. Actionlint foi executado sem os verificadores externos shellcheck/pyflakes, como no baseline.
- Smokes existentes com GIS real, três bases, nomes, fallback e mobile passaram. [28 cenários visuais locais](fase-10-visual/fechamento-local/checks.json) incluem medidas de alinhamento territorial desktop, ordem mobile, ausência da coleta global, chuva e proximidade da fonte de previsão.
- Quatro ajustes: indicadores e concentrações na mesma linha de grid desktop; remoção somente da coleta global em Monitoramento; título “Chuva — Estações” e retirada da legenda redundante; margem entre título Previsão e fonte reduzida. Dados e horários individuais intactos.
- [Cron e respostas Edge](fase-10-cron-evidencias/cron.json), [matriz legível](fase-10-cron-evidencias/ciclos.md) e [JSON integral dos ciclos](fase-10-cron-evidencias/cycles.json) são atualizados durante a homologação.
- Implementação `93d401487132efebeb7572d3d1d0faa25a24a43b`; [CI aprovado 37351873289](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37351873289). O ciclo automático das 18:02 UTC publicou os ajustes: [28 cenários remotos aprovados](fase-10-visual/fechamento-hml/checks.json), incluindo 390/320px. [Rejeição de chamadas públicas](fase-10-cron-evidencias/security.json), [isolamento SQL](fase-10-cron-evidencias/database-permissions.json), [integridade](fase-10-cron-evidencias/integrity.json) e [Impacto/Realtime somente leitura](fase-10-cron-evidencias/supabase-readonly.json) conferidos.

## Homologação pendente

**Aguardar 12 ciclos consecutivos comprovados na matriz.** Nenhum resultado simulado substitui execução automática real.

Registrar, para cada ciclo: horário previsto UTC, início real do Cron, chamada Edge, resposta GitHub, workflow/run ID e início, coleta, geração, commit, publicação e resultado. Conservar apenas identificadores e timestamps sem credenciais. Sucesso SQL de enfileiramento HTTP não basta para comprovar sucesso da Edge, dispatch ou publicação.

Implementação deverá tratar erros GitHub e timeouts explicitamente, sem retry cego que possa duplicar um dispatch já aceito. Investigar ciclos ausentes, grandes lacunas, duplicações, conflitos ou regressões antes de homologar. Consultar histórico Cron, resposta HTTP, logs sanitizados da Edge e jobs Actions.

Pendentes: completar os 12 ciclos; retirada do schedule GitHub; teste da configuração final sem schedule; fechamento dos relatórios com resultados reais. Se algum ciclo falhar, investigar antes de iniciar/promover uma sequência válida. A presença temporária do schedule anterior está expressamente autorizada para transição; não permanecerá como segundo agendador definitivo. O gate `npx tsx scripts/qa/validate-cron-evidence.ts` rejeitou corretamente o encerramento antecipado com apenas um ciclo; esse resultado negativo era esperado e não é falha do Cron.

Contingência atual: Actions → Atualizar estado operacional e preparar Pages → Run workflow → branch main; publicação conforme configuração HML existente. Se Supabase Cron falhar na homologação, documentar e parar. `cron-job.org` depende de autorização posterior. Nenhum PRD, GO-LIVE ou V2 está autorizado nesta rodada.

## Referências oficiais consultadas

- [GitHub — Create a workflow dispatch event e permissão Actions write](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event).
- [Supabase — Scheduling Edge Functions, pg_cron, pg_net e Vault](https://supabase.com/docs/guides/functions/schedule-functions).
