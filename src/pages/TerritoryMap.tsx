import { useEffect, useRef, useState } from 'react';
import { codigoHidrologicoSchema, nivelSchema, type Status } from '../domain/contracts';
import type { BairrosGeojson, Territorio } from '../domain/territory';
import { carregarBairros } from '../services/map-data';
import { rotuloNivel } from '../utils/format';
import { NeighborhoodDetails, LocalityDetails, StationDetails } from '../components/MapDetails';
import { criarMapa, cores, type MotorMapa, type Selecao } from '../map/engine';
import type { BaseMapa } from '../map/basemaps';
import { referenciasHistoricas } from '../domain/map-layers';
import { useHistoryLayer } from '../hooks/useHistoryLayer';
import { horario } from '../utils/presentation';

const nomesBase = { aerea: 'Aérea', cartografica: 'Cartográfica', simplificada: 'Simplificada' };
export const avisoHistorico = 'Áreas com registros históricos de inundação. Não representa a condição atual.';
export const avisoVias = 'Trechos/feições associados a registros históricos de inundação. Não representa a condição atual das vias.';

export function TerritoryMap({ status, territorio, geo }: { status: Status; territorio: Territorio; geo: BairrosGeojson | null }) {
  const [camadas, setCamadas] = useState({ bairros: true, exposicao: true, estacoes: true, historico: false, vias: false });
  const [base, setBase] = useState<BaseMapa>('simplificada');
  const [falhaBase, setFalhaBase] = useState<BaseMapa | null>(null);
  const [falhaMotor, setFalhaMotor] = useState(false);
  const [referencia, setReferencia] = useState('historico-0');
  const [selecao, setSelecao] = useState<Selecao>(null);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const target = useRef<HTMLDivElement>(null);
  const engine = useRef<MotorMapa | null>(null);
  const historico = useHistoryLayer(referencia, camadas.historico);
  const vias = useHistoryLayer('vias-historicas', camadas.vias);
  const selecionar = (s: Selecao) => { setSelecao(s); setDetalheAberto(s !== null); };
  useEffect(() => {
    try { engine.current = criarMapa(target.current!, s => { setSelecao(s); setDetalheAberto(s !== null); }, b => { setFalhaBase(b); setBase('simplificada'); }); }
    catch { setFalhaMotor(true); }
    return () => { engine.current?.dispose(); engine.current = null; };
  }, []);
  useEffect(() => { engine.current?.update(status, territorio, geo, camadas, selecao); }, [status, territorio, geo, camadas, selecao]);
  useEffect(() => { void engine.current?.base(base); }, [base]);
  useEffect(() => { engine.current?.history('historico', historico.geo); }, [historico.geo]);
  useEffect(() => { engine.current?.history('vias', vias.geo); }, [vias.geo]);
  const bairros = new Map(territorio.bairros.map(b => [b.id, b]));
  const maximo = Math.max(1, ...territorio.bairros.map(b => b.colaboradores_jbs));
  const bairro = selecao?.tipo === 'bairro' ? bairros.get(selecao.id) : null;
  const localidade = selecao?.tipo === 'localidade' ? territorio.localidades.find(l => l.id === selecao.id) : null;
  const selecionada = selecao?.tipo === 'estacao' ? selecao.id : null;
  const semCoordenadas = codigoHidrologicoSchema.options.filter(c => status.rios[c]?.latitude == null || status.rios[c]?.longitude == null);
  return <section className="territory-map" aria-label="Mapa territorial"><div className="page-heading"><p className="eyebrow">Exposição agregada · contexto territorial</p><h2>Mapa</h2><p>Este não é um mapa de alagamento em tempo real.</p></div>
    <fieldset className="map-bases"><legend>Base do mapa</legend>{(Object.keys(nomesBase) as BaseMapa[]).map(b => <label key={b}><input type="radio" name="base-mapa" checked={base === b} onChange={() => { setFalhaBase(null); setBase(b); }} />{nomesBase[b]}</label>)}</fieldset>
    {falhaBase && <p role="status" className="map-notice">Base {nomesBase[falhaBase]} indisponível. Simplificada ativada; as informações locais permanecem disponíveis. Você pode selecionar outra base ou tentar novamente.</p>}
    <div className="map-layout"><div className="map-main">
      <div className="map-toolbar" role="group" aria-label="Navegação do mapa"><button type="button" onClick={() => engine.current?.zoom(1)} aria-label="Ampliar mapa">+</button><button type="button" onClick={() => engine.current?.zoom(-1)} aria-label="Reduzir mapa">−</button><button type="button" onClick={() => engine.current?.fit()}>Enquadrar bairros</button>
        <button type="button" aria-label="Mover mapa para oeste" onClick={() => engine.current?.move(-1, 0)}>←</button><button type="button" aria-label="Mover mapa para norte" onClick={() => engine.current?.move(0, 1)}>↑</button><button type="button" aria-label="Mover mapa para sul" onClick={() => engine.current?.move(0, -1)}>↓</button><button type="button" aria-label="Mover mapa para leste" onClick={() => engine.current?.move(1, 0)}>→</button>
      </div>
      <div className="map-canvas ol-map" ref={target} tabIndex={0} role="region" aria-label="Mapa interativo de bairros e estações" />
      {(!geo || falhaMotor) && <p role="status">Mapa geométrico indisponível nesta leitura. Os detalhes existentes continuam acessíveis pelos seletores.</p>}
      <p className="map-attribution">{base === 'aerea' ? 'Prefeitura de Itajaí / Engemap — voo de dezembro de 2020. Imagem aérea de referência territorial, não é imagem em tempo real. Cobertura parcial: áreas sem imagem mantêm fundo neutro.' : base === 'cartografica' ? 'Prefeitura de Itajaí — base cartográfica municipal. Referência geográfica, sem condição operacional atual.' : 'Simplificada — limites municipais locais. Sem provedor externo de tiles.'}</p>
      <p className="meta">Amplie com os botões; arraste o mapa ou use as setas do teclado para mover. Consulte bairros e estações pelos seletores ou diretamente no mapa.</p>
      {semCoordenadas.length > 0 && <p className="meta">Sem coordenadas disponíveis para desenhar: {semCoordenadas.join(', ')}. Nenhuma posição foi estimada.</p>}
      <div className="map-legend" aria-label="Legenda do mapa"><div><h3>Condição atual</h3><p>Estações hidrológicas · última avaliação disponível</p><ul>{nivelSchema.options.map(n => <li key={n}><i style={{ background: cores[n] }} />{rotuloNivel(n)}</li>)}<li><i style={{ background: cores.desconhecido }} />Sem estado confirmado</li></ul><p className="meta">Contorno tracejado: atraso, indisponibilidade ou condição retida. Consulte o horário e a qualidade.</p></div>
        <div><h3>Contexto territorial</h3><p>Quantidade de colaboradores residentes</p><div className="exposure-scale" aria-hidden="true" /><p className="meta">Menor concentração → maior concentração (0 a {maximo}). Sem classificação operacional dos bairros.</p><p><span className="history-swatch" />Manchas históricas: violeta, contorno tracejado.</p><p><span className="roads-swatch" />Trechos históricos: azul tracejado.</p></div></div>
      <p className="map-disclaimer">Informações territoriais representam exposição e vulnerabilidade histórica e não significam impacto real atual.</p>
    </div><aside className="map-sidebar">
      <details className="card map-layer-controls" open><summary>Camadas do mapa</summary>
        {([['bairros', 'Limites dos bairros'], ['exposicao', 'Exposição agregada JBS'], ['estacoes', 'Estações hidrológicas DC01–DC11'], ['historico', 'Histórico de inundação'], ['vias', 'Vias com histórico de inundação']] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={camadas[key]} onChange={e => setCamadas(v => ({ ...v, [key]: e.target.checked }))} />{label}</label>)}
        {camadas.historico && <div className="historical-control"><label htmlFor="referencia-historica">Referência histórica</label><select id="referencia-historica" value={referencia} onChange={e => setReferencia(e.target.value)}>{referenciasHistoricas.map((r, i) => <option value={`historico-${i}`} key={r}>{r}</option>)}</select><p>{avisoHistorico}</p><p className="meta">As duas referências de 2011 não representam automaticamente dois eventos independentes.</p></div>}
        {camadas.vias && <p>{avisoVias}</p>}
        {([['Histórico', camadas.historico, historico], ['Vias históricas', camadas.vias, vias]] as const).map(([nome, enabled, dado]) => enabled && <div key={nome} aria-live="polite">{dado.carregando && <p>Carregando {nome.toLowerCase()}…</p>}{dado.erro && <p role="status">{nome} indisponível. As demais camadas permanecem funcionais. Desative e ative a camada para tentar novamente.</p>}{dado.geo && dado.arquivo && <p className="meta">{dado.arquivo.referencia}: {dado.arquivo.contagem} feições. Prefeitura de Itajaí / Defesa Civil. Coleta: {horario(dado.arquivo.coletado_em)}. <a href={`${import.meta.env.BASE_URL}data/historico/manifesto.json`}>Proveniência</a></p>}</div>)}
      </details>
      <div className="card map-selection"><label htmlFor="selecionar-bairro">Consultar bairro ou localidade</label><select id="selecionar-bairro" value={selecao?.tipo === 'bairro' || selecao?.tipo === 'localidade' ? selecao.id : ''} onChange={e => selecionar(e.target.value ? { tipo: bairros.has(e.target.value) ? 'bairro' : 'localidade', id: e.target.value } : null)}><option value="">Selecione</option><optgroup label="Bairros">{territorio.bairros.map(b => <option key={b.id} value={b.id}>{b.nome} · {b.colaboradores_jbs} residentes</option>)}</optgroup><optgroup label="Localidades sem geometria própria">{territorio.localidades.map(l => <option key={l.id} value={l.id}>{l.nome_exibicao} · {l.colaboradores_jbs} residentes</option>)}</optgroup></select>
        <label htmlFor="selecionar-dc">Consultar estação</label><select id="selecionar-dc" value={selecionada ?? ''} onChange={e => selecionar(e.target.value ? { tipo: 'estacao', id: e.target.value as typeof codigoHidrologicoSchema.options[number] } : null)}><option value="">Selecione</option>{codigoHidrologicoSchema.options.map(c => <option key={c} value={c}>{c} · {status.rios[c]?.nome ?? 'Dados indisponíveis'} · {rotuloNivel(status.motor?.rios[c]?.nivel ?? null)}</option>)}</select>
      </div>
      {selecao && <details className="card map-selection-detail" open={detalheAberto} onToggle={e => setDetalheAberto(e.currentTarget.open)}><summary>Detalhes da seleção</summary>{bairro && <NeighborhoodDetails bairro={bairro} />}{localidade && <LocalityDetails localidade={localidade} />}{selecionada && <StationDetails codigo={selecionada} estacao={status.rios[selecionada]} estado={status.motor?.rios[selecionada]} />}</details>}
      <details className="card"><summary>Limites das camadas históricas</summary><h3>Histórico de inundação</h3><p>{avisoHistorico}</p><h3>Vias com histórico de inundação</h3><p>{avisoVias}</p><p>Feições não equivalem a ruas únicas. Nenhuma camada territorial altera o Nível de Alerta JBS ou o Plano de Ação.</p></details>
      <details className="card"><summary>Base e agregados</summary><p>{territorio.resumo_jbs.colaboradores_itajai} residentes em Itajaí: {territorio.bairros.reduce((s, b) => s + b.colaboradores_jbs, 0)} atribuídos aos polígonos e {territorio.localidades.reduce((s, l) => s + l.colaboradores_jbs, 0)} em localidades mantidas separadamente.</p><p>88 colaboradores residem fora de Itajaí e não estão incluídos na análise territorial automática deste painel.</p><p>Portal 2 e Brilhante I não receberam coordenadas ou polígonos estimados.</p><ul>{territorio.fontes.filter(f => f.url && f.tipo !== 'modelagem').map(f => <li key={f.id}><a href={f.url!} target="_blank" rel="noreferrer">{f.nome}</a></li>)}</ul></details>
    </aside></div>
  </section>;
}
export function TerritoryMapPage({ status, territorio }: { status: Status; territorio: Territorio }) {
  const [resultado, setResultado] = useState<{ geo: BairrosGeojson | null; erro: boolean; carregando: boolean }>({ geo: null, erro: false, carregando: true });
  useEffect(() => {
    const controller = new AbortController();
    carregarBairros(territorio, controller.signal).then(geo => { if (!controller.signal.aborted) setResultado({ geo, erro: false, carregando: false }); })
      .catch(() => { if (!controller.signal.aborted) setResultado({ geo: null, erro: true, carregando: false }); });
    return () => controller.abort();
  }, [territorio]);
  return <>{resultado.carregando && <p role="status">Carregando limites territoriais…</p>}{resultado.erro && <p role="alert">Limites territoriais indisponíveis ou incompatíveis com a base aprovada. Nenhuma geometria foi estimada.</p>}<TerritoryMap status={status} territorio={territorio} geo={resultado.geo} /></>;
}
