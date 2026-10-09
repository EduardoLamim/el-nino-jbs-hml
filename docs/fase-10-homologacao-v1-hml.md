# Homologação final da V1 — HML

Data: 09/10/2026. Operacional homologado: `91d42d5fb039c07c1e9640ad1f8059ec9bf38ecf`. Interface publicada: `30803bd`. **Homologação técnica da V1 no HML concluída. Isso não representa autorização de GO-LIVE.**

## Controle de áudio

Removidos da apresentação visual os estados redundantes Som habilitado/desabilitado. O estado permanece em região de status somente para leitores de tela; o botão tem nome dinâmico Habilitar som/Desabilitar som e `aria-pressed`. Testar som continua disponível quando habilitado. Botões com altura mínima de 44px, centralizados em relação ao seletor de tema; eliminada a linha visual de status.

Nenhuma alteração na habilitação por gesto do operador, MP3, detecção de transições, primeiro carregamento, reconhecimento ou interrupção manual. O diff do componente se restringe à apresentação/atributos acessíveis. Navegação e controle persistem ao trocar de página.

## Validação técnica

Os **392 testes existentes passaram**, sem remoção. Assertions de acessibilidade foram acrescentadas ao teste do header. Lint, typecheck incluindo Edge, build, validação de dados, validação Pages e actionlint aprovados. Aviso preexistente de bundle acima de 500 KiB permanece.

Smokes local **e remoto HML: 16 cenários aprovados em cada ambiente** — 1440, 768, 390 e 320px × claro/escuro × áudio habilitado/desabilitado. Confirmados centros verticais e alturas iguais entre controle e seletor de tema, estado acessível, status visualmente oculto, ausência de overflow e erros JavaScript, navegação e habilitação/desabilitação. Capturas/medições em `.codex_work/header-audio-local/` e `.codex_work/header-audio-hml/`. A validação automatizada não substitui percepção auditiva humana; os sons e sua implementação não foram alterados nesta rodada.

[CI 37957677455](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37957677455) aprovado. [Deploy automático 37958593014](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37958593014), iniciado às 13:22, concluído com sucesso às **13:23:16 BRT**. HML: https://eduardolamim.github.io/el-nino-jbs-hml/ .

Capturas publicadas: [desktop claro](fase-10-header-hml/desktop-claro.png), [desktop escuro](fase-10-header-hml/desktop-escuro.png), [mobile claro](fase-10-header-hml/mobile-claro.png), [mobile escuro](fase-10-header-hml/mobile-escuro.png).

## Invariância operacional

Comparados, em cada um dos 12 commits de snapshot e na interface final, os caminhos `scripts/collectors`, `scripts/automation`, `src/domain`, `supabase`, `.github/workflows/deploy-pages.yml`, `package.json`, `package-lock.json` e `vite.config.ts` contra `91d42d5`: **nenhuma diferença**. Desde a referência, os demais commits anteriores à interface alteraram apenas documentação/capturas e snapshots. Assim, a mudança visual não reinicia a sequência operacional.

## Sequência retrospectiva

Foram verificados os 12 horários consecutivos de **09:22 a 11:12 BRT em 09/10**, sem filtrar falhas para selecionar apenas sucessos. Cada intervalo tem uma única run operacional `workflow_dispatch`, prepare e deploy concluídos, etapa de persistência bem-sucedida e um commit de snapshot correspondente. O primeiro evento traz head anterior ao push, mas o checkout real de `91d42d5` foi confirmado no log e no pai do commit de persistência.

Blumenau permaneceu atualizado em todos: 3,90 m (leitura 09:00), 3,86 m (10:00), 3,82 m (11:00). Foram recalculados idade da leitura, limite de duas horas e classificação Atenção, sem inconsistência. Leituras horárias repetidas entre coletas de dez minutos são esperadas; o horário oficial foi preservado.

