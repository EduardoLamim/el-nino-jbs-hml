# Fase 03 — motor de alerta, histerese e qualidade

Entrega de 01/10/2026. Implementação limitada ao motor, integração com o coletor, contratos, testes e exposição técnica no placeholder. Não houve avanço para a Fase 04.

## Algoritmo e fontes

`src/domain/hydrology.ts` classifica cada estação e mantém sua histerese. `src/domain/alert-engine.ts` avalia a flag oficial, agrega os estados DC01–DC11, produz todos os gatilhos de risco e calcula a qualidade. As funções recebem o instante de avaliação explicitamente, sem IO ou relógio global. As entradas não são alteradas.

Ordem: `normalidade < atencao < alerta < emergencia`. O resultado é o máximo dos estados efetivos conhecidos, inclusive condições anteriores mantidas como stale. Sem qualquer informação principal atual ou anterior confiável, o resultado é `null`, nunca Normalidade presumida.

Somente Situação Atual e rios determinam risco. A flag oficial é mapeada diretamente; `conteudo` não é interpretado. Sua mudança para uma severidade menor é imediata. Falha, timestamp inválido/futuro/regressivo, flag nula ou indisponibilidade preserva a última condição oficial válida como stale. A fonte real não fornece prazo de validade nem qualidade; não foi inventado um prazo de expiração.

Alertas complementares, chuva, Epagri, barragens, colaboradores, históricos e tendência isolada não determinam nível. `alertas/ativo.data=null` é uma resposta válida. Chuva elevada ou previsão de tempestade não gera gatilho automático. Barragens não recebem classificação ambiental. Falhas complementares afetam qualidade, nunca reduzem ou elevam diretamente o risco.

## Classificação e histerese

Cada estação usa seus próprios `atencao_m`, `alerta_m` e `emergencia_m` coletados. Nenhum limite por DC está no código. Os três valores precisam ser finitos e estritamente crescentes; ausentes ou inconsistentes impedem nova classificação.

| Nível observado | Classificação instantânea |
|---|---|
| Abaixo de atenção | normalidade |
| Maior ou igual a atenção, abaixo de alerta | atencao |
| Maior ou igual a alerta, abaixo de emergência | alerta |
| Maior ou igual a emergência | emergencia |

A primeira observação inicializa somente a classificação atual. Não se inventa um estado hidrológico anterior com base na série histórica recebida. Depois da inicialização, somente amostras posteriores à última processada podem avançar a histerese. A série da fonte permite recuperar novas leituras entre coletas, sem arquivá-las em um banco próprio.

Uma leitura válida pode elevar imediatamente, inclusive Atenção → Emergência. Para descer, são necessárias três leituras distintas, cronológicas e consecutivas estritamente abaixo do limite do estado efetivo atual. A terceira reduz exatamente um nível e zera a contagem. Uma série de nove novas leituras adequadas pode realizar Emergência → Alerta → Atenção → Normalidade, três por transição. As três primeiras nunca são reutilizadas na segunda queda.

Uma amostra válida possui timestamp ISO reconhecido, nível numérico finito e não está explicitamente indisponível/atrasada. `qualidade` ausente ou `null` não a invalida. O normalizador preserva posições de níveis/timestamps malformados como `null`, sem removê-las e unir artificialmente as vizinhas.

Reiniciam a contagem: nível inválido, amostra explicitamente indisponível/atrasada, lacuna, retorno ao limite, corrente indisponível e cronologia não confiável. Duplicatas idênticas contam uma vez; timestamps iguais com valores/qualidades divergentes, ordem invertida, amostra futura e divergência entre série e leitura atual bloqueiam o rebaixamento do lote. A leitura atual válida ainda pode escalar. A checagem de confiabilidade é conservadora sobre a série recebida inteira, inclusive um registro antigo malformado ainda presente nela.

Decisões confirmadas pelo usuário:

- **Atrasado:** permite escalada, impede rebaixamento, reinicia a contagem e marca stale. Uma leitura atrasada só escala se seu timestamp for posterior ao último processado e não estiver no futuro.
- **Consecutividade:** intervalo oficial + **60 segundos**. Para expectativa de 600 s, 660 s é aceito; 661 s interrompe. A primeira leitura após a lacuna pode iniciar nova sequência em 1/3. Sem intervalo oficial, a consecutividade não é comprovada e a contagem não progride além de 1/3.

Mudança de limites e retomada após indisponibilidade zeram a sequência e consideram somente a leitura atual para iniciar outra. Não se reprocessa o período perdido usando limites novos ou como se a indisponibilidade não tivesse acontecido.

## Retenção e gravação

O CLI lê `public/data/status.json` antes da coleta e passa o conteúdo ao pipeline. O campo opcional `motor` mantém, para a situação e as 11 estações, estado efetivo, início conhecido, condição stale/motivo, última observação utilizável e timestamps. Cada rio guarda ainda limite atual de normalização, contagem 0–2 e timestamp da última leitura abaixo. A terceira leitura efetua a transição e volta a zero.

