# Revisão final do provisionamento Teams HML

Revisão de `ecf60608178d7466ce204e929205d9afa8f3f7a1`, em 13/10/2026. Inspeção de código/documentação e testes locais; **nenhuma migration, deploy, provisionamento, alteração de secrets ou mensagem remota executada** nesta revisão. Não houve push para evitar acionamentos automáticos.

## Parecer

**NO-GO para o helper original de ecf6060.** Foram encontrados bloqueadores de recuperação e verificação de desligamento. As correções desta revisão permitem **GO técnico condicionado para instalação inicial no HML**, sujeito aos gates administrativos e de configuração efetiva descritos abaixo. Não é declaração de que permissões, Management API, gateway JWT ou entrega real já foram validados remotamente.

Não executar a versão antiga do helper. Não executar duas instâncias do provisionamento/recuperação em paralelo. Se já houver uma instalação diferente da migration revisada, o helper interrompe e exige análise específica; não tenta alterar um schema desconhecido.

## Achados e correções

| Área | Resultado da revisão de ecf6060 | Correção / decisão |
|---|---|---|
| Migration | DDL e histórico já estavam no mesmo BEGIN/COMMIT, mas faltava gate do histórico e limite de espera; requisição em lote levava parameters vazio desnecessário. | Confere colunas necessárias do histórico; lote sem parâmetros, lock_timeout 2s, statement_timeout 25s e advisory lock exclusivo de Teams. DDL + registro continuam atômicos. Teste PostgreSQL injeta falha no registro e comprova rollback completo. |
| Credenciais | Três INSERTs independentes podiam deixar hashes parciais; perda das chaves aleatórias em memória tornava a repetição impossível pelo helper. | Grava os três hashes e a auditoria em uma operação atômica. Recuperação explícita rota somente credenciais Teams, sob envio desabilitado; preserva eventos, tentativas e baseline. |
| Falhas precoces | O finally original começava depois do deploy/baseline; falhas anteriores escapavam do desligamento/relatório. | Todas as etapas mutáveis são cobertas por tentativa de desligamento e evidência sanitizada. Os relatórios têm nome único e não sobrescrevem a evidência anterior. |
| JWT e configuração | verify_jwt=false estava correto no config.toml, mas o helper não verificava a configuração efetiva nem a dependência da chave pública. | Deploy nomeia somente teams-notifications e passa --no-verify-jwt; GET administrativo exige ACTIVE e verify_jwt=false. Gate de presença da chave pública e health autenticado validam RPCs dos três escopos; testa também a credencial wake sem consumir fila. |
| Secrets / prontidão | Um nome de webhook existente não comprova URL válida; configuração de live era alterada sem conferência no runtime. | Health retorna somente booleanos/estado, nunca URL. Confere host HTTPS permitido, disponibilidade das credenciais e modo; exige live_enabled=true no runtime antes de abrir a janela real. A Edge lê configuração a cada requisição. |
| Desligamento | Dependia da Edge que poderia estar indisponível; sucesso era inferido somente das respostas de escrita. | Desabilita via dispatcher privado pela Management API, independente da Edge/JWT/tokens de aplicação, e relê mode=disabled/live_until=null. Tenta também o secret false; informa separadamente cada resultado. Não habilita reconciliação se qualquer confirmação falhar. |

### 1. Aplicação da migration e recuperação

