import { z } from 'zod';
import { previsaoSchema } from '../../src/domain/contracts';
import { codigoItajai } from './sources';

const nomeItajai = (nome: string) => nome.normalize('NFC').trim() === 'Itajaí';
export function validarMunicipioEpagri(payload: unknown): void {
  const municipios = z.array(z.object({ texto: z.string(), valor: z.string(), uf: z.string().optional() })).parse(payload);
  const encontrados = municipios.filter(m => m.valor === codigoItajai || nomeItajai(m.texto));
  if (encontrados.length !== 1 || encontrados[0]?.valor !== codigoItajai || !nomeItajai(encontrados[0].texto)
      || (encontrados[0].uf !== undefined && encontrados[0].uf !== 'SC')) {
    throw new Error('Catálogo Epagri não confirma Itajaí com código 4208203 (SC).');
  }
}
const ausente = (valor: string | null | undefined) => valor == null || ['', 'N/D', 'null'].includes(valor.trim());
function medida(valor: string | null | undefined, unidade: string): number | null {
  if (ausente(valor)) return null;
  const texto = valor!.trim();
  if (!texto.endsWith(unidade)) throw new Error(`Unidade inesperada: ${texto}; esperado ${unidade}.`);
  const numerico = texto.slice(0, -unidade.length).trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(numerico)) throw new Error(`Medida inválida: ${texto}`);
  return z.number().finite().parse(Number(numerico));
}
const textoMedida = z.string().nullable();
const diaSchema = z.object({
  nmMunicipio: z.string(), uf: z.string().optional(), nmCondicao: z.string().nullable(),
  data: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  tempMin: textoMedida, tempMax: textoMedida, mmChuva: textoMedida,
  dirVento: textoMedida, velVentoMed: textoMedida, velVentoMax: textoMedida,
  umidadeRel: textoMedida, umidadeRelMinMax: textoMedida,
  fenomeno1: z.unknown().optional(), fenomeno2: z.unknown().optional(),
  fenomeno3: z.unknown().optional(), fenomeno4: z.unknown().optional(),
});
export function normalizarEpagri(payload: unknown, coletadoEm: string) {
  const dias = z.array(diaSchema).min(1).parse(payload);
  const datas = new Set<string>();
  const avisos = [
    'Produto municipal JSON oficial não identifica modelo nem timestamp de emissão; campos mantidos null.',
    'UF não informada no payload observado; município validado por nome e código oficial 4208203 de Itajaí/SC.',
  ];
  const previsao = previsaoSchema.parse({
    fonte: 'Epagri/Ciram', modelo: null, abrangencia: 'municipal', municipio: 'Itajaí',
    codigo_municipio: codigoItajai, uf: dias.every(d => d.uf === 'SC') ? 'SC' : null, regiao: null,
    atualizado_em: null, coletado_em: coletadoEm, disponibilidade: 'disponivel',
    dias: dias.map(d => {
      if (!nomeItajai(d.nmMunicipio) || (d.uf !== undefined && d.uf !== 'SC')) throw new Error('Previsão Epagri não corresponde a Itajaí/SC.');
      const [dia, mes, ano] = d.data.split('/');
      const data = z.string().date().parse(`${ano}-${mes}-${dia}`);
      if (datas.has(data)) throw new Error(`Data de previsão duplicada: ${data}`);
      datas.add(data);
      const fenomenos = [d.fenomeno1, d.fenomeno2, d.fenomeno3, d.fenomeno4].filter(f => f != null).map(f => {
        // Campos cuja semântica foi confirmada no componente oficial de fenômenos.
        const p = z.object({ descricao: z.string(), cdIcone: z.union([z.string(), z.number()]).nullable() }).parse(f);
        return { codigo: p.cdIcone, descricao: p.descricao };
      });
      let minima: number | null = null, maxima: number | null = null;
      if (!ausente(d.umidadeRelMinMax)) {
        const partes = d.umidadeRelMinMax!.split('-');
        if (partes.length !== 2) throw new Error('Faixa de umidade Epagri desconhecida.');
        minima = medida(partes[0], '%'); maxima = medida(partes[1], '%');
      }
      return { data, periodo: null, condicao: d.nmCondicao, descricao: d.nmCondicao,
        temperatura_min_c: medida(d.tempMin, '°C'), temperatura_max_c: medida(d.tempMax, '°C'),
        probabilidade_precipitacao_percentual: null, precipitacao_mm: medida(d.mmChuva, 'mm'),
        vento: { direcao: ausente(d.dirVento) ? null : d.dirVento,
          velocidade_media_kmh: medida(d.velVentoMed, 'km/h'), rajada_kmh: medida(d.velVentoMax, 'km/h') },
        umidade: { relativa_percentual: medida(d.umidadeRel, '%'), minima_percentual: minima, maxima_percentual: maxima },
        fenomenos,
      };
    }),
  });
  return { previsao, avisos };
}
