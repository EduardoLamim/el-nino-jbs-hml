# Integração Microsoft Teams — implementação HML

Data: 13/10/2026. Referências: [matriz oficial](integracao-teams-matriz-eventos.md) e [inspeção aprovada](integracao-teams-inspecao-hml.md).

> A [revisão final do provisionamento](integracao-teams-revisao-provisionamento.md) identificou bloqueadores no helper original de `ecf6060` e os corrigiu. Use a versão revisada e seu procedimento de recuperação. Desligamento em encerramento forçado não é garantido pelo finally; há janela limitada e intervenção administrativa descritas no parecer.

## Estado desta entrega

Código e testes locais implementados. **Migration e Edge ainda não aplicadas no HML; nenhuma mensagem real enviada.** A sessão de implementação não dispõe de `SUPABASE_ACCESS_TOKEN`; `gh` também não está instalado. Não confundir implementação local, aceite HTTP e confirmação visual no canal.

O solicitante confirmou que o Power Automate foi salvo com `string(item()?['content'])` dentro do loop de attachments e autenticação **Anyone**. Portanto o POST ao Teams leva somente Content-Type, sem Authorization. A URL é uma credencial de capacidade, armazenada exclusivamente como secret do backend. [Contrato Microsoft](https://learn.microsoft.com/en-gb/connectors/teams/#when-a-teams-webhook-request-is-received).

Autorizados: testes reais **sintéticos**, limitados, destacados como `[HML — TESTE]`; não autorizados: envio automático de eventos operacionais reais ou PRD.

## Implementação

- `teams-hml.yml`: workflow independente após término do operacional, inclusive conclusão com falha/cancelamento; entrada manual de recuperação. Somente repositório HML e main confiáveis, permissions read, grupo de concorrência próprio. Não altera o workflow operacional nem Cron. Permanece inativo sem `TEAMS_HML_ENABLED=true`.
- `scripts/teams/reconcile.ts`: valida snapshots com o gate existente, compara exclusivamente `nivel_jbs` consolidado, percorre commits intermediários em ordem e associa cada commit do bot à etapa de persistência bem-sucedida do workflow. A falha posterior de prepare/Pages não invalida persistência já comprovada. Sem executar motor, sem inferir transições intermediárias, sem aceitar alteração manual de snapshot automaticamente. Cursor divergente/histórico reescrito bloqueia somente o stream Git; Impacto e pendências continuam sendo tratados.
- Migration `202610130001_teams_notifications.sql`: schema privado, RLS e grants mínimos, três credenciais com hashes (ingestão, worker, administração), cursor transacional/CAS, referências processadas, baseline de identidades de Impacto, eventos, outbox, tentativas e auditoria. Nenhum trigger ou publicação Realtime. O dispatcher administrativo privado é inacessível a anon/authenticated; o wrapper público exige token dedicado por escopo.
- Impacto: leitura apenas de ID, tipo e horários da tabela privada; nenhuma exportação de responsável/observação. Anti-join encontra ativação e encerramento entre duas coletas, inclusive encerramento de Impacto iniciado antes do bootstrap. Baseline marca identidades já visíveis, evitando perder uma transação com commit tardio e timestamp anterior ao corte. Não escreve na tabela/projeção de Impacto.
- `teams-notifications`: Edge separada com credenciais de invocação/administração; usa a chave **pública** de projeto já existente (`JBS_SUPABASE_PUBLISHABLE_KEY`), nunca a credencial privada de Impacto. Não necessita service-role. Aceita apenas o projeto HML fixado no código. URLs do Teams limitadas a HTTPS e hosts Microsoft esperados; redirecionamentos recusados.
- Bootstrap é administrativo, explícito e silencioso. Ausência de cursor não cria referência automaticamente. Nível null interrompe a cadeia confiável sem gerar falsa transição na recuperação.

## Fila e entrega

Modos: `disabled` (padrão), `mock`, `synthetic_live`. **Não existe modo de envio operacional real nesta entrega.** O claim seleciona somente eventos `is_test=true`; eventos operacionais reconciliados ficam retidos. A habilitação futura exige autorização e alteração explícita, nunca decorre dos testes.

Um evento tem identidade persistente; transições ambientais diferentes no tempo usam commits diferentes; Impacto usa ID + abertura/encerramento. Reingestão não recria evento/outbox. Payload e hash são congelados antes da primeira tentativa e preservados em replay. Lote limitado, claim com lock/lease de 60s e fencing; eventos de teste não ultrapassam uma entrega anterior pendente/incerta/bloqueada. Estado `dismissed` permite descarte administrativo auditado, sem afirmar entrega.

Timeout HTTP: 10s. No máximo **cinco tentativas totais**, backoff mínimo de 10/20/40/80 minutos, respeitando Retry-After. 429 é reagendado; 400/401/403/404 e demais rejeições permanentes bloqueiam. Timeout, falha de rede sem prova de não envio, 5xx e queda após início do POST ficam `uncertain`; não são repetidos automaticamente. Falha anterior ao POST/lease vencida pode recuperar a mesma identidade. Após cinco tentativas, `dead`; replay não reinicia a contagem.

`accepted` significa HTTP 2xx, não confirmação no canal. `confirmed` exige inspeção visual e justificativa administrativa. Eventos, referências de baseline, payload, contadores e auditoria são preservados; detalhes de tentativas concluídas são removidos após 30 dias durante o claim ou manutenção administrativa. Nenhuma credencial, URL secreta, header de autorização ou corpo remoto arbitrário é registrado.

Eventos ambientais e de Impacto ficam separados nesta V1: não há causalidade/instante comum comprovado que permita fundi-los automaticamente. Cards explicitam as duas dimensões independentes e o caráter histórico/sintético, evitando afirmar que redução ambiental encerrou Impacto ou que Pages já publicou o snapshot. O horário desconhecido é identificado como tal, com horário de detecção separado.

A recuperação depende do próximo término operacional ou acionamento administrativo. Latência aceita: aproximadamente dez minutos **mais execução/fila**, também para Impacto, sem prazo máximo garantido. Não há listener persistente ou novo Cron. Notificação crítica quase imediata permanece evolução futura sujeita ao Comitê.

## Validação local

- Suíte completa: **432 testes passaram**, preservando os 392 preexistentes e adicionando inicialmente 40 da integração.
- Revisão final: **42 testes Teams passaram**, incluindo dois novos casos (commit tardio de Impacto; payload congelado e barreira de ordenação). Total esperado no CI: 434.
- PostgreSQL real em WASM/PGlite: migration, grants/RLS, baseline, CAS, deduplicação, Impacto, leases, limite/backoff, retenção e auditoria.
- Transporte mock: todas as 12 transições entre níveis, dois eventos de Impacto, envelope Adaptive Card, fuso BRT, ausência de claims sobre Pages, Any­one sem Authorization, 429/5xx/timeout/permanentes, ausência de chamadas externas em modo mock/desabilitado/evento real e autenticação por escopo.
- Lint, typecheck aplicação/Edge, build HML, Pages validate, data validate e actionlint passaram. Artefato com 27 arquivos; 11 datasets históricos íntegros. Aviso de bundle >500 kB preexistente, sem falha de build.
- Parsers PowerShell validaram os dois helpers. **Provisionamento remoto e execução real desses helpers ainda pendentes**, por falta de autenticação nesta sessão. Nenhuma regressão manual completa executada.

## Procedimento seguro de provisionamento e cinco testes reais

1. No projeto Supabase **ufeahglxwygvlugfsopi**, em Edge Functions → Secrets, salvar `TEAMS_WORKFLOW_URL_HML` com a URL do Workflow. Não inserir em arquivo, chat, frontend, GitHub variable ou repositório. Manter os demais secrets operacionais intactos. [Secrets Supabase](https://supabase.com/docs/guides/functions/secrets).
2. Se `gh` não estiver instalado, instalar a CLI oficial e autenticar por navegador:

   ```powershell
   winget install --id GitHub.cli --exact
   # Abrir um novo PowerShell após a instalação.
   gh auth login --hostname github.com --git-protocol https --web
   ```

   A conta deve poder gravar o secret e a variável **somente no repositório HML**. O helper transmite a credencial de despertar pelo stdin da CLI, nunca como argumento nem saída. A URL Teams nunca vai para GitHub.

3. No diretório do projeto, executar:

   ```powershell
   powershell -NoProfile -File .\scripts\teams\provision-hml.ps1 -SyntheticTests
   ```

   O helper pede o token administrativo Supabase por **entrada oculta**, somente para esse processo; restaura o ambiente ao sair e não grava o token. Usar permissão administrativa do projeto HML para database, Edge Functions e secrets. Não usa whoami nem perfil alternativo. O token não é configurado como secret da aplicação.

4. Antes de qualquer alteração, o helper verifica ferramentas/autenticação, projeto, baseline confiável e instalação anterior. Aplica **somente a migration Teams**, registra a migration, cria credenciais aleatórias distintas e hashes privados, publica **somente teams-notifications**, registra baseline silenciosa e executa cinco cenários mock com reingestão duplicada. Sem o switch `-SyntheticTests`, não habilita envio externo.
5. Com o switch, após mocks: janela de até 15 minutos, cinco mensagens no máximo (elevação com salto, redução, normalização, Impacto aberto e encerrado). Cada uma contém SIMULAÇÃO e `[HML — TESTE]`. Mesma identidade é reingerida para confirmar deduplicação. Falha interrompe a sequência, sem retry cego. Falhas/retentativas são provocadas somente nos testes automatizados de transporte mock, sem inundar o canal.
6. Ao terminar ou falhar em qualquer etapa mutável, tenta desabilitar envio diretamente no banco e no secret; confirma o estado do banco por leitura. Apenas se ambas as operações forem confirmadas habilita o workflow de **reconciliação**, nunca os envios operacionais. Guarda somente evidência sanitizada em `.codex_work/teams-hml-provision-<instante>-<id>.json` (ignorado no Git). Em instalação parcial, recuperação explícita `-RecoverSetup` exige schema idêntico e ausência de envio/lease, preserva baseline/eventos e não envia testes nem habilita reconciliação. Não pode ser combinada com `-SyntheticTests`.
7. Conferir os cinco cards no canal **Comitê El Niño → Alertas automáticos - El Niño** e o histórico do Flow. Aceitação HTTP não satisfaz essa confirmação. Informar apenas resultado/IDs da evidência, nunca URL/credencial. Se houver entrega incerta, verificar Flow/canal antes de replay.

O backend contém os tokens `TEAMS_DB_INGEST_TOKEN_HML`, `TEAMS_DB_WORKER_TOKEN_HML`, `TEAMS_DB_ADMIN_TOKEN_HML`, `TEAMS_WAKE_TOKEN_HML`, `TEAMS_ADMIN_TOKEN_HML` e `TEAMS_SYNTHETIC_LIVE_HML=false`. GitHub recebe apenas `TEAMS_WAKE_TOKEN_HML`, com escopo de ingestão/despertar; não autoriza criação sintética, habilitação ou replay. `TEAMS_HML_ENABLED=true` significa reconciliar, não enviar eventos reais.

## Administração posterior sem expor secrets da aplicação

O helper administrativo usa a Management API com entrada oculta do token, acesso ao dispatcher **privado** e saída sanitizada. Não concede privilégios públicos e não altera credenciais existentes.

```powershell
powershell -NoProfile -File .\scripts\teams\admin-hml.ps1 -Action report
powershell -NoProfile -File .\scripts\teams\admin-hml.ps1 -Action disable
# Após verificar visualmente uma entrega específica:
powershell -NoProfile -File .\scripts\teams\admin-hml.ps1 -Action resolve -DeliveryId '<id da entrega>' -Status confirmed -Reason 'Card conferido visualmente no canal HML em data/hora ...'
```

`resolve -Status dismissed` registra descarte sem afirmar postagem. `replay` exige DeliveryId/Reason, preserva identidade/contagem e não habilita envio por si só. Nunca usar replay como diagnóstico cego. Resultado em `.codex_work/teams-hml-admin-result.json`; o arquivo não contém URL/credenciais.

## Pendências para conclusão HML

- Provisionamento autenticado do banco/Edge/secrets e variável GitHub, usando o helper revisado.
- Cinco aceitações reais, confirmação visual no canal e registro auditado de cada resultado.
- Evidência de execução do workflow independente e recuperação no ambiente remoto.
- Envios operacionais reais continuam dependentes de **nova autorização**; não configurar PRD.
