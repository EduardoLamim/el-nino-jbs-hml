# V1 — alerta de agravamento e Mapa de Decisões do Terminal

Entrega adicional à V1, sem reabertura da Fase 10. HML somente.

## Comportamento

- Uma instância global acompanha `status.nivel_jbs.nivel`, usando a ordem de severidade existente. Não modifica o motor nem o Impacto JBS manual.
- A primeira leitura válida estabelece a referência, inclusive quando elevada. Ausência temporária de dado preserva a última referência válida. Acompanhamento limitado às transições efetivamente observadas nesta aba; não reconstrói eventos entre coletas ou durante o fechamento da página.
- Todos os agravamentos, inclusive saltos, exibem anterior → novo. Avisos pendentes permanecem até reconhecimento, com indicação separada do nível atual. Reconhecer não altera o nível nem os Planos de Ação.
- Nível igual e redução não geram novo alarme. Navegação entre páginas preserva a referência e os avisos.
- “Habilitar som” cria/resume Web Audio por gesto e reproduz um teste. Cada aviso emite três pulsos (último termina em 2,1 segundos), sem repetição automática. Reconhecimento/desabilitação interrompem o som. Novo agravamento substitui os pulsos em andamento. Bloqueio de áudio mantém o aviso visual e solicita habilitação.
- Habilitação é por aba; recarregar exige novo gesto. Volume, saída de áudio, suspensão do dispositivo e políticas do navegador dependem do equipamento do operador.
- O botão no Plano de Ação abre um diálogo modal amplo, com zoom de 100% a 400%, rolagem, ajuste à largura, fechamento explícito/Escape e retorno de foco. Os planos existentes permanecem íntegros.

## Imagem definitiva

Adicionar/substituir **`public/assets/mapa-decisoes-terminal.png`**, em PNG de resolução suficiente para leitura. O arquivo será publicado em `assets/mapa-decisoes-terminal.png` pelo build existente; não é necessário alterar código. Criar a pasta `public/assets` se necessário, versionar o PNG e publicar pelo fluxo HML normal. Não colocar secrets ou informações individuais no asset público.

Não foi identificado um Mapa de Decisões definitivo nos materiais disponíveis: há logos, referência visual Operational Hub e fotografias portuárias. Nenhum conteúdo substituto foi inventado ou publicado. Até o PNG existir, o modal informa indisponibilidade e permite nova tentativa ao reabrir.

## Validação focada

- `npx vitest run tests/v1-alert-map.test.tsx tests/v1-alert-audio.test.ts`: 16 testes aprovados (todas as seis transições de agravamento, primeiro carregamento/StrictMode, repetição, reconhecimento, redução, dados ausentes, autoplay bloqueado, habilitação, zoom e erro de imagem; programação/limpeza dos pulsos).
- `npm run lint`: aprovado.
- `npm run pages:build` com configuração pública HML: typecheck da aplicação/Edge e build aprovados. Aviso conhecido do Vite sobre chunk acima de 500 kB, sem falha.
- Edge headless, 1440×1000 e 768×1000: testes focados aprovados para carregamento elevado sem alarme, habilitação real do AudioContext, agravamento, repetição, reconhecimento, redução silenciosa, arquivo ausente, zoom/rolagem, Escape, foco e planos preservados. Respostas simuladas somente no navegador; nenhuma alteração de estado remoto. A imagem usada para exercitar carregamento foi interceptada no teste e não faz parte da entrega.
- A suíte completa não foi executada manualmente. O usuário autorizou exclusivamente a suíte automática já existente para CI/publicação HML; workflows preservados.

## Homologação manual restante

1. No HML, clicar “Habilitar som” e confirmar os três sinais na saída/volume utilizados pelo operador. Automação verifica a execução da API, não a audibilidade física.
2. Fornecer/publicar o PNG definitivo e validar legibilidade em desktop/tablet usando zoom e rolagem.

Sem alterações de Cron, Edge, pipeline, concorrência, coleta, permissões ou secrets. Sem PROD e sem WhatsApp.
