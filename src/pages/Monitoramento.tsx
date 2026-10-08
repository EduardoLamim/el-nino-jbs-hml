import { codigoHidrologicoSchema, type Status } from '../domain/contracts';
import { rotuloNivel } from '../utils/format';
import { horario, medida, tendencia } from '../utils/presentation';
import { RiverChart } from '../components/RiverChart';
import { PrevisaoDias } from '../components/Weather';
import { blumenauUrl } from '../domain/blumenau';

export const secoes = { rios: 'Rios', chuva: 'Chuva', previsao: 'Previsão', barragens: 'Barragens' } as const;
export type SecaoMonitoramento = keyof typeof secoes;

export function Rios({ status }: { status: Status }) {
  const b = status.blumenau;
  const stale = b?.qualidade === 'atrasado' || (b?.medido_em && Date.now() - Date.parse(b.medido_em) > 2 * 3600000);
  return <><div className="station-grid">{codigoHidrologicoSchema.options.map(codigo => {
    const e = status.rios[codigo]; const estado = status.motor?.rios[codigo];
    const nivel = estado?.nivel ?? null;
    return <article className={`card river-station level-${nivel ?? 'desconhecido'}`} key={codigo} aria-label={`Estação ${codigo}`}>
      <div className="station-heading"><span className="station-code">{codigo}</span><span className={`level-badge level-${nivel ?? 'desconhecido'}`}>{rotuloNivel(nivel)}</span></div>
      <h3>{e?.nome ?? estado?.nome ?? 'Curso e referência não informados'}</h3>
      <p className="meta">Curso d’água e referência conforme identificação oficial.</p>
      <p className="river-value">{medida(e?.nivel_m, 'm')} <span>{tendencia(e?.tendencia)}</span></p>
      <p className="meta">Leitura: {horario(e?.medido_em)}</p>
      {(!e || e.nivel_m === null || e.qualidade === 'indisponivel') && <p>Dado indisponível.</p>}
      {estado?.stale && <p className="stale">Sem dado recente. Última condição conhecida preservada.</p>}
      <dl className="thresholds"><div><dt>Atenção</dt><dd>{medida(e?.limites.atencao_m, 'm')}</dd></div><div><dt>Alerta</dt><dd>{medida(e?.limites.alerta_m, 'm')}</dd></div><div><dt>Emergência</dt><dd>{medida(e?.limites.emergencia_m, 'm')}</dd></div></dl>
      <details><summary>Detalhar {codigo}</summary>
        {estado && !estado.stale && estado.normalizacao.leituras_abaixo > 0 && <p className="meta">Em normalização — {estado.normalizacao.leituras_abaixo} de 3 leituras</p>}
        <p>Variação oficial: não informada nos dados disponíveis.</p>
        {e ? <RiverChart estacao={e} /> : <p>Série de níveis indisponível.</p>}
      </details>
    </article>;
  })}</div><section className="regional-river"><h2>Monitoramento regional · Informativo</h2><article className={`card river-station level-${b?.nivel ?? 'desconhecido'}`} aria-label="Rio Itajaí-Açu — Blumenau">
    <div className="station-heading"><span className="station-code">Blumenau</span><span className={`level-badge level-${b?.nivel ?? 'desconhecido'}`}>{rotuloNivel(b?.nivel ?? null)}{stale && b?.nivel ? ' · última leitura' : ''}</span></div>
    <h3>Rio Itajaí-Açu — Blumenau</h3><p className="river-value">{medida(b?.nivel_m, 'm')} <span>{b?.tendencia ? { subindo: 'Subindo', descendo: 'Descendo', estavel: 'Estável' }[b.tendencia] : 'Tendência não informada'}</span></p>
    <p className="meta">Leitura oficial: {horario(b?.medido_em)}</p>
    {(!b || b.qualidade === 'indisponivel') && <p>Dado indisponível.</p>}{stale && <p className="stale">Sem dado recente.</p>}
    <p className="meta">Classificação visual: abaixo de 3 m Normalidade; a partir de 3 m Atenção, 6 m Alerta e 8 m Emergência. Tendência calculada entre as duas últimas leituras oficiais disponíveis.</p>
    <p className="meta">Indicador informativo. Não participa do nível operacional JBS nem determina condições em Itajaí.</p><a href={blumenauUrl} target="_blank" rel="noreferrer">Fonte: Defesa Civil de Blumenau</a>
  </article></section></>;
}

