# Fase 06 — Dashboard e Monitoramento

Concluída localmente em 02/10/2026, limitada às duas telas solicitadas. A homologação HML da Fase 05 foi informada pelo usuário na abertura desta fase. Não foi repetido deploy nem realizada escrita no Supabase nesta implementação.

## Interfaces entregues

O Dashboard apresenta faixa dominante do Nível de Alerta JBS, fontes que sustentam a condição e qualidade secundária. Os quatro níveis ambientais vêm diretamente de `status.nivel_jbs`. Impacto JBS ativo ocupa a faixa preta, com tipo, horário e condição ambiental subjacente. Nesse caso, não aparece outro card “Condição do Terminal”. Sem impacto confirmado, o card permite o acionamento existente; sem confirmação do Supabase, apresenta desconhecido, sem afirmar ausência de impacto.

Situação Oficial mostra exclusivamente flag, conteúdo literal, timestamp e qualidade de `situacao_oficial`. O texto não é interpretado para calcular severidade. Os gatilhos são os entregues pelo motor: situação oficial e DC01–DC11, inclusive condições retidas claramente identificadas. Nenhuma informação de chuva, previsão, barragens ou exposição territorial foi adicionada como gatilho.

O resumo dos rios conta os estados já calculados em `motor.rios`; não reclassifica medições no navegador. Ausência de estado permanece desconhecida. Estados retidos são contabilizados como condições conhecidas e acompanhados de indicação de degradação; leituras atrasadas/indisponíveis são mostradas separadamente. Isso preserva a retenção já aprovada sem apresentar ausência de dados como Normalidade.

Chuva apresenta máximos oficiais por estação nas janelas de 1h e 24h, sem recalcular acumulados. Empates ficam explícitos em um detalhamento. Conforme resposta do usuário nesta fase, **“Estações com chuva na última 1h: N de M”** usa exclusivamente `chuva_1_h_mm`: N conta valores maiores que zero entre M valores finitos, não nulos e não marcados indisponíveis. Não há fallback de janela. Leituras atrasadas com valor disponível permanecem identificadas como atrasadas; qualidade não informada também fica explícita. M igual a zero exibe ausência de dados disponíveis, não ausência de chuva.

A previsão apresenta os primeiros dois períodos no resumo e todos os retornados no Monitoramento, somente Epagri/Ciram, com a mensagem “Informação meteorológica para consulta.” Datas/consulta vêm do contrato. Não se inventam modelo, emissão, probabilidade ou UF. Campos ausentes são informados como ausentes.

Exposição Territorial usa apenas agregados de `territorio.json`: 292 residentes em Itajaí, 88 fora e as três maiores concentrações existentes (São Vicente 67, Cordeiros 38, São João 37). Ambas as ressalvas exigidas pelo usuário estão na tela. Nenhuma relação DC → bairro, DC → HAND ou inferência de pessoas atualmente afetadas foi implementada.

Monitoramento possui navegação por Rios, Chuva, Previsão e Barragens:

- **Rios:** DC01–DC11, identificação oficial completa do curso/referência, nível, estado vigente do motor, tendência oficial, limites dinâmicos, horário e qualidade. Detalhes incluem coordenadas disponíveis e gráfico SVG da série já coletada, limitado às 12 horas anteriores ao último ponto datado, sem banco adicional. Níveis ausentes/indisponíveis interrompem a linha. Há tabela acessível dos pontos. Normalização “X de 3” aparece somente dentro do detalhe da estação, quando contagem positiva e estado não stale, sem antecipar redução de nível.
- **Chuva:** todas as estações e as seis janelas oficiais, com atualização e qualidade. A tabela tem rolagem própria em telas pequenas e acesso por teclado.
- **Previsão:** condição, descrição distinta quando disponível, mínimas/máximas, precipitação, vento e rajada.
- **Barragens:** ocupação, montante, variação, comportas e extravasor, somente para consulta. Nenhum nível de risco próprio; não aparecem no Dashboard.

## Preservação e integração da Fase 05

`ImpactoJbs.tsx` recebeu somente integração de apresentação: slots React para painel/contexto ambiental, textos, classes CSS e horários em America/Sao_Paulo. Foram preservados store, assinatura, timer, validação, captura do UUID de encerramento, limpeza de PIN, envio, espera por confirmação e tratamento de erros. A instância permanece montada durante a navegação para não reiniciar Realtime/reconciliação.

Não houve alterações em `src/services/impact.ts`, contratos, SQL, Edge Function, grants, RLS, tokens, PIN, concorrência, persistência ou cache. Os testes anteriores de ativação, encerramento com falha, sanitização, SQL e reconciliação continuaram passando. Nenhum valor operacional de PIN/BackendToken foi lido, criado ou incluído nesta fase.

Comparação SHA-256 antes/depois: **47 arquivos protegidos, zero alterações**. Evidência completa em [fase-06-integridade.json](fase-06-integridade.json), abrangendo domínio, coletores, Supabase, dados públicos, testes anteriores e serviços/hooks de carregamento. Os principais artefatos ambientais e territoriais permanecem idênticos. Nenhuma nova coleta foi executada.

## Arquivos

Criados:

