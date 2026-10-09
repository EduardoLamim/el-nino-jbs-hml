# Correções finais HML — 09/10/2026

Atualização posterior: [homologação final da V1 e alinhamento do controle de som](fase-10-homologacao-v1-hml.md). Este documento conserva os resultados da rodada de correções.

Escopo: Blumenau informativo, apresentação dos planos por área e evidências de continuidade. Sem PRD/GO-LIVE. Este relatório complementa o fechamento funcional anterior.

## Blumenau — causa comprovada e correção

No [CI de diagnóstico 37841160397](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37841160397), Ubuntu e Node 24.21.0 resolveram o host para 187.72.56.144 e 45.7.130.208 e falharam em 941 ms com `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. A falha aconteceu no handshake, antes de HTTP, redirecionamento, HTML ou parser; não foi timeout da coleta nem bloqueio HTTP. O Node local reproduziu o mesmo erro. OpenSSL com verificação estrita confirmou que o servidor entrega somente o leaf `*.blumenau.sc.gov.br`, emitido por Sectigo DV R36, sem intermediários.

O navegador conseguiu abrir a página; diferentemente do cliente Node, navegadores podem completar intermediários por mecanismos próprios/cache. Não foi necessário nem utilizado ignorar erros TLS no navegador. A evidência decisiva é a comparação da conexão estrita antes/depois de completar a cadeia.

Correção restrita a `blumenau-transport.ts`: HTTPS nativo do Node somente para a URL oficial exata, raízes padrão mais os dois intermediários públicos Sectigo; `rejectUnauthorized: true`, `allowPartialTrustChain: false`, hostname padrão validado. Nenhuma nova raiz privada, confiança no leaf, trust store global, redirecionamento automático ou mudança de outros coletores. Limite de 8 MiB e cancelamento pelo timeout existente de 20 segundos.

Certificados obtidos do AIA público, conforme [hierarquia oficial Sectigo](https://www.sectigo.com/knowledge-base/detail/Sectigo-new-Public-Roots-and-Issuing-CAs-Hierarchy), com assinaturas verificadas até USERTrust já incluído no Node. OpenSSL `verify -untrusted` validou leaf e hostname. Origem, fingerprints e manutenção em `scripts/collectors/certificates/README.md`. A solução definitiva no servidor é publicar seu fullchain correto; eventual troca de emissor requer revisar os intermediários, nunca desabilitar TLS.

Teste local real, 08/10 às 17:42 BRT: leitura oficial 17:00, 4,25 m, Atenção, descendo, qualidade atualizado. HTML real recebido com TLS válido foi aceito pelo parser. Nenhuma fixture entrou no snapshot. O limite de duas horas e o isolamento após o motor permanecem intactos.

**Aceite real confirmado no HML:** [ciclo automático 37929548766](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37929548766), de 09/10 às 09:22 BRT, executou o checkout `91d42d5fb039c07c1e9640ad1f8059ec9bf38ecf` (comprovado no log; o head do evento ainda era anterior ao push). Obteve **3,90 m**, leitura oficial **09:00 BRT**, consulta **09:22:18 BRT**, qualidade **atualizado**, nível visual **Atenção**, tendência **descendo**, classificação original **Observação** preservada. Snapshot de 09:22:22 persistido no commit `babe1520afe8aa30a56cf9fb582ed8a72ff011ce`; deploy concluído às **09:23:18 BRT**.

Git e Pages retornaram bytes idênticos, SHA-256 `ae6cd6f2bc9613b2dcc345e7e5f121a40f6e20e3da2979b7cc5225d73e0e3ab4`. A tela Monitoramento → Rios exibiu **3,9 m Descendo**, Atenção, horário oficial 09:00 e indicação de isolamento do nível JBS. Critérios de valor, horário, qualidade, classificação, persistência, publicação e exibição atendidos.

O diagnóstico público permanece executável manualmente por `npx tsx scripts/qa/blumenau-diagnostic.ts`; a etapa temporária do CI foi removida após comprovar a causa. Não lê tokens, headers de autorização ou variáveis de ambiente.

## Central de Planos

- Removido somente o metadado redundante Área de card/cabeçalho. Área permanece no título e cadastro; responsável, versão e atualização preservados.
- Tabela HTML de seis colunas: Ordem, Quem faz, Quem faz - Secundário, Quando faz, Onde faz, Como faz. Ordenação numérica, uma linha por ação, procedimentos integrais, sem paginação, modal ou cards por linha.
- Abas Emergência/Impacto JBS preservadas, sete/seis ações. JSON, importador, cadastro das 12 áreas e Plano Geral sem alteração.
- Coluna Como faz recebe mais espaço; textos quebram dentro da célula. Contêiner com altura máxima, rolagem horizontal/vertical, foco acessível, cabeçalho e Ordem fixos. Página não rola horizontalmente no mobile.
- Temas claro/escuro, separadores e contraste preservados. Dados de 50 ações existem somente nos testes/DOM do navegador de QA, nunca no conteúdo publicado.

## Validações

392 testes aprovados (388 preservados, quatro novos), em 34 arquivos. Testes atualizados de apresentação mantêm a comparação integral das 13 ações. Novos casos cobrem metadados, colunas/50 ações/textos longos/ordem e cadeia criptográfica/restrição de URL. Isolamento do motor e limites de qualidade de Blumenau continuam testados.

Typecheck incluindo Edge, build, validação Pages, lint, actionlint e validação dos dados aprovados. [CI 37929559833](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37929559833) aprovado; o pipeline operacional também executou os 392 testes com sucesso. Aviso de bundle maior que 500 KiB permanece preexistente.

Smokes locais **e remotos HML aprovados**: 16 cenários específicos da tabela (TI real e 50 ações × 1440/768/390/320 × claro/escuro), capturas antes/depois da rolagem e verificações de elementos fixos; mais 72 cenários de nove rotas nas mesmas larguras/temas, sem overflow da página, falhas de contraste verificadas ou erros JavaScript. Supabase foi interceptado somente no navegador de QA para não alterar Impacto; o snapshot e a tela de Blumenau foram verificados separadamente contra a publicação real. A formatação numérica da aplicação exibe 3,9 m, equivalente ao valor 3,90 m da leitura.

Capturas da tabela real publicada: [desktop claro](fase-10-correcoes-visuais/desktop-claro.png), [desktop escuro](fase-10-correcoes-visuais/desktop-escuro.png), [mobile claro](fase-10-correcoes-visuais/mobile-claro.png), [mobile escuro](fase-10-correcoes-visuais/mobile-escuro.png). As capturas de estresse com 50 ações permanecem apenas na evidência local de QA.

Capturas e medições locais: `.codex_work/plan-table-local/`; remotas: `.codex_work/plan-table-hml/`. Evidências administrativas permanecem locais, fora do repositório e do Pages.

## Ciclos e limites da homologação

A exportação administrativa fornecida pelo solicitante em 09/10 às 09:17 BRT contém 48 execuções Cron concluídas com sucesso, de 01:22 a 09:12; 36 respostas HTTP 202 retidas, sem timeout. As 12 mais antigas não têm resposta HTTP retida e não são promovidas a sucesso completo por suposição.

Foram correlacionados retrospectivamente **12 ciclos completos da revisão operacional anterior**, de 07:22 a 09:12 BRT, em intervalos de dez minutos: Cron succeeded → resposta Edge 202 com run ID → workflow_dispatch success → coleta/snapshot com timestamp → commit automático → prepare/deploy success. Evidência local: `.codex_work/final-fixes-prior-cycles.json`. Isso comprova continuidade anterior, não homologa a alteração de transporte desta rodada.

A sequência de 08/10 iniciada às 15:12 teve seu 12º workflow às 17:02, run 37836402397, concluído com sucesso. A exportação administrativa atual não cobre aquele horário: não foi declarada correlação integral dessa sequência original.

**A correção de Blumenau muda a revisão operacional. É necessária uma nova sequência de 12 ciclos completos após sua publicação**, sem misturar os anteriores. A consulta será retrospectiva; não haverá polling contínuo do agente aguardando o prazo. Cron, frequência, Edge, concurrency, secrets e permissões não foram alterados.

O primeiro ciclo GitHub/Pages da correção foi o das 09:22 de 09/10, confirmado acima; o histórico administrativo exportado às 09:17 ainda não cobre esse horário. Se os ciclos seguintes se mantiverem a cada dez minutos, o 12º horário será 11:12 BRT, mas somente evidência posterior poderá confirmá-lo. Reexecutar o helper seguro após esse período permite nova correlação. Não foi deixado monitor recorrente do agente.

**Estado final desta entrega: correções publicadas e tecnicamente validadas; homologação integral pendente exclusivamente dos 12 ciclos da revisão corrigida e sua correlação administrativa.** Revisão funcional `91d42d5`. Sem pendência de conteúdo TI ou de obtenção real de Blumenau observada no ciclo validado. Não foi iniciado GO-LIVE.
