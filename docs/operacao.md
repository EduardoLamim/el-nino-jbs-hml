# Operação — atualização e GitHub Pages

Escopo: Fase 08. Preparação técnica; não substitui a homologação da Fase 09.

## Fluxo

Defesa Civil + Epagri/Ciram → coletores aprovados → normalização → motor existente + snapshot anterior → validação final → `public/data/status.json` por gravação atômica → build estático → validação do artefato → persistência do snapshot → upload → deploy opcional.

Supabase mantém o Impacto JBS manual e, na rodada final HML da Fase 10, passa também a orquestrar o dispatch por Cron e Edge isolada. Não há banco ambiental ou migração do coletor/motor. Somente metadados do agendamento são registrados em schema privado. Git versiona o arquivo de estado corrente para continuidade e recuperação; nenhum histórico adicional é exposto pelo painel. [Configuração e estado da homologação do Cron](fase-10-supabase-cron.md).

Geometrias históricas seguem fluxo separado: fonte oficial → coleta/validação manual → arquivos locais por hash + manifesto → frontend sob demanda. Não são recolhidas pelo ciclo operacional.

## Workflows

| Arquivo | Disparo | Responsabilidade |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Push em `main`, pull request e manual | Lint, testes, dados, typecheck, build Pages, validação do artefato e smoke test de navegador sem depender de disponibilidade GIS |
| `.github/workflows/deploy-pages.yml` | Schedule e manual na branch padrão | Coleta operacional, validações, snapshot persistido, artefato Pages e publicação opcional |

