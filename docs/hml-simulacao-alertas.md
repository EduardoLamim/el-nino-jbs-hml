# Simulação de avisos — somente HML/desenvolvimento

Abra **Diagnóstico de avisos — HML**, abaixo do header, e selecione **Iniciar simulação**. Habilite o áudio no header por interação explícita. A sessão começa em Normalidade/Impacto inativo, sem alarme.

Selecione Atenção → Alerta → Emergência para testar a progressão, ou resete e vá diretamente a Alerta/Emergência para testar saltos. Há ações para ativação/encerramento simulado de Impacto e Emergência + Impacto simultâneos. Reconhecimento, padrões sonoros, prioridade da sirene, limites de duração, autoplay e avisos visuais são os mesmos do componente `LevelAlert`/serviço `AlertAudio` operacional.

**Resetar** interrompe o áudio e limpa os avisos, voltando à Normalidade simulada. **Encerrar simulação e voltar aos dados reais** restaura imediatamente os dados reais mais recentes, sem alarme artificial. Recarregar encerra a simulação e exige nova habilitação de áudio. Nenhum estado simulado é persistido.

Durante a simulação, a área operacional fica oculta (incluindo ações de Impacto real) e os avisos reais ficam suspensos nesta aba. Coleta e assinaturas existentes continuam inalteradas. A ferramenta não importa clientes Supabase, APIs de Impacto, Edge Functions ou persistência e não modifica snapshots/datasets. Use outra aba fora da simulação para acompanhamento operacional durante a homologação.

## Restrição de build

- `npm run dev`: disponível em desenvolvimento local, salvo `APP_ENV` explicitamente diferente de `hml`/`development`.
- Build: exige **APP_ENV=hml** e **ENABLE_HML_SIMULATION=true**. Se definidos, repositório e URL Supabase precisam corresponder exatamente ao HML autorizado.
- Workflows existentes configuram APP_ENV=hml exclusivamente em `EduardoLamim/el-nino-jbs-hml`; em outro repositório usam production. Não foram alterados Cron, gatilhos, concorrência, pipeline de coleta ou permissões.
- Build padrão e APP_ENV=production: constante false; o bundler elimina o componente de simulação. Não há ativação por URL, localStorage ou controle do navegador. PRD deve manter APP_ENV=production e não habilitar a flag.

Os únicos valores substituídos são as props de entrada do componente de avisos durante a sessão de simulação. Os dados oficiais e o estado real de Impacto nunca recebem esses valores.
