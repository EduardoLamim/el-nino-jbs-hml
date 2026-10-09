# Fechamento funcional da V1 — HML

**Correções posteriores:** consultar [correções finais HML de 09/10](fase-10-correcoes-finais-hml.md), com diagnóstico TLS comprovado, tabela operacional e nova situação da homologação. Os resultados abaixo registram a entrega anterior.

Data: 08/10/2026. Escopo restrito ao HML. Esta entrega técnica não equivale à homologação dos 12 ciclos nem ao GO-LIVE.

## Implementação

- Monitoramento → Rios recebeu o indicador regional **Rio Itajaí-Açu — Blumenau**, separado das DC01–DC11.
- Navegação **Central de Planos**, com Plano de Ação Geral e Planos de Ação por Área. O componente e o conteúdo do plano geral foram preservados.
- Catálogo configurável das 12 áreas solicitadas. Somente TI tem plano; as outras 11 mostram “Plano em elaboração”, sem consulta habilitada.
- Plano TI nativo, responsivo, com abas Emergência e Impacto JBS, campos completos e metadados no card/cabeçalho.
- Tema claro preservado e tema escuro abrangendo páginas, controles, formulários, mensagens e modais. Preferência inicial do dispositivo; escolha explícita em `localStorage`; aplicação antes da montagem para evitar flash.
- Ícone explícito de “Sol com muitas nuvens”; fallback desconhecido preservado.
- Removida somente a frase redundante solicitada do Dashboard e a coluna visual 6h de Chuva. Dados de chuva, horários e normalização permanecem.

## Blumenau: origem, qualidade e isolamento

