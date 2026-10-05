# Fase 10 — investigação da atualização

Investigação iniciada em **05/10/2026**, no mesmo HML. Horários técnicos em UTC; Brasília = UTC−03. Não foram utilizados ou registrados segredos.

## Resultado da investigação

**Rodada posterior autorizada em 05/10/2026:** a solução escolhida para HML é Supabase Cron → Edge isolada → GitHub `workflow_dispatch`, preservando o pipeline. Edge e Cron estão ativos em homologação; o schedule anterior permanece temporariamente até comprovar 12 ciclos consecutivos. Ver [configuração, segurança e evidências](fase-10-supabase-cron.md). O diagnóstico histórico abaixo permanece válido; a observação de um único dispatch não resolve sozinha a limitação de cadência.

A diferença foi localizada **antes da coleta, na ausência de novos ciclos agendados do GitHub Actions**. O Pages servia corretamente o último snapshot persistido, mas ele havia sido gerado horas antes. Não foi encontrado deslocamento de timezone nem perda de leituras pelo parser. O histórico de execuções não permite atribuir a ausência de disparos a uma causa interna específica da infraestrutura GitHub; não se afirma, sem evidência, que houve congestionamento específico ou descarte de determinada execução.

Há um segundo problema confirmado no cliente anterior: `useDados` carregava os dados somente na montagem. Uma aba mantida aberta não consultava novamente o snapshot após uma publicação. Essa limitação foi corrigida nesta rodada. Não é a explicação principal da reprodução: até uma requisição nova ao Pages retornou o arquivo antigo.

O relato original (~00:20 versus ~21:47/~00:11) não contém captura da estação/HTTP naquele instante. A reprodução abaixo é uma observação posterior, com cadeia verificável, compatível com o relato. **21:47 era o horário de geração/coleta JBS; as leituras individuais no snapshot estavam entre 21:31 e 21:41.** Não confundir esses horários.

## Cadeia observada antes dos ajustes

Consulta simultânea em **03:49:36–03:49:37 UTC (00:49 Brasília)**. [Evidência por DC, headers e hashes](fase-10-atualizacao/comparacao-antes.json).

| Etapa | Evidência |
|---|---|
| Portal/endpoint consumido | `https://monitoramento.defesacivil.itajai.sc.gov.br/monitoramento/rios?municipio_id=1`; HTTP 200, `no-cache, private` |
| Resposta fonte DC01 | `2026-10-05T03:41:35.503000+00:00` = 00:41:35 Brasília |
| Série DC01 | Último elemento e maior timestamp: exatamente `03:41:35.503000+00:00` |
| Saída do normalizador DC01 | Exatamente o mesmo timestamp; nenhuma paginação adicional necessária no payload embutido |
| Último Actions anterior | [37248816407](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37248816407), evento `schedule`, criado `00:46:33Z`, concluído com sucesso `00:48:08Z` |
| Consulta dos rios naquele ciclo | `2026-10-05T00:47:22.176Z` = 21:47:22 do dia 04 |
| Geração do snapshot | `2026-10-05T00:47:24.846Z` = 21:47:24 do dia 04 |
| Commit do snapshot | `00909b9532b8d42349f8fa862accecc6e8e11899`, commitado `00:47:51Z` |
| JSON Git/Pages | Mesma geração `00:47:24.846Z`; DC01 `00:31:59.306000+00:00` = 21:31:59 |
| Cache Pages | `max-age=600`, `Age: 0`, `Last-Modified: 00:48:02 GMT` |
| Consulta Pages com URL inédita | Mesmo SHA-256 da URL normal: `91993f75005a5d1b2adb82a20355a0f79b6dbdfd47a628096ef6d8423889d66f` |
| Diferença fonte × Pages DC01 | Aproximadamente **3h09min36s** entre as leituras; não são três horas adicionadas pelo formatador |
| Idade da geração no teste | Aproximadamente **3h02min12s** |

[Execuções disponíveis antes da alteração](fase-10-atualizacao/actions-antes.json) e [etapas do último ciclo anterior](fase-10-atualizacao/actions-ultimo-anterior.json). Não havia um novo ciclo registrado entre `00:48:08Z` e a consulta de investigação. Não havia build falho ou snapshot mais novo escondido pelo Pages nessa cadeia.

## Portal, coleta real e frontend na mesma janela complementar

