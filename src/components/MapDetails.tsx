import type { EstacaoHidrologica, EstadoRio } from '../domain/contracts';
import type { Territorio } from '../domain/territory';
import { horario, medida, qualidade, tendencia } from '../utils/presentation';
import { rotuloNivel } from '../utils/format';

export function StationDetails({ codigo, estacao, estado }: { codigo: string; estacao?: EstacaoHidrologica; estado?: EstadoRio }) {
  return <article className="map-detail" aria-label={`Detalhe ${codigo}`}><p className="eyebrow">Condição da estação</p><h3>{codigo} · {estacao?.nome ?? estado?.nome ?? 'Identificação não informada'}</h3>
    <p>Estado vigente: <strong>{rotuloNivel(estado?.nivel ?? null)}</strong></p><p>Nível da leitura: {medida(estacao?.nivel_m, 'm')} · {tendencia(estacao?.tendencia)}</p>
    <p className="meta">Leitura: {horario(estacao?.medido_em)} · {estacao ? qualidade(estacao.qualidade) : 'Indisponível'}</p>
    {estado?.stale && <p className="stale">Última condição conhecida preservada — fonte degradada.</p>}
    <dl className="thresholds"><div><dt>Atenção</dt><dd>{medida(estacao?.limites.atencao_m, 'm')}</dd></div><div><dt>Alerta</dt><dd>{medida(estacao?.limites.alerta_m, 'm')}</dd></div><div><dt>Emergência</dt><dd>{medida(estacao?.limites.emergencia_m, 'm')}</dd></div></dl>
    <p className="meta">Localização: {estacao?.latitude != null && estacao.longitude != null ? `${estacao.latitude}, ${estacao.longitude}` : 'Coordenadas não informadas'}</p>
    <a href="#/monitoramento/rios">Ver no Monitoramento</a>
  </article>;
}

export function NeighborhoodDetails({ bairro }: { bairro: Territorio['bairros'][number] }) {
  return <article className="map-detail" aria-label={`Detalhe territorial ${bairro.nome}`}><h3>{bairro.nome}</h3>
    <p>Zona Administrativa da Defesa Civil: {bairro.zona_defesa_civil ?? 'Não informada'}</p>
    <h4>Exposição JBS</h4><p><strong>{bairro.colaboradores_jbs}</strong> colaboradores residentes</p>
    <h4>Contexto histórico</h4>
    <p>{bairro.historico_inundacao.possui_registro ? 'Área presente em registros históricos de inundação.' : 'Sem interseção nos registros históricos consultados; não significa ausência de possibilidade de inundação.'}</p>
    {bairro.historico_inundacao.referencias.length > 0 && <p className="meta">Períodos registrados: {bairro.historico_inundacao.referencias.map(r => r.periodo).join(', ')}.</p>}
    <p>{bairro.vias_historicas_alagamento.possui_registro ? 'Há interseção com trechos/feições associados a registros históricos de inundação.' : 'Sem interseção com trechos históricos no conjunto consultado.'}</p>
    <p className="meta">Indicadores agregados de interseção, incluindo contato de borda. Não indicam que todo o bairro foi ou será inundado. Não representam a condição atual.</p>
  </article>;
}

export function LocalityDetails({ localidade }: { localidade: Territorio['localidades'][number] }) {
  return <article className="map-detail" aria-label={`Detalhe territorial ${localidade.nome_exibicao}`}><h3>{localidade.nome_exibicao}</h3>
    <p>{localidade.colaboradores_jbs} colaboradores residentes · Zona Administrativa da Defesa Civil: {localidade.zona_defesa_civil ?? 'Não informada'}</p>
    <p>{localidade.fundamento}</p><p>Sem geometria própria. Agregado mantido separadamente, sem ponto ou polígono atribuído no mapa.</p>
    <p>Contexto histórico: não avaliado para esta localidade.</p>
  </article>;
}
