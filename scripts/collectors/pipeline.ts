import { parseStatus, type Status } from '../../src/domain/contracts';
import { criarHttp, type Transport, type Requisicao } from './http';
import { urls, urlPrevisaoEpagri } from './sources';
import { extrairPagina } from './structured';
import { normalizarAlertas, normalizarBarragens, normalizarChuvas, normalizarRios, normalizarSituacao } from './normalize';
import { normalizarEpagri, validarMunicipioEpagri } from './epagri';
import { aplicarMotor } from '../../src/domain/alert-engine';
import { coletarBlumenau } from './blumenau';

type Fonte = keyof typeof urls;
type Fragmento = Partial<Pick<Status, 'situacao_oficial' | 'alertas_oficiais' | 'rios' | 'chuvas' | 'barragens' | 'previsao'>>;
interface Resultado { dados: Fragmento; avisos: string[]; bruto?: string }
export function statusVazio(): Status {
  return parseStatus({ versao: 1, atualizado_em: null,
    nivel_jbs: { nivel: null, desde: null, gatilhos: [] }, situacao_oficial: null, alertas_oficiais: null,
    rios: {}, chuvas: {}, barragens: {},
    previsao: { fonte: 'Epagri/Ciram', modelo: null, abrangencia: null,
      municipio: null, codigo_municipio: null, uf: null, regiao: null,
      atualizado_em: null, coletado_em: null, disponibilidade: 'indisponivel', dias: [] },
    qualidade_monitoramento: { estado: 'degradado', problemas: ['Dados operacionais ainda não coletados.'] }, fontes: {},
  });
}
async function fonte(id: Fonte, get: (url: string) => Promise<string>, requisicoes: Requisicao[]): Promise<Resultado> {
  const texto = await get(urls[id]);
  if (id === 'situacao_atual') return { dados: { situacao_oficial: normalizarSituacao(JSON.parse(texto)) },
    avisos: ['Situação oficial não informa qualidade ou validade temporal.'] };
  if (id === 'alertas_ativo') {
    const a = normalizarAlertas(JSON.parse(texto));
    return { dados: { alertas_oficiais: a.alertas }, avisos: a.avisos, bruto: a.bruto };
  }
  if (id === 'epagri') {
    validarMunicipioEpagri(JSON.parse(texto));
    const payload = await get(urlPrevisaoEpagri);
    const previsao = normalizarEpagri(JSON.parse(payload), requisicoes.at(-1)!.coletado_em);
    return { dados: { previsao: previsao.previsao }, avisos: previsao.avisos };
  }
  const estacoes = extrairPagina(texto, id);
  if (id === 'rios') {
    const rios = normalizarRios(estacoes);
    return { dados: { rios: rios.rios }, avisos: [...rios.avisos, 'Séries sem qualidade explícita mantêm qualidade null; validade não inferida.'] };
  }
  if (id === 'chuvas') return { dados: { chuvas: normalizarChuvas(estacoes) },
    avisos: ['Campos de chuva ausentes ficam null; acumulados e séries não são recalculados.'] };
  const barragens = normalizarBarragens(estacoes);
  const ausentes = ['Barragem Taió', 'Barragem Ituporanga', 'Barragem José Boiteux']
    .filter(nome => !Object.values(barragens).some(b => b.nome === nome));
  return { dados: { barragens }, avisos: ausentes.map(nome => `${nome}: ausente na resposta.`) };
}
export async function coletar(transport?: Transport, anterior?: unknown): Promise<Status> {
  const status = statusVazio();
  const regional = coletarBlumenau(transport);
  const resultados = await Promise.all((Object.keys(urls) as Fonte[]).map(async id => {
    const requisicoes: Requisicao[] = [];
    try {
      const resultado = await fonte(id, criarHttp(requisicoes, transport), requisicoes);
      // Valida cada fragmento isoladamente antes de agregá-lo.
      parseStatus({ ...statusVazio(), ...resultado.dados });
      return { id, requisicoes, resultado, erro: null };
    } catch (erro) {
      return { id, requisicoes, resultado: null, erro: erro instanceof Error ? erro.message : String(erro) };
    }
  }));
  const problemas: string[] = [];
  for (const r of resultados) {
    if (r.resultado) Object.assign(status, r.resultado.dados);
    const dados = r.resultado?.dados;
    const medicoes = Object.values(dados?.rios ?? dados?.chuvas ?? dados?.barragens ?? {});
    const estados = medicoes.map(e => e.qualidade);
    const qualidade = r.erro ? 'indisponivel' : estados.length && new Set(estados).size === 1 ? estados[0]! : null;
    status.fontes[r.id] = {
      nome: r.id === 'epagri' ? 'Epagri/Ciram' : 'Defesa Civil de Itajaí', url: urls[r.id],
      qualidade, atualizado_em: dados?.situacao_oficial?.atualizado_em ?? dados?.previsao?.atualizado_em ?? null,
      atualizacao_esperada_segundos: null,
      coletado_em: r.requisicoes[0]!.coletado_em, resultado: r.erro ? 'falha' : 'sucesso',
      motivo: r.erro, avisos: r.resultado?.avisos ?? [], requisicoes: r.requisicoes,
      ...(r.resultado?.bruto === undefined ? {} : { payload_nao_normalizado_json: r.resultado.bruto }),
    };
    if (r.erro) problemas.push(`${r.id}: ${r.erro}`);
    if (r.id === 'epagri' && r.erro) status.previsao.coletado_em = r.requisicoes.at(-1)!.coletado_em;
    for (const aviso of r.resultado?.avisos ?? []) problemas.push(`${r.id}: ${aviso}`);
    for (const e of medicoes) if (e.qualidade !== 'atualizado') problemas.push(`${r.id}/${e.nome}: qualidade ${e.qualidade ?? 'não informada'}.`);
  }
  const blumenau = await regional;
  status.atualizado_em = new Date().toISOString(); // geração do artefato, não medição.
  const sucessos = resultados.filter(r => !r.erro).length;
  status.qualidade_monitoramento = { estado: sucessos === 0 ? 'degradado' : problemas.length ? 'parcialmente_degradado' : 'atualizado', problemas };
  const operacional = aplicarMotor(parseStatus(status), anterior);
  // Indicador informativo isolado: nunca é entrada, gatilho ou qualidade do motor local.
  operacional.blumenau = blumenau;
  return parseStatus(operacional);
}