Fonte: [Defesa Civil de Blumenau — Nível do Rio](https://defesacivil.blumenau.sc.gov.br/d/nivel-do-rio). A página oficial publica uma tabela com Hora da Leitura, Nível (m) e Variação (m). O coletor lê HTML com parse5, sem executar scripts, e exige uma tabela inequívoca com esses cabeçalhos. Não foi identificado um endpoint JSON estável confirmado nesta rodada.

Classificação visual autorizada: abaixo de 3m Normalidade; a partir de 3m Atenção, 6m Alerta e 8m Emergência. A classificação original da seção Itajaí-Açu é conservada separadamente, quando identificável. A legenda oficial inclui Observação e Alerta Máximo; esses nomes não alteram os thresholds visuais solicitados.

Horários da leitura são interpretados em Brasília; consulta tem timestamp próprio. Tendência compara duas leituras oficiais sucessivas, sem interpolação; com uma só leitura fica desconhecida. Após duas horas, apresenta **Sem dado recente**, conforme aprovação expressa do solicitante. Ausência, falha HTTP/rede, tabela ambígua, data inválida/futura ou série duplicada resultam em indisponibilidade, nunca zero ou Normalidade fabricada.

O novo campo opcional `blumenau` fica fora de `rios`, `fontes` locais e das entradas do motor. A consulta ocorre em paralelo; o resultado só é anexado **depois** de `aplicarMotor`. Teste compara integralmente motor e nível JBS com e sem Blumenau em Emergência. Nenhum threshold local, histerese, gatilho, alarme ou estado do Terminal usa esse indicador.

**Validação da fonte:** a página oficial foi aberta e atualizada no navegador em 08/10/2026: leitura 15:00, 4,24m, anterior 14:00, 4,27m e classificação original Atenção. O HTML real tem `#river-level-table`, células com `div` e ícones de direção. Um recorte das duas tabelas foi incluído como fixture e passou pelo parser: Atenção, descendo, horário BRT correto. O acesso direto local pelo Node encontrou falha de cadeia de certificado TLS; o snapshot publicado pelo runner HML também apresentou indisponibilidade, conforme o resultado registrado abaixo. Não foi desabilitada validação de certificado nem usada a fixture como dado operacional.

## Excel e TI

Fonte autorizada: `Plano de ação - TI.xlsx`, atualizado em 08/10/2026, planilha `Planilha1`, intervalo A1:G14. SHA-256 do original: `a24d316805df05795b4b18766887830aba5bdc004341b3b8977e0c31ff07748d`.

Metadados: Área TI; responsável Eduardo da Silva Lamim; versão 1; última atualização 08/10/2026. A responsabilidade do plano fica separada dos responsáveis de cada ação.

Contrato exato: `Nível | Ordem | Quem faz | Quem faz - Secundário | Quando faz | Onde faz | Como faz`. Únicos níveis: `Emergência` e `Impacto JBS`. Não existe conversão de `Impacto confirmado`.

Foram importadas **13 ações: sete Emergência e seis Impacto JBS**. Os valores das 91 células de ações foram comparados diretamente com o XLSX, incluindo acentos, pontuação e espaços. Nenhum texto foi resumido, corrigido ou reescrito. Publicação integral autorizada pelo solicitante; **sem pendência editorial**.

`scripts/plans/import_plan.py` usa somente Python 3 e biblioteca padrão. Valida uma planilha, cabeçalhos exatos, níveis, ordem inteira positiva e duplicidades dentro do nível. Preserva campos opcionais vazios. Rejeita fórmulas, conteúdo ativo/externo reconhecido, entidades XML, entradas duplicadas e arquivos acima dos limites. Não extrai arquivos ZIP no disco nem executa conteúdo do Excel. A gravação de JSON é atômica após validação completa. Erros de ação indicam a linha.

Manutenção de conteúdo:

```sh
python3 scripts/plans/import_plan.py "caminho/Plano de ação - TI.xlsx" src/content/plans/ti.json
npm test
npm run lint
npm run pages:build
npm run pages:validate
```

No Windows, usar o executável Python 3 disponível no ambiente. Os testes respeitam `PYTHON_EXECUTABLE`; no runner Ubuntu usam `python3`. O catálogo/metadados ficam em `src/content/area-plans.ts`; futuras áreas disponíveis são resolvidas pelo catálogo. O JSON tem validação adicional de schema e duplicidade na aplicação/testes.

O XLSX original permanece fora do repositório/artefato público. Não há link de download, iframe, dependência Excel no navegador, editor online ou gravação Supabase.

## Temas e acessibilidade

Botão Sol/Lua no header, com nome acessível e estado pressionado. Abas de categoria têm tablist/tabpanel, seleção explícita e navegação por setas/Home/End. Campos longos preservam quebras de linha e quebram palavras sem exigir tabela horizontal.

O escuro conserva verde/amarelo/laranja/vermelho. Impacto usa preto, texto claro e borda contrastante. Cartografia/imagem de decisões preservam suas cores de origem; superfícies e controles adjacentes acompanham o tema.

Smoke automatizado: nove rotas × quatro larguras (1440, 768, 390 e 320px) × dois temas = **72 cenários**. Conferidos acesso direto/refresh, contagem de ações por aba, ausência de overflow e erros JavaScript, e contraste mínimo 4,5:1 de textos auxiliares, cabeçalhos de tabela, indicadores e subnavegação. Capturas foram inspecionadas. Isso não substitui auditoria WCAG completa.

## Resiliência e arquitetura

A falha de push em 07/10 às 13:52 BRT ocorreu na persistência, com `Internal Server Error` retornado pelo GitHub. A correção é restrita a `scripts/automation/push-snapshot.ts`: até três tentativas da mesma revisão, backoffs de 3s/6s e consulta da ponta remota antes de cada envio. Se a revisão já estiver remota, reconhece sucesso; se a ponta mudou, aborta. Sem force, rebase, substituição de snapshot recente ou retry do workflow inteiro. Conflitos, permissões, certificados e erros desconhecidos não são tratados como transitórios.

Foram distinguidos os estados:

| Estado | Evidência necessária / tratamento |
|---|---|
| Aguardando runner | Job sem runner/etapas; timeout de execução não resolve essa espera. |
| Aguardando ambiente | Deployment waiting antes da execução; investigar ambiente/provedor, sem remover proteções. |
| Job executando | Etapas e runner presentes; limites existentes de 12/10 minutos permanecem. |
| Pendente em concurrency | Ainda não executou; pode ser substituído por outro pendente, sem cancelar o ativo. |

A falha recente de Pages ocorreu na solicitação de identidade OIDC, por timeout do GitHub; a permissão `id-token: write` já estava presente. Não foi modificada por hipótese. O histórico recente contém execuções subsequentes bem-sucedidas.

Supabase Cron continua único scheduler, a cada dez minutos; `workflow_dispatch`, grupo `operational-pages` e `cancel-in-progress: false` preservados. Nenhuma mudança de arquitetura de waiting, Cron, Edge, secrets, PIN, Realtime ou motor. Não há proteção nova que prometa resolver indisponibilidade do provedor antes da aquisição do runner.

## Gates e homologação

- 388 testes Vitest aprovados no CI final (33 arquivos), incluindo os nove casos Python exercitados pelo teste do importador e o recorte real de Blumenau. Nenhum teste anterior foi removido; assertions afetadas pelas mudanças autorizadas foram atualizadas.
- Lint, typecheck/Edge, build Pages, data:validate, pages:validate e actionlint aprovados localmente. Actionlint sem validadores externos shellcheck/pyflakes, como no baseline.
- Smoke existente de navegação, formulário sem envio, mapa/camadas/fallback e mobile aprovado.
- 72 cenários visuais locais aprovados. Warning preexistente de chunk JS >500KB permanece.
- [CI final fbc79ab](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37822308373): aprovado. [Publicação automática](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37822428699) iniciada às 15:12:02 BRT e concluída com sucesso às 15:13:22 BRT de 08/10/2026, sem dispatch manual.
- HML: https://eduardolamim.github.io/el-nino-jbs-hml/ . Implementação `228b0c3ba2d3ac1674cbf30c3e975dbba3977c1b`; revisão final de teste/documentação `fbc79ab3777cf49348ee648eb84a7ba6b805c5ff`.
- Smoke remoto: **72 cenários aprovados**, nas nove rotas, quatro larguras e dois temas, sem overflow ou erro JavaScript. Supabase e GIS foram interceptados apenas no navegador de teste, sem mutações; essa verificação não homologa integrações reais novamente. Evidências locais em `.codex_work/v1-closure-hml/`.
- Snapshot de 08/10/2026 às **16:52:37 BRT** confirmado no Git e no Pages às 16:58 BRT, com SHA-256 idêntico: `64734d9b3eb18f91e1732c873b752776d50d235991ea3428a007a735bbd857d6`.
- **Coleta real de Blumenau ainda não validada:** o runner publicou `qualidade: indisponivel`, sem valor ou classificação inventados. O diagnóstico local de TLS não prova sozinho a causa no runner; o motivo público é genérico. Não foi aplicado bypass de certificado. Essa integração permanece como limitação aberta, apesar dos testes do parser aprovados.
- **12 ciclos consecutivos da revisão definitiva: pendentes.** Execuções anteriores à nova revisão não são usadas para homologar o retry novo. Não será mantido polling recorrente do agente para aguardá-los.
- O token administrativo não estava disponível no processo desta rodada. Foi preparada consulta somente leitura e entrada oculta local, sem exposição de `cron`/`net` ao público ou registro de credenciais. Evidência administrativa permanece local.

Critério de fechamento dos ciclos: correlacionar Cron, resposta de dispatch, run, coleta, commit e deploy de 12 horários consecutivos, sem contar apenas HTTP de aceitação. Uma falha deve ser investigada antes de declarar homologação.

Consulta retrospectiva de GitHub em 08/10/2026: **11 runs consecutivas `workflow_dispatch` com sucesso**, após a revisão final, nos horários BRT 15:12, 15:22, 15:32, 15:42, 15:52, 16:02, 16:12, 16:22, 16:32, 16:42 e 16:52. IDs respectivamente: 37822428699, 37823714161, 37825020157, 37826299864, 37827574457, 37828872934, 37830142912, 37831402224, 37832661153, 37833898116 e 37835146101. São evidências de continuidade GitHub/Pages a cada dez minutos; não substituem a correlação administrativa Cron → dispatch de cada ciclo. O token segue ausente neste processo e o arquivo de exportação administrativa ainda não foi disponibilizado.

Pendências de encerramento: obter o histórico administrativo por entrada oculta já preparada, correlacionar retrospectivamente os 12 ciclos completos e resolver/validar a obtenção real de Blumenau sem enfraquecer TLS. A entrega está publicada para avaliação; **homologação integral não declarada**.

PRD, Praticagem/Condição da Barra, WhatsApp/Teams e GO-LIVE não fazem parte desta entrega.
