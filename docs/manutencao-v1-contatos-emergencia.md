# Manutenção V1 — Central de Planos e contatos de emergência (HML)

Escopo: conteúdo e consulta de contatos; nenhuma alteração em motor, coleta, Cron, Teams, Impacto JBS, Supabase ou PRD.

## Conteúdo

Áreas mantidas: Operações, Comercial, QSSMS, TI, RH e Manutenção. Removidas somente Atendimento, Documentação, Financeiro, Faturamento, Suprimentos e Almoxarifado. O plano TI permanece integral.

Atenção: removido o antigo item 05 “Avaliar o próximo turno e possíveis dificuldades de deslocamento.” (6 → 5 itens).
Alerta: removido o antigo item 05 “Avaliar condições de entrada e saída do próximo turno.” (8 → 7 itens).

### Impacto → Emergência

| Antes em Impacto | Depois em Emergência |
| --- | --- |
| Avaliar a extensão do impacto e áreas/infraestruturas envolvidas. | Transferida integralmente, novo item 02. |
| Avaliar condições dos acessos e movimentação de pessoas. | Consolidada com “Avaliar condições dos acessos ao Terminal.”: “Avaliar condições dos acessos ao Terminal e movimentação de pessoas.” |
| Avaliar necessidade de restrição, reorganização ou suspensão das atividades afetadas pelos responsáveis competentes. | Consolidada com “Avaliar necessidade de reorganização da operação e dos deslocamentos.”: “Avaliar, pelos responsáveis competentes, a necessidade de restrição, reorganização ou suspensão das atividades afetadas e de reorganização dos deslocamentos.” |

Impacto: 9 → 6 orientações; os seis itens sem “avaliar” permanecem literalmente iguais e na mesma ordem. Emergência: 8 → 9 orientações; seis itens preservados, dois consolidados, um acrescentado. A numeração é gerada pela lista. Não houve mudança de regras operacionais.

## Contatos e fontes oficiais

Consulta em 23/10/2026. Telefones 199, 193, 192 e 190 confirmados em https://defesacivil.itajai.sc.gov.br/telefones-por-ocorrencia/ . CELESC 0800 048 0196 em https://www.celesc.com.br/fale-conosco/canais-atendimento .

| Contato | Endereço de referência | Fonte / ressalva |
| --- | --- | --- |
| Defesa Civil | Avenida Governador Adolfo Konder, 1811, Cidade Nova, Itajaí/SC, 88308-003 | Página oficial de telefones acima, rodapé municipal. |
| Bombeiros | Avenida Sete de Setembro, 1878, Fazenda, Itajaí/SC | CBMSC: https://www.cbm.sc.gov.br/index.php/component/icagenda/1093-cafe-com-veteranos-em-itajai?Itemid=101&date=2026-05-14-16-00 ; sede do 7º BBM também documentada em https://documentoscbmsc.cbm.sc.gov.br/uploads/7e682d3cf04d1cf397b7fab0e85164fa.pdf . |
| SAMU | A confirmar | O portal municipal https://saude.itajai.sc.gov.br/a/132 informa Sete de Setembro, 1878, junto aos Bombeiros, mas o cadastro oficial CNES https://cnes2.datasus.gov.br/Mod_Ambulatorial.asp?VCo_Unidade=4208207258224 aponta unidade USB em Cordeiros. Não selecionar silenciosamente uma base; confirmar qual unidade é pertinente ao plano. Telefone 192 confirmado. |
| Polícia Militar | Rua Felipe Schimidt, 257, Centro, Itajaí/SC, 88301-040 | https://pm.sc.gov.br/unidades/3crpm1bpm-1-batalhao-de-policia-militar ; grafia do logradouro preservada conforme cadastro oficial. |
| CELESC | Rua Blumenau, 1414, São João, Itajaí/SC | https://www.celesc.com.br/fale-conosco/locais-de-atendimento ; loja de atendimento, explicitamente diferenciada de base de despacho de emergência. |

Origem JBS: pendente de confirmação do endereço físico/acesso do Terminal. A página oficial https://jbsterminais.com.br retornou 403 na consulta; não foi presumido endereço a partir de terceiros. Todas as rotas ficam indisponíveis até confirmar origem e destino. Todos os tempos ficam “A confirmar”; não foram calculados ou inventados.

## Manutenção futura

`src/content/emergency-contacts.ts`: união tipada external/internal; id, nome, descrição, telefone; responsabilidade opcional para internos. Externos têm endereço com status confirmed/pending/not-applicable, fonte e travelMinutes estático. terminalOrigin precisa de endereço confirmado e fonte antes de liberar Google Maps; nenhuma consulta de trânsito. Não incluir contatos pessoais sem autorização de publicação. internalContacts começa vazio.

`ContactCard` atende ambas as categorias. Modal nativo com Escape, contenção de foco, retorno ao botão, abas com setas/Home/End, feedback acessível de cópia e links tel. Falha no clipboard mantém telefone disponível para cópia manual. Google Maps usa origem/destino confirmados, driving, nova aba e noopener/noreferrer.

## Validação e publicação

Resultados da suíte, build, CI e publicação registrados ao concluir esta manutenção. Publicação limitada a EduardoLamim/el-nino-jbs-hml. Promoção PRD depende de autorização posterior.

Validações locais: 495 testes aprovados (493 na execução paralela; os dois testes com timeout de inicialização Python/PowerShell aprovados na repetição isolada, com 3 testes no conjunto). Nove testes novos de contatos/conteúdo. Lint, typecheck frontend/Edge, build Pages e validação do artefato (27 arquivos) aprovados. Browser: desktop, 390 px e 320 px; temas claro/escuro; abertura, abas, estado interno vazio, cópia com confirmação, fechamento por botão/Escape e retorno do foco. Links tel inspecionados sem realizar chamadas; rotas condicionais validadas em teste, indisponíveis na configuração publicada por origem pendente.

Publicação pendente: em 23/10/2026, git fetch e GitHub CLI falharam na conexão HTTPS com github.com/api.github.com (timeout TCP/443). O conector GitHub também falhou no transporte HTTP. Nenhum push ou deploy foi iniciado nesta rodada; CI remoto e Pages desta manutenção ainda não foram executados/confirmados. Ao restabelecer conectividade, atualizar origin/main, reaplicar somente este commit sobre a ponta HML, publicar sem force e verificar CI/deploy HML. PRD não foi acessado nem modificado.