Às **04:02:07–04:02:13 UTC (01:02 Brasília)** executou-se o pipeline real em saída isolada, sem sobrescrever o snapshot publicado:

- [Resposta bruta estruturada dos rios](fase-10-atualizacao/fonte-rios.json): extraída do `data-page` oficial, contendo as estações e suas séries sem conversão de valores. HTML/cookies de sessão não foram publicados.
- [Saída resumida do coletor](fase-10-atualizacao/coletor.json): coleta às `04:02:07.925Z`, geração às `04:02:09.589Z`, fonte com sucesso, todas as 11 estações sem retenção naquele processamento.
- DC01: fonte e coletor `03:51:35.394000+00:00`. O [portal renderizado](fase-10-atualizacao/portal.png) mostrou medição **00:51** e 0,85 m.
- O [frontend HML anterior](fase-10-atualizacao/frontend-antes.json), consultado às `04:02:13.510Z`, mostrou DC01 **04/10, 21:31**, 0,83 m, coerente com o snapshot antigo.

Isso separa endpoint/parser de execução/publicação: quando o pipeline é executado, recebe a leitura nova. A retenção do motor não congelou o timestamp da fonte; os dados e a série são preservados separadamente da classificação. Ordenação, timestamp máximo e última amostra foram conferidos para DC01–DC11. O frontend aplica `America/Sao_Paulo`, produzindo a conversão esperada.

## Timestamp do card oficial

O endpoint `api/v1/situacao-atual` retornou `data.atualizado_em = 2026-10-04T13:45:52-03:00`. `normalizarSituacao` preserva esse campo. Ele descreve a atualização da **situação oficial**, não a medição do rio, nem a execução do coletor.

A UI passa a mostrar **“Última atualização da Defesa Civil: 04/10/2026, 13:45”**, com data/hora dinâmica, preservando a data para evitar ambiguidade entre dias. O horário de geração do artefato é identificado separadamente como **“Coleta JBS”**.

## Alterações e alcance da correção

1. Workflow: cron anterior `7,22,37,52 * * * *` substituído por **`2,12,22,32,42,52 * * * *`**, em UTC. Frequência-alvo de 10 minutos, deslocada da borda cheia. Concurrency, memória, validações, persistência por fast-forward e publicação existentes foram mantidas.
2. Continuidade: tolerância de **120 segundos**, adicionada ao intervalo oficial. Para estações de 600s: até 720s inclusive mantém continuidade; 720,001s já quebra. Permanecem **três leituras válidas consecutivas**, inclusive quando chegam em um único lote, nunca três workflows.
3. Cliente: releitura a cada 600s enquanto visível e ao retornar à aba; revalidação HTTP do `status.json` com `cache: no-cache`. Requisições não se sobrepõem. Snapshot anterior ao já exibido é rejeitado. Falha de atualização preserva o último dado e mostra aviso. Nenhuma avaliação de risco foi transferida para o browser.
4. Pipeline/parser: não alterados; os testes e a coleta real não justificaram alteração. A publicação de um ciclo novo atualiza a cadeia, mas **não corrige nem promete controlar o agendador interno do GitHub**.

O GitHub documenta que [execuções de schedule podem atrasar e, sob carga, ser descartadas](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). A troca para 10 minutos é configuração-alvo, não SLA. A periodicidade de leitura no browser tampouco cria dados novos no servidor. Uma garantia operacional de pontualidade exigiria decisão de arquitetura fora desta rodada; nenhum agendador externo foi criado.

## Validação

302 testes passaram: 271 casos anteriores preservados (expectativas de UI e limite temporal ajustadas conforme autorização) e 31 adicionais. Incluem 600/660/719/720s, 720,001/721/900s, repetição da mesma leitura, normalização em um único lote, nova configuração cron, releitura de aba, falha de consulta e rejeição de snapshot antigo.

O [CI 37262180903](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37262180903) foi aprovado. O [ciclo HML 37262201726](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37262201726), disparado manualmente após os gates locais, coletou às `04:08:29.965Z`, gerou às `04:08:31.270Z`, persistiu o commit `ebf163973c62dc1bbfda76bbe03c227e85795de6` às `04:08:59Z` e terminou publicação às `04:09:16Z`.

[Comparação após publicação](fase-10-atualizacao/comparacao-depois.json), feita às **04:11:57Z**:

