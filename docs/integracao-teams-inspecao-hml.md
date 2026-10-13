# Microsoft Teams — inspeção e plano técnico HML

Data: 13/10/2026. **Proposta; nenhuma implementação, migration, deploy ou mensagem executada.** Matriz vinculante: [eventos V1](integracao-teams-matriz-eventos.md).

> Registro histórico da inspeção. O plano foi posteriormente aprovado, com reconciliação periódica também para Impacto (sem listener permanente), cinco tentativas totais, entrega incerta sem retry cego e detalhes de tentativas por 30 dias. O solicitante confirmou a correção `string(item()?['content'])` dentro do loop, Workflow salvo e autenticação `Anyone`. Implementação, limites de ativação e situação dos testes estão em [implementação HML](integracao-teams-implementacao-hml.md); essas decisões posteriores prevalecem sobre as pendências originais abaixo.

## 1. Arquitetura existente e ponto de integração

Inspecionados código e migrations versionadas, não a configuração administrativa viva do Supabase/Power Automate. HEAD local `83487e3`; ponta remota consultada `62e11a8`. A única diferença remota é `public/data/status.json`: a arquitetura homologada permanece igual.

- Supabase Cron → Edge `trigger-monitoramento` → `workflow_dispatch` de `deploy-pages.yml`, sem coleta dentro da Edge.
- Workflow serializado por `operational-pages`, `cancel-in-progress: false`. `prepare` lê a ponta atual, coleta, valida, aplica motor, testa, faz build, persiste snapshot no Git e envia artefato; `deploy` publica Pages.
- `scripts/collectors/pipeline.ts` chama `aplicarMotor(novo, anterior)` de `src/domain/alert-engine.ts`. O motor calcula `nivel_jbs` e memória persistida, considerando estado oficial e DC01–DC11. Blumenau é anexado depois e não participa do nível.
- A histerese está em `src/domain/hydrology.ts`: três leituras válidas para rebaixamento; política atual com tolerância de 120 segundos; dado oficialmente atrasado pode escalar, não rebaixar. Não copiar essa lógica para notificações.
- `scripts/automation/update.ts` lê o snapshot anterior, valida o novo e faz substituição atômica local. Isso ainda não é persistência remota: somente o push confirmado estabelece a referência recuperável.
- Impacto é independente: `impacto-jbs` autentica a operação; `jbs_impacto_escrever` grava `jbs_private.impactos_jbs` e atualiza a projeção pública/revisão na mesma transação, com bloqueio e índice de único ativo. A tabela privada preserva `acionado_em` e `encerrado_em`; a projeção pública sozinha perde o histórico ao encerrar.

**Ponto correto:** comparar `nivel_jbs.nivel` de snapshots consecutivos já consolidados e persistidos. Não observar flags/medições isoladas nem executar novamente o motor. Comparação após histerese; evento definitivo somente para snapshot confirmado no Git. Se a coleta não foi persistida, não notificá-la como transição confirmada.

`nivel_jbs.desde` pode ser null e não é uma chave de identidade. Guardar separadamente horário de vigência informado pelo motor, horário de detecção/coleta e persistência. Se a transição não tiver instante conhecido, apresentar “horário da transição não determinado; mudança detectada às …”, sem inventar data.

## 2. Arquitetura proposta — isolamento do caminho operacional

Adicionar, somente após aprovação, um workflow de notificações separado, acionado por `workflow_run: completed` do workflow operacional, e com entrada administrativa manual para recuperação/testes. Não alterar Cron, workflow operacional, grupo de concurrency ou PIN/Edge do Impacto. O GitHub permite esse encadeamento; ele deve existir na branch padrão e ser limitado ao repositório/branch/workflow confiáveis. [GitHub: workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).

Fluxo proposto:

```text
Git: snapshots persistidos ──► reconciliador independente ──► eventos/outbox privados
Histórico privado Impacto ───► RPC de reconciliação ─────────► eventos/outbox privados
                                                            │
                                   worker Edge autenticado ◄─┘
                                            │
                               Workflow Teams → Flow bot → canal HML
```

O workflow independente chama funções Edge próprias para notificações; a URL Teams permanece somente nos secrets dessas funções. GitHub usa credencial exclusiva para invocá-las, nunca recebe a URL Teams. Sem endpoints de envio anônimos, credencial de Impacto reaproveitada ou secret `VITE_*`.

