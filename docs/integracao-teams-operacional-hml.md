# Teams HML — preparação operacional

## Escopo e ativação

O envio operacional usa o mesmo reconciliador, outbox, worker e renderer homologado. O modo novo `operational` é controlado no banco privado; não depende de `TEAMS_SYNTHETIC_LIVE_HML` nem exige trocar qualquer secret. A instalação mantém `mode=disabled`. Não foi autorizado ativar envios nesta etapa.

A migration `202610140001_teams_operational.sql` modifica somente o schema privado de notificações. Não altera motor, histerese, coleta, snapshots, Impacto, Cron ou suas funções. O workflow independente existente continua acordando após a execução operacional. `TEAMS_HML_ENABLED=true` permite reconciliação; **não autoriza entrega** por si só.

## Admissão de eventos e histórico

A ativação exige administração, confirmação literal, justificativa, checkpoint reconciliado esperado e ausência de entregas leased/sending/uncertain. A transação registra horário do servidor e maior sequência da outbox em auditoria. Configurar genericamente `mode=operational` é recusado; apenas `activate_operational` pode criar essa autorização.

Um evento operacional precisa ser não sintético, ter sequência acima do corte e horário real da transição posterior à ativação. O horário precisa estar determinado, não ser futuro e ser coerente com a detecção. Níveis exigem referência em processed_snapshots; Impacto exige identidade e horário correspondentes no histórico privado e indicação de ação manual. A origem dos snapshots continua validada pelo reconciliador (commit do bot, arquivo exclusivo, persistência bem-sucedida no workflow operacional e CAS do cursor).

O corte duplo exclui tanto eventos já enfileirados quanto histórico reconciliado tardiamente. Horário ausente/antigo permanece registrado, mas não é enviado automaticamente. As duas entregas antigas não são apagadas, resolvidas ou incrementadas. Uma reativação cria novo corte: eventos do período desabilitado também não são disparados automaticamente. Uma futura decisão de comunicar histórico exige análise e autorização próprias.

A matriz permanece: todas as mudanças reais de nível (inclusive redução/normalização), confirmação e encerramento manuais de Impacto; nível igual e primeira baseline não geram notificações. Impacto permanece independente do nível ambiental. Não há novo motor.

## Concorrência, falhas e desativação

Claim e autorização imediatamente anterior ao POST são serializados com a configuração. O worker rejeita evento sintético no modo operacional e evento real nos modos sintéticos. Uma desativação invalida autorização de leases ainda não enviados. Entrega já autorizada e em trânsito pode concluir depois do desligamento: nenhum sistema consegue recolher um POST recebido pelo Teams. O relatório identifica in_flight e uncertain; aguardar término/inspecionar antes de declarar quiescência.

Permanecem cinco tentativas totais, backoff, Retry-After, payload congelado, identidade persistente, auditoria e bloqueio da ordem quando uma entrega elegível exige revisão. Timeout/resposta perdida/5xx permanecem incertos, sem reenvio cego. HTTP 429 permite retentativa limitada; falhas permanentes bloqueiam. A aceitação HTTP não comprova apresentação visual no canal. Não há exactly-once externo prometido.

## Procedimento após autorização expressa do solicitante

Pré-condições: migration instalada, Edge atualizada, health ready/webhook_valid, reconciliação funcionando e envios ainda desabilitados. Não executar os comandos de ativação antes da autorização.

Na raiz do projeto:

```powershell
.\scripts\teams\admin-hml.ps1 -Action report
```

Consultar `checkpoint` no arquivo sanitizado `.codex_work/teams-hml-admin-result.json`, confirmar estado/ausência de entregas em execução ou incertas e executar:

```powershell
.\scripts\teams\admin-hml.ps1 -Action enable-operational -ExpectedCommit '<checkpoint de 40 caracteres obtido no relatório>' -Reason 'Ativação operacional HML expressamente autorizada pelo solicitante'
```

O helper existente solicita `ATIVAR TEAMS HML` e o PAT Supabase por entrada oculta. Não usar URL de webhook ou token da Edge como PAT. Se o checkpoint mudar, a operação falha sem ativar: reler o relatório e revisar, sem repetição automática. Resultado incerto exige leitura de report/audit antes de qualquer nova tentativa. A ativação não envia mensagem por si mesma; o próximo ciclo do reconciliador avaliará apenas transições elegíveis.

```powershell
.\scripts\teams\admin-hml.ps1 -Action report
.\scripts\teams\admin-hml.ps1 -Action disable
.\scripts\teams\admin-hml.ps1 -Action report
```

`disable` usa administração direta independente da Edge, não altera secrets. Verificar `mode=disabled`, `live_until=null`, contadores in_flight/uncertain e health. `live_enabled` no health continua representando o gate sintético legado; `operational_enabled` é a indicação explícita dos envios reais.

## Atualização e recuperação

Aplicar apenas esta migration privada, atomicamente, registrando a versão no histórico de migrations na mesma transação; publicar apenas teams-notifications. A migration recusa modo habilitado ou entregas em execução. Não repetir uma aplicação cujo resultado seja incerto: inspecionar versão 202610140001, colunas operacional_since/operational_floor, função execute e modo antes de decidir. Não repetir provisionamento, bootstrap nem migrations anteriores.

Se o deploy falhar depois da migration, o banco continuará desabilitado. Corrigir/publicar somente a Edge; não reaplicar a migration. O renderer não foi alterado. Não é necessário teste sintético nem alteração do Workflow Power Automate.

## Validação local

106 testes Teams passaram (banco PostgreSQL em memória, transporte mock, autorização administrativa sem rede). Typecheck da aplicação e Edge, lint, build e parse PowerShell aprovados. Cobertura adicional: autorização explícita, corte de histórico já enfileirado/tardio, preservação das pendências, fontes reais, duplicidade, desativação durante lease, reativação, incerteza, separação sintético/operacional e HTTP 202/429/503. Nenhum teste envia ao Teams.

## Estado remoto conferido em 14/10/2026

- Migration 202610140001 instalada e registrada atomicamente pela Management API via CLI já autenticada.
- teams-notifications versão 8 ACTIVE; autenticação dedicada preservada, verify_jwt permanece false como antes.
- impacto-jbs versão 10 e trigger-monitoramento versão 9 inalteradas.
- health: ready=true, webhook_valid=true, mode=disabled, operational_enabled=false, live_enabled=false; live_until=null; operational_since=null.
- Fila: pending=2, in_flight=0, uncertain=0, eligible_pending=0. IDs a5776652-f3f2-4127-a918-a547b732c95c e 1964117f-ba40-4550-badb-e8ead81b6076 mantêm status, zero tentativas e updated_at idênticos à leitura anterior.
- Nenhuma ativação, mensagem, chamada de drain, alteração de secret ou mudança PRD nesta execução.
- Evidências sanitizadas locais: .codex_work/teams-operational-preflight.json e .codex_work/teams-operational-final.json.
- Única pendência funcional: autorização expressa para ativar notificações reais. Não é necessária nova campanha visual.