**Correlação administrativa concluída:** exportação segura fornecida pelo solicitante às **13:23:11 BRT**, consultando somente os campos necessários. Para cada um dos 12 horários, há exatamente uma execução Cron `succeeded`, uma resposta da Edge **202 sem timeout**, e o run ID retornado corresponde à execução GitHub identificada abaixo. Persistência e deploy foram conferidos em cada run. **12/12 completos, sem falhas, lacunas ou mistura de revisões operacionais.** A exportação anterior, que terminava às 09:12, não foi usada para certificar esta sequência.

Evidências detalhadas permanecem locais em `.codex_work/v1-final-github-cycles.json`, `.codex_work/v1-final-complete-cycles.json` e `.codex_work/v1-final-admin-20261009-132311.json`. Nenhum token, header de autorização ou conteúdo administrativo bruto foi incluído no repositório/Pages. Não houve alteração em Cron, Edge, secrets, permissões, motor ou pipeline. A verificação foi retrospectiva, sem aguardar uma nova sequência de 12 ciclos por polling do agente.

A continuidade posterior também é evidenciada pelo deploy do ajuste às 13:23. Snapshot das **13:22:21 BRT**, persistido em `be5052e`, idêntico no Git e Pages: SHA-256 `9a1dd4e8eaa8f232eba5e34c29163b3c44f8d50f2b442a3d125f6b211f138e77`. Blumenau: 3,79 m, leitura 13:00 BRT, Atenção, descendo, atualizado. A comparação operacional final continua sem diferenças.

**Não restam pendências para esta homologação técnica HML.** A operação continua sujeita à disponibilidade das fontes e dos provedores; a evidência confirma o intervalo observado, não uma garantia de disponibilidade futura. PRD, GO-LIVE e Teams não foram iniciados.

## Matriz pública GitHub / snapshots

| Ciclo BRT | Run | Snapshot / commit | Pages concluído BRT | Blumenau |
|---|---|---|---|---|
| 09:22:00 | [37929548766](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37929548766) | 09:22:22 / babe152 | 09:23:17 | 3,9 m · 09:00:00 · atualizado |
| 09:32:00 | [37930661233](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37930661233) | 09:32:25 / 96b6368 | 09:33:11 | 3,9 m · 09:00:00 · atualizado |
| 09:42:00 | [37931756727](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37931756727) | 09:42:26 / 158a2ec | 09:43:16 | 3,9 m · 09:00:00 · atualizado |
| 09:52:00 | [37932863843](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37932863843) | 09:52:26 / 144f434 | 09:53:21 | 3,9 m · 09:00:00 · atualizado |
| 10:02:00 | [37934002726](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37934002726) | 10:02:26 / c8aaed4 | 10:05:44 | 3,9 m · 09:00:00 · atualizado |
| 10:12:00 | [37935149030](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37935149030) | 10:12:19 / a9453e1 | 10:13:16 | 3,86 m · 10:00:00 · atualizado |
| 10:22:00 | [37936322462](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37936322462) | 10:22:20 / a9b7437 | 10:23:17 | 3,86 m · 10:00:00 · atualizado |
| 10:32:00 | [37937517503](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37937517503) | 10:32:17 / e0bfbf7 | 10:33:24 | 3,86 m · 10:00:00 · atualizado |
| 10:42:00 | [37938710962](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37938710962) | 10:42:17 / 921be7c | 10:43:04 | 3,86 m · 10:00:00 · atualizado |
| 10:52:00 | [37939929075](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37939929075) | 10:52:16 / c8c61dd | 10:53:20 | 3,86 m · 10:00:00 · atualizado |
| 11:02:00 | [37941168873](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37941168873) | 11:02:20 / 127af42 | 11:03:26 | 3,86 m · 10:00:00 · atualizado |
| 11:12:00 | [37942401588](https://github.com/EduardoLamim/el-nino-jbs-hml/actions/runs/37942401588) | 11:12:18 / c44aa47 | 11:13:00 | 3,82 m · 11:00:00 · atualizado |