| Medida | Resultado |
|---|---|
| Snapshot Pages/Git | Geração `04:08:31.270Z`, idade ~3min26s |
| Pages Last-Modified | `04:09:10 GMT` |
| DC01 publicado | `03:51:35.394000+00:00` (00:51 Brasília) |
| DC01 disponível na fonte na consulta posterior | `04:01:35.363000+00:00` (01:01 Brasília) |
| Diferença DC01 | ~600s entre as leituras, ante ~3h09 na reprodução anterior |
| Demais DC | Diferenças de ~600 a ~1.202s; a fonte já havia avançado após a coleta |
| Coleta → geração | 1,305s |
| Geração → commit | ~27,7s |
| Geração → fim do deploy | ~44,7s |

A publicação removeu a defasagem de horas do snapshot observado, mas não sincroniza continuamente a fonte: a idade das leituras inclui disponibilização pela própria fonte, momento de coleta, execução e publicação. Não se afirma diferença zero nem atualização exata de 10 minutos. A coleta das 04:08 recebeu timestamps de 03:50–03:51; não se substituíram esses timestamps pelo horário do job.

[Comparação integral Git/Pages](fase-10-atualizacao/git-pages.json): hashes canônicos iguais. [Frontend após publicação](fase-10-atualizacao/frontend-depois.json): timestamp exibido coincide com o campo da estação no JSON em Brasília. [28 cenários visuais HML](fase-10-visual/ajustes-hml/checks.json), [GIS/fallback](fase-10-atualizacao/browser-hml.json) e [nomes](fase-10-atualizacao/nomes-hml.json) passaram. [Supabase](fase-10-atualizacao/supabase.json) confirmou leitura pública e subscription, sem escrita.

### Observação do agendamento

O [registro da configuração efetiva](fase-10-atualizacao/schedule.json) confirma workflow `373240395` ativo e blob `c9cfaa8433226290180492d9ace27efd294b6779`, contendo o cron de 10 minutos. A execução manual comprova processamento/publicação com a nova versão, mas **não é prova de disparo do schedule**.

Foi observada a execução automática **[37302698228](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37302698228)**, evento `schedule`, criada em **05/10/2026 11:24:12Z** e concluída com sucesso às **11:25:24Z**. Sua revisão `ebf163973c62dc1bbfda76bbe03c227e85795de6` já contém o cron novo. [Etapas](fase-10-atualizacao/schedule-jobs.json) confirmam coleta, testes, build, persistência e publicação. Isso comprova uma execução automática com a configuração nova presente, sem usar o dispatch manual como substituto dessa evidência.

O ciclo gerou `2026-10-05T11:24:31.852Z` e persistiu `8807dba6b9dd3b7bf76820e2f05a649e5d0bab95` às `11:25:01Z`. Às `11:29:12Z`, a [verificação integral](fase-10-atualizacao/git-pages-schedule.json) confirmou Git e Pages iguais. Uma [nova comparação com a fonte](fase-10-atualizacao/comparacao-schedule.json) foi registrada após o ciclo automático.

**Ressalva operacional não resolvida pela alteração do cron:** entre a execução manual de `04:08:16Z` e a automática de `11:24:12Z` transcorreram **7h15min56s** sem outro ciclo listado na consulta. Entre as automáticas de `00:46:33Z` e `11:24:12Z`, foram **10h37min39s**. Portanto, foi comprovado reconhecimento/execução do schedule, **não uma cadência efetiva de 10 minutos**. A mudança solicitada foi aplicada, mas a dependência do agendamento GitHub continua permitindo defasagem de horas. Não declarar a atualização pontual homologada nem considerar essa limitação eliminada antes de uma decisão específica do solicitante.

### Confirmação da correção do cliente

[Teste de navegador no build HML](fase-10-atualizacao/refresh-browser.json): com respostas interceptadas somente no cliente e relógio avançado 600s, houve uma segunda leitura e o rótulo passou de coleta 01:08 para 01:18. Nenhum dado remoto foi modificado. Os testes unitários também confirmam preservação do último snapshot em falha, retorno à aba e rejeição de regressão temporal.

## Encerramento

Investigação, ajustes autorizados, coleta real, CI, deploy, validação remota e observação de disparo automático concluídos. A limitação de pontualidade do GitHub permanece registrada, com evidência concreta; não foi mascarada pelo novo cron nem resolvida com arquitetura não autorizada. Nenhum GO-LIVE/PRD foi iniciado. O solicitante deve validar novamente a interface e considerar essa ressalva antes de uma futura promoção.
