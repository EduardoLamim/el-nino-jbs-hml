import type { Previsao, Status } from '../domain/contracts';
import { dia, horario, maximoChuva, medida, qualidade } from '../utils/presentation';

export function ResumoChuva({ status }: { status: Status }) {
  const validas = Object.values(status.chuvas).filter(e => e.chuva_1_h_mm !== null && Number.isFinite(e.chuva_1_h_mm) && e.qualidade !== 'indisponivel');
  return <section className="card"><p className="eyebrow">Situação atual</p><h2>Chuva — Itajaí</h2>
    {(['chuva_1_h_mm', 'chuva_24_h_mm'] as const).map(campo => {
      const max = maximoChuva(status, campo);
      return <div className="rain-summary" key={campo}><span>{campo === 'chuva_1_h_mm' ? 'Maior registro — última 1h' : 'Maior acumulado — 24h'}</span>
        <strong>{max ? medida(max.valor, 'mm') : 'Indisponível'}</strong>
        {max && <><small>Estação {max.estacoes[0]!.nome} ({max.estacoes[0]!.codigo}) · {qualidade(max.estacoes[0]!.qualidade)} · {horario(max.estacoes[0]!.medido_em)}</small>
          {max.estacoes.length > 1 && <details><summary>Mesmo valor em outras {max.estacoes.length - 1} estações</summary>{max.estacoes.slice(1).map(e => <small key={e.codigo}>{e.nome} ({e.codigo}) · {qualidade(e.qualidade)} · {horario(e.medido_em)}</small>)}</details>}</>}
      </div>;
    })}
    <p>Estações com chuva na última 1h: <strong>{validas.filter(e => e.chuva_1_h_mm! > 0).length} de {validas.length}</strong></p>
    {!validas.length && <p>Nenhuma estação com dado disponível de 1h.</p>}
    <p className="meta">Contagem entre estações com dado disponível de 1h. Atrasadas: {validas.filter(e => e.qualidade === 'atrasado').length}. Qualidade não informada: {validas.filter(e => e.qualidade === null).length}.</p>
    <a href="#/monitoramento/chuva">Ver todas as estações de chuva →</a>
  </section>;
}

export function PrevisaoDias({ previsao, resumo = false }: { previsao: Previsao; resumo?: boolean }) {
  return <section className={resumo ? 'card' : 'forecast-section'} aria-label="Previsão Epagri/Ciram">
    <p className="eyebrow">Epagri/Ciram · {previsao.municipio ?? 'Localidade não informada'}</p><h2>Previsão</h2>
    <p>Informação meteorológica para consulta.</p>
    <p className="meta">Consulta: {horario(previsao.coletado_em)}{previsao.atualizado_em && ` · Atualização da fonte: ${previsao.atualizado_em.length === 10 ? dia(previsao.atualizado_em) : horario(previsao.atualizado_em)}`}</p>
    {previsao.disponibilidade === 'indisponivel' ? <p>Previsão indisponível.</p> : <div className="forecast-days">{(resumo ? previsao.dias.slice(0, 2) : previsao.dias).map((d, i) => <article className="forecast-day" key={`${d.data}-${d.periodo}-${i}`}>
      <h3>{dia(d.data)}{d.periodo ? ` · ${d.periodo}` : ''}</h3>
      <p className="forecast-condition">{d.condicao ?? 'Condição não informada'}</p>
      {d.descricao && d.descricao !== d.condicao && <p>{d.descricao}</p>}
      <dl><div><dt>Mínima / máxima</dt><dd>{medida(d.temperatura_min_c, '°C')} / {medida(d.temperatura_max_c, '°C')}</dd></div>
        <div><dt>Precipitação</dt><dd>{medida(d.precipitacao_mm, 'mm')}</dd></div>
        {!resumo && <><div><dt>Vento médio</dt><dd>{medida(d.vento?.velocidade_media_kmh, 'km/h')}{d.vento?.direcao && ` · ${d.vento.direcao}`}</dd></div>
          <div><dt>Rajada</dt><dd>{medida(d.vento?.rajada_kmh, 'km/h')}</dd></div></>}
      </dl>
    </article>)}</div>}
    {resumo && <a href="#/monitoramento/previsao">Ver previsão completa →</a>}
  </section>;
}