Executar reconciliação mesmo quando o workflow operacional terminar com falha/cancelamento: procurar commits efetivamente persistidos e pendências; o resultado global pode falhar apenas no diagnóstico de fontes. Nunca inferir persistência pelo status geral da run. Se Pages falhou após persistir, o evento registra estado consolidado e “publicação do painel não confirmada”, sem alegar painel atualizado. Essa política é proposta para aprovação.

Reconciliar **todos** os snapshots entre cursor e ponta, em ordem de ancestralidade, não apenas o último. Validar schema, sequência e associação ao pipeline; commits manuais de dados não devem ser aceitos automaticamente como coleta. Se houver lacuna, reescrita de histórico ou snapshot inválido, interromper somente esse stream e registrar diagnóstico. Não interpolar níveis. Inserir eventos e avançar cursor na mesma transação no banco; falha mantém cursor para replay.

Impacto: RPC nova, restrita ao backend, lê somente ID/tipo/horários do histórico existente. Uma ativação e um encerramento entre coletas geram dois eventos, mesmo que a projeção pública já esteja inativa. Usar anti-join por identidades e paginação, não só um timestamp crescente que poderia perder transações com commit tardio. Não adicionar trigger na RPC de escrita nem envio HTTP na transação operacional. Nenhum dado de responsável/observação livre vai ao Teams por padrão.

Inicialização explícita: registrar baseline/cutoff e conjunto inicial de impactos sem enviar retroativamente o histórico anterior. Se já existia impacto ativo, sua ativação anterior é baseline, mas o encerramento posterior deve notificar. Leitura consistente do cutoff e reconciliação com sobreposição/idempotência evitam corrida de bootstrap. Nova instalação e recuperação de fila existente são situações diferentes: recuperação nunca apaga eventos/cursor.

Sem modificar Cron, a execução automática segue a cadência existente de cerca de dez minutos **mais duração/fila do pipeline**. Impacto não terá garantia de notificação imediata. Se o workflow operacional ficar preso antes de terminar, as notificações também aguardam o próximo acionamento ou recuperação administrativa; a coleta nunca aguarda Teams. Um SLA imediato exige mecanismo adicional de despertar, a aprovar separadamente.

## 3. Persistência, funções e configurações propostas

Schema privado próprio, por exemplo `jbs_notifications`; sem permissões anon/authenticated, sem publicação Realtime e sem dados no `public/data`.

| Objeto | Conteúdo/objetivo |
|---|---|
| `source_cursors` | Ambiente, stream, baseline, commit/referência processada e versão da política; lock de reconciliação. |
| `events` | ID, chave única, ambiente, origem, identidade da fonte, tipo/classificação da matriz, anterior/novo, instante conhecido/detectado, evidência mínima, `is_test`, versão do payload. Imutável. |
| `deliveries` | Destino lógico, grupo/mensagem, estado, número de tentativas, próxima tentativa, lease/token, hash do payload congelado, accepted_at/confirmed_at quando existirem. |
| `delivery_events` | Associação única evento/destino → entrega. Permite consolidar dois eventos sem perder rastreabilidade. |
| `delivery_attempts` | Entrega, tentativa, início/fim, HTTP/código de erro sanitizado, resultado e correlação. Sem URL, headers ou corpo remoto arbitrário. |

Funções propostas: ingestão idempotente de snapshots; reconciliação sanitizada de impactos; criação de eventos sintéticos HML; claim de lote; finalização/reagendamento por lease; replay administrativo auditado. Apenas RPCs mínimas autenticadas expostas ao backend; tabelas privadas, `search_path` fixo, grants mínimos. Credenciais distintas de ingestão e envio, sem abrir `cron`/`net` ou ampliar acesso público existente.

