// Rotas de seção confirmadas no bundle público app-CS6ae12O.js em 01/10/2026.
const dc = 'https://monitoramento.defesacivil.itajai.sc.gov.br';
export const urls = {
  situacao_atual: `${dc}/api/v1/situacao-atual`,
  alertas_ativo: `${dc}/api/v1/alertas/ativo`,
  rios: `${dc}/monitoramento/rios?municipio_id=1`,
  chuvas: `${dc}/monitoramento/chuvas?municipio_id=1`,
  barragens: `${dc}/monitoramento/barragens?municipio_id=1`,
  epagri: 'https://ciram.epagri.sc.gov.br/api/prevmuni-server/resources/listaJson/muni',
} as const;
// Endpoints encontrados no bundle oficial prevmuni-client/main-es2015.74ee76f5927cfa0d3442.js.
// Código confirmado também no seletor municipal oficial prev-modelo-setamuni-new.html.
export const codigoItajai = '4208203';
export const urlPrevisaoEpagri = 'https://ciram.epagri.sc.gov.br/api/prevmuni-server/resources/listaJson/prevMuniDia?cdCidade=4208203';