export function Chuva({ status }: { status: Status }) {
  const estacoes = Object.values(status.chuvas);
  const colunas = [['chuva_10_min_mm', '10 min'], ['chuva_1_h_mm', '1h'], ['chuva_12_h_mm', '12h'], ['chuva_24_h_mm', '24h'], ['chuva_48_h_mm', '48h']] as const;
  return <section className="card"><h2>Chuva — Estações</h2><p>Acumulados oficiais por estação, em milímetros.</p>
    {!estacoes.length ? <p>Dados de chuva indisponíveis.</p> : <div className="table-scroll" tabIndex={0} role="region" aria-label="Acumulados de chuva por estação"><table><thead><tr><th>Estação</th>{colunas.map(([,label]) => <th key={label}>{label}</th>)}<th>Atualização</th></tr></thead>
      <tbody>{estacoes.map(e => <tr key={e.codigo}><th scope="row">{e.codigo}<small>{e.nome}</small>{e.qualidade === 'indisponivel' && <small>Dado indisponível.</small>}{e.qualidade === 'atrasado' && <small>Sem dado recente.</small>}</th>{colunas.map(([key]) => <td key={key}>{medida(e[key])}</td>)}<td>{horario(e.medido_em)}</td></tr>)}</tbody></table></div>}
  </section>;
}

export function Barragens({ status }: { status: Status }) {
  return <section><h2>Barragens</h2><p>Dados oficiais para consulta.</p><div className="station-grid">{Object.values(status.barragens).map(b => <article className="card" key={b.nome}>
    <h3>{b.nome}</h3><p className="meta">{b.fonte} · {horario(b.medido_em)}</p>
    {b.qualidade === 'atrasado' && <p>Sem dado recente.</p>}{b.qualidade === 'indisponivel' && <p>Dado indisponível.</p>}<dl><div><dt>Ocupação</dt><dd>{medida(b.ocupacao_percentual, '%')}</dd></div><div><dt>Montante</dt><dd>{medida(b.montante_m, 'm')}</dd></div>
      <div><dt>Última variação</dt><dd>{medida(b.ultima_variacao_m, 'm')}</dd></div><div><dt>Comportas abertas / fechadas</dt><dd>{medida(b.comportas_abertas)} / {medida(b.comportas_fechadas)}</dd></div><div><dt>Extravasor</dt><dd>{medida(b.extravasor_m, 'm')}</dd></div></dl>
  </article>)}</div>{Object.keys(status.barragens).length === 0 && <p>Dados de barragens indisponíveis.</p>}</section>;
}

export function Monitoramento({ status, secao = 'rios' }: { status: Status; secao?: SecaoMonitoramento }) {
  return <><div className="page-heading"><h2>Monitoramento</h2><p className="source-context">Defesa Civil de Itajaí · Epagri/Ciram</p><p>Leituras, evolução e condições das fontes.</p></div>
    <nav className="section-nav" aria-label="Seções de Monitoramento">{Object.entries(secoes).map(([key, label]) => <a key={key} href={`#/monitoramento/${key}`} aria-current={secao === key ? 'page' : undefined}>{label}</a>)}</nav>
    {secao === 'rios' && <Rios status={status} />}{secao === 'chuva' && <Chuva status={status} />}{secao === 'previsao' && <PrevisaoDias previsao={status.previsao} />}{secao === 'barragens' && <Barragens status={status} />}
  </>;
}