Claim curto com `FOR UPDATE SKIP LOCKED`, lease de 60s e token de fencing; liberar transação antes do HTTP. Um worker antigo não pode finalizar uma lease substituída. Se a lease expirar após início de envio, tratar resultado como incerto, não como envio inexistente. [PostgreSQL: filas e SKIP LOCKED](https://www.postgresql.org/docs/18/sql-select.html).

Secrets backend: `TEAMS_WORKFLOW_URL_HML` e credencial dedicada de invocação/RPC. Configurações: envio inicialmente desabilitado, `environment=hml`, URL fixa do painel HML, versão da matriz, limites de tentativas/lote/timeout, modo de teste, identificador lógico do destino. Rejeitar ambiente/destino incompatível; o payload não escolhe URL de destino. PRD futuro terá projeto, segredos, filas, credenciais, Workflow/canal e baseline próprios. Não criar PRD agora.

## 4. Contrato Teams — correção necessária no Workflow

O solicitante confirmou: variável `Body` contém **o corpo inteiro do gatilho** e a ação recebe `string(variables('Body'))`. Há incompatibilidade com o envelope padrão de Adaptive Cards: o gatilho recebe `type: message` e anexos; a ação precisa de `content`, cujo tipo é `AdaptiveCard`. Não há payload padrão que transforme automaticamente o mesmo objeto nos dois tipos. [Contrato oficial do gatilho](https://learn.microsoft.com/en-gb/connectors/teams/#when-a-teams-webhook-request-is-received).

Manter envelope e tratamento de anexos. Dentro do loop de `attachments`, propor o campo Adaptive Card como **`string(item()?['content'])`**. Se a opção for um único anexo sem loop, **`string(first(variables('Body')?['attachments'])?['content'])`**. Alternativamente, atribuir à variável Body apenas o content do item antes de serializar. Não combinar as alternativas; evitar variável mutável compartilhada com loop paralelo. Recomendo um anexo por requisição e extração direta no loop. Nenhuma alteração foi executada no Workflow.

Exemplo ilustrativo, não enviado, sem afirmar ocorrência real:

```json
{
  "type": "message",
  "attachments": [{
    "contentType": "application/vnd.microsoft.card.adaptive",
    "contentUrl": null,
    "content": {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.2",
      "body": [
        {"type": "TextBlock", "text": "[HML — TESTE] Monitoramento El Niño — JBS Terminais", "weight": "Bolder", "wrap": true},
        {"type": "TextBlock", "text": "Agravamento simulado: Atenção → Alerta", "weight": "Bolder", "wrap": true},
        {"type": "FactSet", "facts": [
          {"title": "Ambiente", "value": "HML"},
          {"title": "Data/hora do cenário", "value": "13/10/2026 10:00:00 — America/Sao_Paulo"},
          {"title": "Evento", "value": "hml-test-exemplo-001"}
        ]},
        {"type": "TextBlock", "text": "Cenário sintético de homologação. Nenhum estado operacional real foi alterado; não representa justificativa meteorológica do motor.", "wrap": true}
      ],
      "actions": [{"type": "Action.OpenUrl", "title": "Abrir painel HML", "url": "https://eduardolamim.github.io/el-nino-jbs-hml/"}]
    }
  }]
}
```

POST JSON, um card por entrega, conteúdo pequeno e limitado; justificativas reais copiadas dos gatilhos do motor, sem inferir causa quando não houver registro. Sem Action.Submit ou alteração de estado pelo card. Mensagens reais de HML também levam o prefixo, distinguindo evento real de ambiente HML de cenário sintético. Nos cards de Impacto, escrever explicitamente “confirmação manual autorizada” ou “encerramento manual autorizado”.

Confirmar política de autenticação do gatilho. A documentação distingue Anyone de modos autenticados; não adicionar Bearer indiscriminadamente. Não foi solicitado nem lido o endereço secreto. A ação de postagem espera JSON de card, como ilustrado na [documentação Power Automate](https://learn.microsoft.com/en-us/power-automate/create-adaptive-cards).

## 5. Deduplicação, entrega e recuperação

- Nível: chave determinística composta por ambiente, stream e identidade do snapshot persistido + transição. Preferir fingerprint do snapshot validado e referência do commit; não usar somente par anterior/novo, horário `desde`, run ID ou texto. Revisar duplicatas com conteúdo idêntico sem gerar evento; transições posteriores iguais têm snapshot/geração distintos.
- Impacto: `ambiente + impacto_id + ativacao` ou `encerramento`. Fechamento repetido pela RPC não gera novo evento. Testes usam namespace separado e chave escolhida pelo cenário.
- Uma transação grava evento, associação de entrega e cursor. Constraint única resolve replay e corrida. Uma mensagem já aceita não recebe novos eventos depois: o payload é congelado.
- Se agravamento e ativação forem encontrados no mesmo lote, preservar dois eventos e, quando sua relação temporal for comprovada, consolidar em um card com seções separadas. Nunca chamar Impacto de “nível ambiental”, nem interpretar redução/normalização como encerramento de Impacto. Se houver ativação e encerramento na recuperação, apresentar cronologia e estado atual confirmado; não anunciar evento antigo como condição atual.
- Proposta de limite: cinco tentativas totais, timeout de 10s por chamada, atrasos mínimos de 10/20/40/80 minutos com jitter e `Retry-After` respeitado. A execução só ocorre no próximo despertar elegível; esses prazos não são SLA. Lotes pequenos, sem sleeps longos, fila ordenada por stream e limite de retenção proposto de 30 dias, a confirmar.
- Erros de conexão comprovadamente anteriores ao envio e 429 podem ser reagendados. 400/schema, 401/403 e destino removido ficam bloqueados para intervenção, sem loop. 5xx podem ser transitórios, mas também ambíguos se a postagem já ocorreu.
- **Timeout após envio, resposta perdida ou crash após POST:** estado `incerto`. O webhook descrito não fornece garantia de deduplicação por chave; reenviar pode duplicar o card. Padrão recomendado: não reenviar cegamente resultados incertos; reconciliar histórico do Flow e autorizar replay auditado. Política de “ao menos uma vez”, aceitando possível duplicação, requer decisão explícita.
- **HTTP 2xx = aceito pelo Workflow, não prova de postagem no canal.** Usar `aceito` separado de `confirmado`. Na homologação, conferir histórico do Flow e card no canal. Confirmação automática exigiria callback autenticado após Post card ou consulta administrativa das execuções, a aprovar. Sem isso, não declarar entregue automaticamente.
- Exigir exatamente um card visível por evento mesmo após timeout/crash demanda idempotência também no destinatário; o Workflow descrito não a implementa. Um registro de recebimentos no Flow reduz duplicações, mas não elimina sozinho a janela entre postar e confirmar. Não prometer exactly-once externo.
- Fila esgotada/erro permanente/idade excessiva vai para intervenção administrativa. Manter eventos, tentativas e referências; reprocessar a mesma identidade, não criar evento novo. Métricas de fila, idade, erro e aceitação fora do frontend e sem depender do próprio Teams para sinalizar sua falha.

## 6. Implementação e homologação HML após aprovação

1. Aprovar decisões abaixo e corrigir somente o mapeamento do card no Flow; confirmar proprietário/coproprietário e tipo/permissões do canal. Workflows dependem de seus proprietários: planejar continuidade e rotação. [Microsoft: criação e limitações](https://learn.microsoft.com/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook).
2. Criar migrations privadas, RPCs mínimas, bootstrap e testes transacionais/concorrência. Sem alterar as migrations/RPC/Edge de Impacto já existentes.
3. Criar reconciliador e worker separados, com envio desabilitado; configurar secrets HML por mecanismo seguro fora do código. Validar ingestão idempotente e isolamento operacional com destino mock.
4. Homologar eventos sintéticos somente na área de notificações (`is_test`, namespace/cursor próprios), passando pela mesma validação, matriz, renderer, outbox e sender. Não escrever em impactos, motor, snapshots, fontes ou simulador frontend.
5. Cobrir todas as transições da matriz, saltos/reduções, baseline sem alarme, mesmo nível, mesma transição repetida em outro instante, ativação/encerramento entre coletas, concorrência, replay, eventos simultâneos, 429, 5xx, timeout incerto e recuperação após queda. Confirmar que indisponibilidade Teams/Supabase-notificações não falha nem atrasa o workflow operacional.
6. Somente com autorização de envio: cards [HML — TESTE] no canal informado, validação do Flow/attachments e inspeção humana. Registrar ID lógico do evento, tentativa, execução Flow e mensagem; nunca URL secreta/headers. Desabilitar envio por configuração se necessário, preservando eventos.
7. Ativar observação real HML após baseline explícita e validar continuidade. Nenhum teste altera estados reais para forçar evento. Nenhuma homologação real de envio ocorreu nesta inspeção.

## 7. Decisões pendentes para aprovação

1. Ajuste obrigatório da expressão do Adaptive Card no Workflow, confirmado o Body integral.
2. Aceitar a latência do worker posterior ao pipeline (cerca de dez minutos + execução/fila), inclusive para Impacto crítico, ou especificar requisito imediato para desenho adicional.
3. Aprovar notificações de estado persistido quando Pages não tiver sido confirmado, com aviso explícito.
4. Aprovar tratamento conservador de entrega incerta; decidir se haverá confirmação automática/callback e idempotência adicional no Flow.
5. Confirmar autenticação do gatilho, canal padrão/privado, responsáveis do Flow, limites de tentativas/retenção e tratamento de backlog antigo.

A matriz de eventos está aprovada e documentada; não é uma decisão pendente. O contrato real do Flow não foi executado: a compatibilidade do exemplo depende da extração de content descrita. **Aguardar aprovação do plano antes de implementar ou publicar.**
