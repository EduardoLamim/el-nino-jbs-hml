# Teams HML — layout definitivo e troca de Workflow

Renderer: bloco compacto com cabeçalho institucional, ALTERAÇÃO DE NÍVEL, nível de destino destacado, transição, data/hora America/Sao_Paulo e Abrir painel HML. Fundo semântico nativo Adaptive Cards 1.2: warning (Atenção/Alerta; amarelo/âmbar depende do host), attention (Emergência/Impacto confirmado) e good (Normalização/Impacto encerrado). Redução usa cor do destino e rótulo explícito. Impacto permanece dimensão independente, com indicação manual.

Somente is_test=true mostra [HML — TESTE] e SIMULAÇÃO em texto compacto. Eventos operacionais não contêm esses rótulos nem campos Ambiente/Evento; continuam bloqueados para envio pelo worker. Horários ausentes não são inventados. Ressalva de publicação não confirmada é preservada nos registros não sintéticos. Payloads já congelados não são reescritos.

48 testes focados passaram: apresentação, cores, português/UTF-8, transições, Impacto, rótulos e transporte existente. Lint/typecheck/build fazem parte dos gates. Mudança de apresentação não toca motor, coleta, dispatcher, persistência, credenciais ou reconciliação.

Troca do Workflow: somente TEAMS_WORKFLOW_URL_HML, via entrada oculta e Management API. URL antiga e Workflow anterior permanecem disponíveis no Power Automate; não são desativados. Retorno, se necessário, exige obter a URL anterior diretamente do Workflow anterior e repor somente esse secret por entrada oculta. Não manter URLs em arquivos/evidências. Comparação de metadados dos demais secrets somente em memória; registrar resultado booleano sem digests.

Integração final depende de autorização específica para um único envio sintético e confirmação visual do operador. Não realizar replay automático após resposta incerta. Manter mode=disabled, live_enabled=false e fila preservada até essa autorização. O rodapé é responsabilidade do Workflow do Power Automate, não do JSON do card.

Referência de estilos nativos: https://learn.microsoft.com/pt-br/adaptive-cards/schema-explorer/container
