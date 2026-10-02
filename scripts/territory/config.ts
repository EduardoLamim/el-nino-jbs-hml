// Somente os agregados e referências autorizados na solicitação da Fase 04.
export const agregados: Readonly<Record<string, number>> = {
  'São Vicente': 67, Cordeiros: 38, 'São João': 37, 'Cidade Nova': 29, Murta: 16,
  'Santa Regina': 11, 'Dom Bosco': 11, Espinheiros: 10, Fazenda: 10, 'Barra do Rio': 10,
  'São Judas': 9, Centro: 8, Itaipava: 7, Ressacada: 6, 'Vila Operária': 5,
  'Rio do Meio': 3, Fazendinha: 3, Carvalho: 2, 'São Roque': 2, 'Praia Brava': 2,
  Imaruí: 2, 'Portal 2': 1, 'Brilhante I': 1, KM12: 1, Paciência: 1,
};
export const zonas = [
  ['Salseiros', 'Espinheiros', 'Espinheirinhos', 'Volta de Cima', 'São Roque', 'São Francisco de Assis', 'Santa Regina', 'Portal I e II'],
  ['Cordeiros', 'Murta'], ['São Vicente', 'Rio Bonito', 'Bambuzal', 'Nilo Bittencourt'],
  ['Cidade Nova', 'Carvalho', 'Ressacada'], ['São João', 'Barra do Rio', 'Imaruí', 'Nova Brasília'],
  ['São Judas', 'Dom Bosco', 'Nossa Senhora das Graças'], ['Centro', 'Vila Operária'],
  ['Fazenda', 'Fazendinha', 'Cabeçudas', 'Praia Brava'],
  ['Itaipava', 'Rio do Meio', 'Canhanduba', 'KM12', 'Arraial dos Cunha', 'Bahia', 'São Pedro'],
  ['Paciência', 'Brilhante I', 'Brilhante II', 'Laranjeiras', 'Campeche', 'Limoeiro'],
];
export function zonaExata(nome: string): number | null {
  if (nome === 'Portal 2') return 1; // Portal II, equivalência explicitamente autorizada.
  const i = zonas.findIndex(z => z.includes(nome));
  return i < 0 ? null : i + 1;
}
export const baseRest = 'https://arcgis.itajai.sc.gov.br/server/rest/services/';
export const fonteBairros = `${baseRest}Hosted/bairros_Itajai/FeatureServer/0`;
export const fonteHistorico = `${baseRest}historico_inundacoes/FeatureServer`;
export const fonteVias = `${baseRest}Hosted/View__vias_alagamentos/FeatureServer/1`;
export const fonteHand = `${baseRest}Hosted/vias_atingidas_nivel_inundacao_publica_view/FeatureServer/0`;
// Agrupamento documental por período; 2011 anual/setembro reunidos, sem contar enchentes.
export const periodos = ['1983', '1984', '2001', '2008', '2011', '2011', '2013-07', '2013-09', '2014-06', '2015-10'];