A Management API documenta POST `/v1/projects/{ref}/database/query`, com query e parâmetros opcionais. O lote DDL é enviado sem parâmetros, com transação explícita e histórico registrado junto. A atomicidade foi comprovada em PostgreSQL/PGlite; **compatibilidade efetiva/permissões do endpoint no HML não foram exercitadas nesta revisão**. [Referência oficial](https://supabase.com/docs/reference/api/v1-run-a-query).

Em falha de SQL, o lote não deve deixar metade do schema. Em timeout/resposta perdida, o resultado é desconhecido: consultar schema e histórico antes de qualquer repetição. Não usar db push genérico, não apagar o schema e não remover registros de migration para tentar novamente.

Pré-requisitos: roles anon/authenticated já existentes; migration de Impacto instalada; histórico `supabase_migrations.schema_migrations` com version/name/statements; identidade administrativa com acesso de leitura/escrita ao banco e histórico. O helper não cria infraestrutura administrativa ausente nem amplia privilégios públicos.

Procedimento após interrupção:

1. Encerrar a instância anterior do helper e manter `TEAMS_HML_ENABLED` ausente/false. Inspecionar a última evidência `.codex_work/teams-hml-provision-*.json`.
2. Se o schema não existe e a migration não foi registrada, corrigir a causa do preflight/SQL e fazer instalação inicial. Se há schema, não repetir instalação inicial.
3. Se há schema, usar `admin-hml.ps1 -Action disable`, depois `-Action report`. Disable opera diretamente no banco e converte leases **já expiradas** em recuperação/incerto com claim desabilitado; não envia nada. Aguardar requisições/leases ainda em curso terminarem. Entregas incertas exigem inspeção do Flow/canal antes de confirmação, descarte ou replay.
4. Com schema exato desta revisão, nenhuma lease ativa e modo desabilitado, executar `provision-hml.ps1 -RecoverSetup`. O helper compara o hash da migration registrada (normalizando CRLF), repara as credenciais Teams/secret GitHub, publica somente a Edge Teams, valida autenticação e preserva baseline existente. Se a inicialização anterior não foi confirmada, consulta o checkpoint antes de decidir pelo bootstrap.
5. **RecoverSetup é incompatível com SyntheticTests**: não cria/reenvia mensagens, não apaga fila e não habilita reconciliação automaticamente. Novos testes após recuperação exigem procedimento administrativo específico, jamais repetição cega da campanha anterior.

Falha em secrets/deploy/health/baseline deixa instalação recuperável por esse caminho. Hash divergente, histórico incompleto, workflow já habilitado ou envio/lease ativa impedem recuperação automática. Nesse caso o parecer é NO-GO até inspeção administrativa.

### 2. Configuração e permissões da Edge

`verify_jwt=false` é necessário porque a credencial Bearer da aplicação é um token aleatório próprio, não um JWT Supabase. Isso **não torna a Edge anônima**: o handler exige credencial dedicada de wake/admin e restringe ações; as RPCs exigem seus tokens por escopo. O endpoint health é exclusivo do admin e não altera a fila. [Configuração por função](https://supabase.com/docs/guides/functions/function-configuration).

Supabase: acesso administrativo HML de database/history, leitura/escrita de Edge Functions e secrets. GitHub: leitura de variables e escrita de secrets/variables no repositório HML. A chave `JBS_SUPABASE_PUBLISHABLE_KEY` é pública e somente reutilizada para acesso ao gateway do mesmo projeto; nenhum PIN/token privado de Impacto é utilizado. Não há service-role no worker.

Alterações de secrets ficam restritas aos nomes TEAMS; deploy passa o nome de uma única função. Configs, código, RPC e secrets de Impacto/trigger-monitoramento permanecem intactos. O preflight verifica requisitos conhecidos; não é possível provar todas as permissões de escrita apenas com leitura — falha durante a primeira operação administrativa deve interromper e acionar o procedimento de recuperação.

### 3. Desligamento: garantias e limites

- Em saída normal ou exceção capturada: tenta banco e secret, sem depender da Edge. Banco é relido; resposta perdida de um secret não é apresentada como confirmação. As duas operações usam a mesma Management API, portanto uma indisponibilidade desse serviço pode afetar ambas.
- Em encerramento forçado, queda de energia ou perda de conectividade: finally pode não executar. A janela no banco, calculada a partir do relógio do banco (não do computador do operador), bloqueia novos claims e autorização de POST depois de até 15 minutos, inclusive uma lease obtida antes da expiração. Esse comportamento tem teste de banco específico.
- Uma requisição já autorizada/iniciada pode terminar depois do comando de desligamento. HTTP tem timeout de 10s; uma mensagem aceita pode ser publicada pelo Power Automate mais tarde. Não há cancelamento/retração garantido de mensagens já aceitas.
- Desligamento incompleto exige `admin-hml.ps1 -Action disable` e inspeção. Esse comando bloqueia no banco mesmo se a Edge ou suas credenciais estiverem quebradas. Secret false pode ser confirmado/configurado no painel de secrets. Não habilitar reconciliação nem repetir testes até confirmar o estado.
- Uma URL Anyone vazada permite chamadas fora deste backend; o desligamento local não revoga essa capacidade. Nesse incidente, rotacionar/revogar a URL no Power Automate. Nenhum vazamento foi observado ou provocado nesta revisão.

### 4. Isolamento do webhook Anyone

URL exclusivamente em `TEAMS_WORKFLOW_URL_HML`, backend. Não vai a GitHub, frontend, argumentos ou evidência. Destino HTTPS com hostname Microsoft permitido; redirect recusado; payload não escolhe URL. POST ao Teams não leva Authorization; somente o endpoint Edge tem autenticação própria. [Contrato Microsoft](https://learn.microsoft.com/en-gb/connectors/teams/#when-a-teams-webhook-request-is-received).

Isso é proteção por segredo da URL, não autenticação de tenant. É compatível com a decisão aprovada para HML, desde que os administradores restrinjam acesso aos secrets e ao Workflow. Escopos, `is_test`, janela e deduplicação continuam verificados no backend/banco. Não existe habilitação para eventos operacionais reais nesta entrega.

### 5. Interferência operacional

Diff desta revisão não altera coleta, motor, histerese, snapshots, Cron, workflow operacional, alarmes, PIN, RPC/Edge de Impacto ou trigger-monitoramento. Novas escritas ficam no schema de notificações e histórico administrativo da migration; bootstrap lê histórico privado sanitizado. Não há trigger ou chamada Teams no caminho operacional.

Permanece compartilhamento de recursos do mesmo projeto Supabase; não se promete isolamento físico ou impacto de infraestrutura absolutamente zero. Locks de credenciais são exclusivos das tabelas novas, timeout DDL é limitado e deploy nomeia apenas a Edge nova. Falha das notificações não se propaga como dependência ao pipeline operacional.

## Validações desta revisão

**452 testes passaram em 38 arquivos**, incluindo 60 da integração Teams. Cobertura: migration/rollback/registro duplicado; hashes/auditoria atômicos; falhas em cada etapa mutável; falha individual das duas barreiras de desligamento; precondições de recuperação; health/admin/escopos; expiração da janela com lease válida. Testes preexistentes de idempotência, fila, mock e Impacto preservados. Typecheck/lint, build/Pages e parsing dos helpers também passaram. Aviso preexistente de bundle >500 kB, sem falha de build. Nenhuma regressão manual de funcionalidades anteriores.

**Não houve validação remota nem execução do helper contra HML.** O GO técnico aplica-se ao código corrigido e a uma instalação inicial que satisfaça os gates; não autoriza ignorar uma falha de preflight ou a recuperação manual indicada.