- `src/components/Operational.tsx`
- `src/components/Weather.tsx`
- `src/components/RiverChart.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Monitoramento.tsx`
- `src/utils/presentation.ts`
- `tests/phase06.test.tsx`
- `docs/fase-06.md`
- `docs/fase-06-integridade.json`

Alterados:

- `src/App.tsx`: composição e rotas das telas, preservação da instância de Impacto JBS.
- `src/components/ImpactoJbs.tsx`: integração visual descrita acima.
- `src/styles.css`: hierarquia visual, semântica das cores, responsividade e foco de teclado.
- `README.md`: estado atual e referência deste relatório.

Nenhuma dependência nova e nenhum teste anterior alterado ou removido. Mapa e Plano de Ação continuam apenas nos placeholders preexistentes da Fase 01.

## Testes e validação

**163 testes passaram em 12 arquivos: 135 anteriores e 28 novos.** Os novos testes cobrem quatro níveis ambientais e Impacto JBS, subjacência ambiental, ausência de duplicação, inativo/desconhecido/degradado, situação oficial literal, gatilhos, rios e limites dinâmicos, ausências, retenção, normalização restrita ao detalhe, série com lacunas, janelas de chuva, contagem 1h, Epagri, barragens consultivas, exposição, navegação e preservação da instância do store.

`npm run lint`, `npm run typecheck` e `npm run build`: aprovados. Typecheck inclui Edge Function. Build sem novas bibliotecas de gráficos; SVG local utiliza os pontos do contrato.

Verificação no navegador local: hierarquia do Dashboard em desktop; Dashboard e detalhes de rios em 390 px; chuva com rolagem interna (311 px de contêiner / 675 px de conteúdo, sem alargar a página); navegação para previsão e barragens; barragens em 320 px. Largura de página observada abaixo da largura do viewport, sem transbordamento horizontal da página. Detalhes nativos são acionáveis por teclado e os gráficos possuem descrição e tabela de valores. A visualização local sem configuração Supabase mostrou corretamente estado operacional desconhecido. Os estados ativo/inativo/degradado e os formulários foram validados por testes de interface, sem operações remotas.

## Limites e pendências

Não há pendência de implementação do escopo da Fase 06. A variação numérica dos rios não existe no contrato atual e é exibida como não informada, conforme requisito “quando disponível”; não foi estimada pela série. Curso e referência permanecem juntos no nome oficial, sem criar associação territorial. A coleta ambiental permanece manual e datada, como nas fases aprovadas; a tela não transforma esses retratos em dados em tempo real nem introduz prazo novo de staleness.

Esta entrega não publica o frontend nem repete a homologação remota da Fase 05. O ambiente local de visualização não possui configuração frontend Supabase; a publicação deve manter as variáveis de ambiente HML já homologadas. Isso não exigiu nem motivou mudança na arquitetura aprovada.

## Definition of Done

| Item | Status | Evidência |
| --- | --- | --- |
| 1. Dashboard operacional | Concluído | Dashboard e painel operacional |
| 2. Nível visualmente dominante | Concluído | Faixa ampla e verificação desktop/celular |
| 3. Cinco estados corretos | Concluído | Quatro níveis + preto testados |
| 4. Impacto JBS integrado sem regressão | Concluído | Backend/store idênticos; suíte anterior aprovada |
| 5. Sem duplicação de Condição do Terminal | Concluído | Renderização condicional e teste |
| 6. Situação Oficial correta | Concluído | Flag, conteúdo literal, data e qualidade |
| 7. Somente gatilhos válidos | Concluído | Saída do motor sem fontes adicionais |
| 8. Resumo de rios | Concluído | Estados existentes; ausências separadas |
| 9. Semântica de chuva por estação | Concluído | Máximos identificados e contagem 1h validada |
| 10. Epagri sem campos inventados | Concluído | Dados disponíveis e ausência explícita |
| 11. Exposição sem impacto inferido | Concluído | Agregados e duas ressalvas obrigatórias |
| 12. Rios com limites dinâmicos e série ~12h | Concluído | Limites do contrato, SVG e tabela |
| 13. Monitoramento de Chuva | Concluído | Todas as estações e seis janelas |
| 14. Monitoramento de Previsão | Concluído | Todos os períodos retornados |
| 15. Barragens somente consultivas | Concluído | Seção exclusiva em Monitoramento |
| 16. Qualidade/staleness corretos | Concluído | Dados preservados e testes de retenção/ausência |
| 17. Sem nova regra de risco | Concluído | Motor e contratos preservados por hash |
| 18. Sem antecipação da Fase 07 | Concluído | Mapa/Plano de Ação não implementados |
| 19. Sem dado individual de colaborador | Concluído | Somente agregados territoriais preexistentes |
| 20. Testes Fase 06 | Concluído | 28 aprovados |
| 21. Testes anteriores | Concluído | 135 aprovados, arquivos preservados |
| 22. Lint | Concluído | Exit code 0 |
| 23. Typecheck | Concluído | Frontend e Edge, exit code 0 |
| 24. Build | Concluído | Vite, exit code 0 |
| 25. Documentação | Concluído | Relatório, inventário e hashes |

Não houve alteração nas regras de negócio das Fases 01–05. A decisão de janela de chuva apenas resolve a apresentação solicitada pelo usuário. O trabalho para na Fase 06.