O schedule usa minutos **02, 12, 22, 32, 42 e 52 de cada hora UTC** (`2,12,22,32,42,52 * * * *`): frequência-alvo de 10 minutos, sem garantia de pontualidade. GitHub pode atrasar ou omitir execuções sob carga; em repositórios públicos, schedules também podem ser desabilitados após inatividade. Não tratar horário de execução como horário da medição. Ver [documentação de schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Em Actions, selecione **Atualizar estado operacional e preparar Pages → Run workflow**, usando a branch padrão. `publish=false` prepara dados e artefato sem deploy. `publish=true` autoriza o deploy daquele ciclo. A variável `PAGES_DEPLOY_ENABLED=true` habilita deploy em todos os ciclos, inclusive agendados. Ausente/false mantém apenas preparação. O antigo deploy automático por push foi substituído por CI no push e pelo workflow operacional; isso evita publicar um snapshot desatualizado junto a mudanças de código.

O grupo `operational-pages`, com `cancel-in-progress: false`, cobre coleta, persistência e deploy. Só há uma execução ativa. Execuções pendentes podem ser substituídas pelo GitHub; não se presume FIFO. Cada execução lê a ponta atual da branch padrão ao começar, inclusive reexecuções. O push é somente fast-forward, sem force/rebase: alteração concorrente da branch aborta a publicação. Não editar manualmente o snapshot enquanto a automação trabalha. Ver [concorrência do GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## Configuração no GitHub

1. Publicar os arquivos aprovados do projeto na branch padrão do repositório, incluindo código das Fases 06–08 e datasets locais.
2. Em Settings → Actions, permitir execução dos workflows. O job de preparação precisa de `contents: write` para atualizar apenas `public/data/status.json`. Proteções de branch devem permitir esse fluxo; caso contrário o push falha fechado. Não usar PAT administrativo nem desativar proteções indiscriminadamente.
3. Em Settings → Pages, selecionar **GitHub Actions** como origem. Usar/proteger o ambiente `github-pages` conforme política do repositório.
4. Configurar as duas variáveis públicas abaixo. São aceitas também as entradas já existentes em Actions Secrets, por compatibilidade; o nome “Secret” do armazenamento não torna esses valores privados no frontend.
5. Conferir base path e origem CORS já autorizada da Edge Function antes de habilitar deploy. A preparação local não modifica Supabase remoto.
6. Executar manualmente sem publicação, conferir logs/artefato e habilitar publicação apenas conforme processo de validação do projeto.

| Variável | Classe / localização | Uso |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Pública; Actions Variables ou `.env.local` local | URL do projeto aprovado `https://ufeahglxwygvlugfsopi.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Pública; Actions Variables ou `.env.local` local | Chave `sb_publishable_…` do projeto aprovado |
| `PAGES_BASE_PATH` | Pública; Actions Variable ou variável do processo local | Opcional: `/el-nino-jbs-hml/`, outro `/repositorio/` ou `/` para domínio próprio |
| `PAGES_DEPLOY_ENABLED` | Controle de workflow, não frontend | Ausente/false: prepara. `true`: publica após gates |
| `REQUIRE_PUBLIC_CONFIG` | Controle de build | Workflow operacional exige par público válido; build de CI pode funcionar sem ele, mostrando estado JBS não confirmado |
| `GITHUB_TOKEN` | Credencial efêmera gerenciada pelo Actions | Permissão restrita por job; não é passado ao frontend |
| `JBS_IMPACT_PIN`, `JBS_IMPACT_BACKEND_TOKEN`, `JBS_ALLOWED_ORIGIN`, `JBS_SUPABASE_PUBLISHABLE_KEY` | Configuração exclusiva da Edge Function, conforme Fase 05 | Não mover para variáveis `VITE_` nem para Pages |

Nunca incluir service_role, `sb_secret_…`, PIN, senha ou token administrativo em `.env` público, `public/`, JS ou variáveis `VITE_`. O build aceita somente as duas variáveis `VITE_` previstas e rejeita chave privada no lugar da publishable. O validador também verifica tipos conhecidos de credenciais no artefato e rejeita arquivos extras, `.env`, fontes e material de desenvolvimento. Essas barreiras não substituem revisão de segredos: não fornecer segredos ao processo de build.

O frontend aprovado aceita o projeto Supabase indicado acima. A origem CORS é protocolo + host (+ porta), **sem subpath**; para Pages deste repositório é `https://eduardolamim.github.io`. Não há migração, RPC ou alteração de PIN nesta fase. Não testar escrita remota apenas para verificar publicação.

## Estado, qualidade e histerese

O arquivo anterior contém a memória compacta completa em `motor`: estados retidos, última leitura, limites e contadores. A automação lê e valida esse arquivo antes de consultar as fontes. Snapshot ausente/corrompido aborta; recuperar uma versão válida, sem inicialização silenciosa de contadores. A entrada em produção parte do snapshot válido versionado já existente.

Cada coleta continua usando `coletar()` e o motor aprovado, sem novos thresholds. Escalada é imediata; redução exige três **leituras** consecutivas válidas, não três execuções do Actions. A série oficial pode fornecer leituras entre ciclos. Duplicatas, lacunas acima do intervalo oficial + 120 s, atraso e invalidade continuam com o tratamento da Fase 03. A revisão autorizada da Fase 10 ampliou a tolerância de 60 para 120 s: para intervalo oficial de 600 s, até 720 s é consecutivo; acima disso a sequência reinicia. A regra permanece baseada em três leituras oficiais.

Há duas classes de resultado:

- **Falha de fonte com saída válida:** o motor preserva condições quando previsto e marca qualidade/stale; medições ausentes não viram zero. O snapshot degradado pode ser persistido e publicado. O job `source-diagnostics` deixa a execução vermelha após as etapas de publicação, tornando a falha visível. Consultar separadamente o resultado do job `deploy`.
- **Falha estrutural, de validação, build, gravação ou conflito de push:** não é publicado artefato inválido. O snapshot versionado anterior permanece, salvo quando a persistência já terminou e uma etapa posterior de upload/deploy falhou. Nesse caso a memória nova validada permanece para o próximo ciclo e o site anterior continua no ar.

Qualidade “parcialmente degradado” não exige erro HTTP: fontes podem informar atraso ou metadados incompletos. Os logs informam IDs das fontes, resultados, horários, qualidade e etapas, sem imprimir conteúdo de PIN/token. HTTP mantém timeout de 20 segundos e limite de 8 MiB, sem novo retry operacional. Jobs têm limites de 12 minutos (preparação/CI), 10 (deploy) e 1 (diagnóstico).

## Comandos locais

Node.js 24 e dependências do lockfile:

```sh
npm ci
npm run data:validate
npm run automation:update
npm test
npm run lint
npm run pages:build
npm run pages:validate
npm run pages:preview
```

`npm run collect` continua disponível com o comportamento original (exit code 1 em falha parcial após gravação válida). `automation:update` separa falha estrutural de indisponibilidade de fonte para permitir ao workflow publicar degradação explícita; seu resultado `degraded` alimenta o job de diagnóstico. Localmente, observar os avisos e o relatório das fontes, não apenas o exit code.

Modo Pages infere `/nome-do-repositorio/` a partir de `GITHUB_REPOSITORY`; repositório `*.github.io` usa `/`. Localmente o padrão é `/el-nino-jbs-hml/`. O override `PAGES_BASE_PATH` deve começar/terminar com `/` e não pode ser URL externa ou conter `..`. Build comum `npm run build` mantém base relativa. Não reaproveitar um build feito com outro base path.

Preview: `http://127.0.0.1:4173/el-nino-jbs-hml/`. As rotas são hash, por exemplo `#/mapa` e `#/plano-de-acao`, compatíveis com acesso direto/refresh sem servidor de rotas. Status, território, bairros, manifesto, GeoJSON, CSS e chunks usam base configurada. Aérea/Cartográfica usam URLs municipais absolutas.

Teste reproduzível do artefato, com preview aberto:

```sh
npx playwright install chromium
npm run pages:smoke
```

No Windows com Edge instalado, definir `PLAYWRIGHT_CHANNEL=msedge` no processo. `CHECK_GIS=true` adiciona verificação real de estilo/sprites/PBF e tiles municipais; o CI padrão testa as camadas locais e fallback com GIS bloqueado, sem depender desse serviço. `SMOKE_ORIGIN` permite outra origem local. Resultados e capturas ficam em `.codex_work/fase08/` e não entram no site.

O artefato `dist/` contém index, assets JS/CSS, manifesto Vite e dados públicos completos. O manifesto Vite permite verificar dependências e chunks dinâmicos. Os dados são comparados byte a byte à entrada do build; históricos têm SHA-256, contagem, vértices e schema conferidos. `upload-pages-artifact` mantém o pacote por sete dias; ele não é usado como memória da histerese. Fluxo Pages conforme [documentação oficial](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Atualização histórica manual

Executar `npm run map:collect` somente quando houver atualização territorial aprovada. Conferir manifesto, geometrias e `npm run data:validate`; revisar e versionar os arquivos gerados junto ao manifesto antes do build. A coleta possui sua própria transação e preserva o manifesto anterior em falha. Nenhum workflow periódico ou manual adicional foi criado para ela; o comando existente é suficiente. Não baixar ortofotos, tiles ou PBF para o repositório.

O coletor conserva arquivos antigos por hash para não invalidar uma versão anterior durante a coleta. Se o manifesto mudar, revisar e retirar do diretório público os arquivos que não são mais referenciados antes de preparar o novo artefato; a revisão anterior continua recuperável no Git. O gate do artefato rejeita arquivos extras. `.gitattributes` fixa LF para JSON/GeoJSON e workflows, evitando mudança de hash por conversão automática de fim de linha.

## Recuperação

| Falha | Procedimento |
| --- | --- |
| Coleta/workflow operacional | Actions → execução → job/etapa com erro. Se fonte indisponível, observar diagnóstico e qualidade. Se snapshot inválido, recuperar o arquivo completo de uma revisão válida, validar e executar novamente; nunca editar o nível para mascarar erro. |
| Conflito ou permissão no push | Conferir proteção de branch e escritores concorrentes. Reexecutar todo o workflow, que lerá a ponta atual e fará nova coleta. Não usar force-push/rebase do snapshot. |
| Build/artefato | Corrigir erro de typecheck, configuração pública, base path ou dataset indicado. Rodar gates novamente. Não enviar diretório parcial nem desabilitar validação. |
| Pages/upload | Conferir Settings → Pages, ambiente, permissões e job de deploy. Reexecutar o workflow completo; memória já persistida continua válida. Não assumir que artefato preparado equivale a site publicado. |
| Fonte oficial | Respeitar indisponibilidade e estado retido conforme motor. Verificar próximo ciclo/manual; não inventar leituras, chuva zero ou Normalidade. |
| Basemap municipal | Usar Simplificada. Camadas locais e estações continuam disponíveis; indisponibilidade cartográfica não altera risco. Nova seleção tenta a base novamente. |
| Coleta histórica manual | Manter manifesto/datasets válidos anteriores. Corrigir a consulta/estrutura e repetir manualmente; não misturar arquivos de versões diferentes. |

Consultar `GITHUB_STEP_SUMMARY`, logs de cada etapa e o artefato `github-pages`. A Fase 09 continua responsável pela homologação final de falhas/HML; esta documentação não declara produção homologada.