Não se persiste uma lista adicional de observações ou eventos. A série recebida da fonte continua no retrato da coleta; a memória compacta não cresce entre execuções. Transições intermediárias são calculadas apenas em memória durante a execução para reconstruir o início global e descartadas antes da gravação.

- Arquivo ausente: primeira execução, cálculo somente com dados atuais.
- JSON/schema anterior inválido, memória inconsistente ou anterior no futuro: continuidade descartada com diagnóstico explícito; cálculo com dados atuais.
- Erro de leitura de arquivo diferente de ausência: aborta antes da coleta/gravação, evitando perda silenciosa de continuidade.
- Status da Fase 02 sem `motor`: migra a última condição válida, sem inventar contagem ou início global.
- Fonte principal que falha: dados brutos atuais ficam ausentes; a memória conserva o estado anterior, stale, com progresso zerado. O risco não vira Normalidade por ausência.
- Falha complementar: qualidade degradada apropriadamente; Epagri indisponível é descrita como “Previsão do tempo indisponível”.

O contrato completo é validado antes da escrita em temporário e renomeação atômica. Se a escrita/renomeação falhar, o arquivo anterior continua intacto. Mantida a regra do coletor: uma falha de aquisição retorna código 1 depois de publicar o retrato parcial válido. Sucesso das seis fontes retorna 0; avisos de qualidade não se confundem com falha HTTP.

## Gatilhos, início global e qualidade

Todos os estados acima de Normalidade geram gatilhos, inclusive os de severidade inferior ao máximo e os retidos como stale. Gatilhos de rio incluem código, nome, nível observado da última condição utilizável, limite responsável, tendência, timestamp, estado stale/motivo e progresso. Uma estação em normalização conserva a severidade efetiva até completar 3/3.

`nivel_jbs.desde` é `null` quando não há continuidade suficiente. Com memória válida, as transições do lote são ordenadas por timestamp e o máximo global é reavaliado. Mudanças simultâneas são aplicadas juntas. O início só muda quando o máximo muda; uma queda seguida de nova escalada no mesmo lote também é reconhecida. Transição sem horário reconstruível mantém início desconhecido. Isso evita usar simplesmente o horário da coleta ou o último timestamp de uma estação como início global.

Risco e qualidade são independentes:

- `atualizado`: todas as 12 condições principais conhecidas e utilizáveis, sem problemas reportados.
- `parcialmente_degradado`: há pelo menos uma condição principal atual utilizável, mas existe perda parcial, inconsistência temporal, aviso de metadados ou problema complementar.
- `degradado`: nenhuma condição principal atual utilizável. O nível pode continuar conhecido pela memória, por exemplo Alerta + degradado; sem memória fica `null` + degradado.

Os avisos já emitidos pelos coletores permanecem explícitos. O motor não converte qualidade ausente de amostras em invalidez automática. O placeholder exibe nível, qualidade, todos os gatilhos, timestamps e progresso; não há regra de negócio no React.

## Testes e validações

**97 testes aprovados em 5 arquivos**, incluindo os 30 cenários obrigatórios numerados em `tests/alert-engine.test.ts`. Casos adicionais cobrem igualdade e alteração dos limites, atraso, tolerância exata de 660/661 s, duplicatas, repetição de coleta, amostras malformadas, ordem temporal, reprocessamento após falha, serialização/releitura da memória, migração da Fase 02, memória corrompida/futura, determinismo, imutabilidade e reconstrução global entre várias estações.

`tests/collectors.test.ts` valida também coleta parcial/total e continuidade com transportes controlados; `tests/previous-status.test.ts` usa arquivo temporário real para distinguir ausência, JSON válido, corrupção e erro de IO. Os testes são offline, sem depender da disponibilidade atual das fontes. A fixture real de 01/10 registra DC01 = 1,27 m, limites 1,21/1,61/1,75 e tendência subindo: Atenção com situação oficial + DC01, independentemente da previsão.

Comandos aprovados: `npm run typecheck`, `npm run lint`, `npm run build` e `node node_modules/vitest/vitest.mjs run`. O build inclui typecheck. Preview de produção aberto no navegador e leitura da página confirmada com nível Atenção, qualidade parcialmente degradada e os três gatilhos reais. O primeiro início do preview foi bloqueado pela sandbox (`spawn EPERM`); a execução autorizada fora dela iniciou normalmente. Nenhum bloqueio de gravação na coleta desta fase.

## Coleta real final

`npm run collect` concluído com código **0**, em **01/10/2026 às 18:47:06.260 UTC / 15:47:06.260 America/Sao_Paulo**. Seis fontes com sucesso, sete consultas HTTP, 11 rios, 12 pluviômetros, três barragens e previsão municipal de cinco dias. O arquivo real foi validado e gravado com nível calculado e memória.

**Nível JBS: Atenção. `desde`: null**, por não ser seguro reconstruir o início global a partir do retrato da Fase 02.1. **Qualidade: parcialmente_degradado.** Todos os gatilhos:

| Gatilho | Estado | Observação / limite responsável | Tendência | Horário da fonte em São Paulo | Stale / normalização |
|---|---|---|---|---|---|
| Situação oficial da Defesa Civil | Atenção | Flag oficial Atenção | Não se aplica | 30/09/2026 21:36:08 | Não / não se aplica |
| DC01 — Rio Itajaí-Açu - ICMBio/CEPSUL | Atenção | 1,35 m / 1,21 m | Estável | 01/10/2026 15:42:12.504 | Não / 0 de 3 |
| DC11 — Rio Itajaí-Açú – Santa Regina (Volta de Cima) | Atenção | 3,06 m / 3,00 m | Subindo | 01/10/2026 15:40:04.752 | Não / 0 de 3 |

DC02–DC10 estão em Normalidade. Nenhuma normalização em andamento; todas as contagens são zero. A coleta real posterior à fixture contém DC11 em Atenção, por isso tem três gatilhos em vez dos dois do cenário histórico obrigatório.

Problemas registrados: barragens Ituporanga, Taió e José Boiteux oficialmente atrasadas; situação oficial sem qualidade/validade temporal; séries de rios sem qualidade individual explícita; alguns campos de chuva ausentes; Epagri sem modelo, emissão e UF no payload. Itajaí foi validada pelo nome e código oficial 4208203. Nenhum desses problemas complementares altera o nível.

## Arquivos alterados ou adicionados nesta fase

| Arquivo | Finalidade |
|---|---|
| `src/domain/hydrology.ts` (novo) | Classificação, histerese e transições efêmeras |
| `src/domain/alert-engine.ts` (novo) | Situação oficial, máximo global, gatilhos, início e qualidade |
| `src/domain/contracts.ts` | Memória, normalização e gatilhos enriquecidos; validações |
| `scripts/collectors/previous-status.ts` (novo) | Leitura segura do retrato anterior |
| `scripts/collectors/pipeline.ts` | Integração do motor e entrada do status anterior |
| `scripts/collectors/collect.ts` | Continuidade pelo arquivo e diagnóstico do resultado calculado |
| `scripts/collectors/normalize.ts` | Preservação de amostras inválidas na sequência |
| `src/App.tsx`, `src/utils/format.ts` | Exposição técnica mínima e rótulo de dados insuficientes |
| `tests/alert-engine.test.ts` (novo) | Cenários obrigatórios e bordas do motor |
| `tests/previous-status.test.ts` (novo) | Leitura do arquivo de continuidade |
| `tests/collectors.test.ts`, `tests/contracts.test.ts` | Integração, regressões e contrato publicado |
| `public/data/status.json` | Nova coleta real com risco calculado e memória |
| `README.md`, `docs/fase-02.md`, `docs/fase-03.md` (novo) | Documentação corrente, registro histórico e relatório/DoD |

O build foi gerado em `dist/`. O diretório de trabalho não é um repositório Git, portanto não houve commit ou diff Git; a relação acima corresponde às alterações realizadas nesta fase.

## Definition of Done — item a item

- [x] Motor automático implementado — domínio puro e determinístico.
- [x] Situação oficial participa — flag direta, sem interpretação do texto.
- [x] DC01–DC11 participam — todas avaliadas individualmente.
- [x] Limites dinâmicos utilizados — valores da fonte e consistência validada.
- [x] Escalada imediata — uma amostra válida é suficiente.
- [x] Salto de severidade funciona — Atenção → Emergência testado.
- [x] Histerese de três leituras funciona — contagem de amostras novas e consecutivas.
- [x] Rebaixamento nível por nível — novas três leituras por transição.
- [x] Leitura inválida interrompe sequência — preservada no normalizador e testada.
- [x] Retenção entre coletas funciona — serialização, arquivo anterior e pipeline testados.
- [x] Ausência de dado não vira Normalidade — último estado stale ou null sem memória.
- [x] Gatilhos completos — todos os estados de risco, com dados explicativos.
- [x] Progresso de normalização representado — 0/3, 1/3 e 2/3, reinício na transição.
- [x] Qualidade separada do risco — combinações de risco/qualidade testadas.
- [x] Fontes complementares não alteram nível — exclusão tipada e testes de comportamento.
- [x] Cenário real validado — fixture DC01 1,27 + Atenção gera dois gatilhos.
- [x] `status.json` real possui nível calculado — Atenção, três gatilhos e memória.
- [x] Coleta real executada após implementação — código 0, seis fontes adquiridas.
- [x] Build passa — Vite gerou artefato de produção.
- [x] Lint passa — sem erros.
- [x] Typecheck passa — sem erros.
- [x] Testes passam — 97/97.
- [x] Documentação atualizada — algoritmo, falhas, decisões, exemplos e resultados.

## Ambiguidades e pendências

As duas decisões funcionais levantadas foram resolvidas pelo usuário: atraso permite escalada e impede rebaixamento; tolerância de 60 s. Não há pendência de implementação da Fase 03. Continuam desconhecidos os metadados que as fontes não publicam; permanecem null/avisos e não foram inferidos. Não existe agendamento automático; cada execução atualiza o retrato manualmente, como nas fases anteriores. Fase 04 não iniciada.
