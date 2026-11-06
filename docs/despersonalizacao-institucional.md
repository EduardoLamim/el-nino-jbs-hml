# Despersonalização institucional — HML primeiro

## Escopo e evidências

Inventário por arquivo em `despersonalizacao-inventario.csv`: 153 arquivos textuais com referências HML e 112 PRD. Também inclui os assets binários versionados para revisão visual. Bases: HML a05490162a2fc62206888af26cc21b4abca99de2; PRD 881acdfa4015a19a4639597a0f77f682e431c8ab (correção do reconciliador preservada). O inventário representa o estado anterior à alteração; não contém valores de credenciais. Arquivos locais não rastreados não foram removidos ou publicados.

## Apresentação alterada

Logo institucional removido da importação e do asset atual. Título mantido como Monitoramento El Niño, com Itajaí · Santa Catarina. Cores, tipografia, navegação, temas, áudio e demais componentes preservados. Dashboard, monitoramento, mapas, planos, modais, acessibilidade e rodapé usam Nível de Alerta, Impacto Operacional e Coleta Operacional. Nome do pacote neutralizado.

Planos mantêm ações, responsáveis e horários; apenas a categoria foi neutralizada. O importador aceita a categoria histórica e produz a nomenclatura nova, mantendo validações estruturais e de segurança. O teste de integridade continua comparando o conteúdo anterior, normalizando exclusivamente as substituições autorizadas.

Mapa: edição determinística autorizada da faixa (397,74)-(716,102), em imagem 1337×752. Todos os pixels externos foram comparados e permanecem idênticos. PNG evita recompressão com perdas; JPEG antigo deixa de integrar o artefato, mas permanece no histórico Git. A versão gerada por IA foi rejeitada e não foi incorporada.

Renderer Teams: somente textos visíveis alterados localmente; eventos, cores, timestamps, IDs, payloads persistidos, idempotência, fila, checkpoints e transporte não foram modificados. Necessita publicação posterior da Edge correspondente; publicar Pages não publica Edge Functions.

## Referências técnicas preservadas

- Contratos JSON: `nivel_jbs`, `colaboradores_jbs`, `resumo_jbs` e fonte `jbs`. Apenas o nome de exibição da fonte foi neutralizado.
- Tipos/exports legados (`NivelJbs`, `ImpactoJbs`), chaves locais (`jbs-theme` etc.), endpoint `impacto-jbs` e canal Realtime: mantidos para compatibilidade, sem exibição institucional.
- Supabase: schemas `jbs_private` e `jbs_notifications`; tabelas de impacto e `public.impacto_jbs_publico`; RPCs `jbs_impacto_tentativa`, `jbs_impacto_escrever` e `jbs_teams_rpc`; nomes das migrations já executadas.
- Nomes de secrets encontrados no contrato: `JBS_IMPACT_PIN`, `JBS_IMPACT_BACKEND_TOKEN`, `JBS_SUPABASE_PUBLISHABLE_KEY`, `JBS_ALLOWED_ORIGIN`. Valores não consultados. Nenhum secret modificado.
- Repositórios, URLs Pages, guards de identidade, scripts de provisionamento, referências de Graphify/ai-memory e User-Agent do coletor permanecem atuais. Renomeá-los exige validar as dependências; não faz parte da remoção visual imediata.
- Documentos, capturas históricas, PDF oficial municipal e auditoria não são reescritos. Permanecem acessíveis no histórico/repositório; não são copiados para o build Pages. Isso não equivale a remover a marca de todo o histórico público.

## Supabase: mudanças necessárias

Nenhuma migration de banco é necessária para neutralizar a interface. A atualização textual do renderer requer deploy isolado da Edge Teams após homologação; não requer credenciais novas ou mudança de webhook. Esta etapa não consultou o inventário remoto de secrets nem alterou banco, Edge, fila ou modo Teams.

Caso se exija remover também nomes técnicos das requisições públicas, planejar fase específica: adicionar endpoints/RPCs neutros compatíveis, testar grants/RLS/Realtime e clientes, migrar consumidores, só então descontinuar aliases. Não renomear tabelas ou RPCs em produção diretamente e não apagar registros/auditoria.

## Proposta de URLs neutras — não aplicada

- HML: https://eduardolamim.github.io/monitoramento-el-nino-hml/
- PRD: https://eduardolamim.github.io/monitoramento-el-nino/

Os nomes são propostas, não recursos criados nem disponibilidade garantida. Alternativa: domínio próprio aprovado, mantendo inicialmente os repositórios e seus IDs.

Ordem segura:
1. Confirmar nomes/domínio e inventariar links atuais; manter rollback pelo commit e configurações anteriores.
2. Preparar em HML os guards de repositório em Actions, trigger-monitoramento e reconciliador (incluindo proveniência), paths Pages, validação/smoke e scripts administrativos. Preservar IDs de repositório, histórico, baseline e checkpoint.
3. Atualizar links Abrir painel no renderer do ambiente correto. Não copiar o handler HML inteiro para PRD e não reescrever cartões já persistidos. Webhook Power Automate permanece o mesmo.
4. Para mudança apenas de subpath em github.io, a origem HTTP não muda; para domínio próprio, revisar origem autorizada da Edge de Impacto e eventuais URLs de autenticação. Preservar isolamento de armazenamento HML/PRD.
5. Validar build, URLs de assets/dados, roteamento hash, leitura de Impacto, Realtime, links Teams e despacho GitHub antes da troca. Planejar redirecionamento explícito dos links antigos.
6. Trocar HML, homologar e depois promover PRD mediante decisão do responsável. Não confiar no redirecionamento do repositório para o site Pages.

Referências oficiais: https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository (URLs de sites de projeto não são redirecionadas automaticamente); https://supabase.com/docs/guides/functions/cors (tratamento de origem/preflight).

## Promoção PRD

Promover somente o delta de apresentação e assets após homologação HML. Manter exclusivas as configurações PRD, o reconciliador corrigido, a migration de retomada, o checkpoint e o corte operacional de 06/11. Não copiar snapshots HML, não substituir migrations/worker PRD e não enviar testes Teams. Nenhuma alteração PRD executada nesta rodada.