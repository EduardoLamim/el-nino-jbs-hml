import { nivelSchema, nivelPorFlag, type Status, type Territorio } from '../domain/contracts';
import { rotuloNivel } from '../utils/format';
import { horario, resumoRios } from '../utils/presentation';
import defesaCivil from '../assets/defesa-civil.svg';
import { PrevisaoDias, ResumoChuva } from '../components/Weather';

export function SituacaoOficial({ status }: { status: Status }) {
  const s = status.situacao_oficial;
  const indisponivel = !s || s.qualidade === 'indisponivel';
  return <section className="card official"><div className="official-heading"><img src={defesaCivil} alt="Defesa Civil" width="48" height="47" /><div><h2>Situação Oficial</h2><p className="source-context">Defesa Civil de Itajaí</p></div></div>
    {indisponivel ? <p>Situação oficial indisponível.</p> : <><p className={`official-flag level-${s.flag ? nivelPorFlag[s.flag] : 'desconhecido'}`}>{s.flag ?? 'Situação não informada'}</p>
      <p className="official-text">{s.conteudo ?? 'Conteúdo oficial não informado.'}</p></>}
    <p className="meta">Última atualização da Defesa Civil: {horario(s?.atualizado_em)}</p>
  </section>;
}

export function Dashboard({ status, territorio }: { status: Status; territorio: Territorio }) {
  const rios = resumoRios(status);
  const concentracoes = [...territorio.bairros].sort((a, b) => b.colaboradores_jbs - a.colaboradores_jbs).slice(0, 3);
  return <div className="dashboard-grid">
    <SituacaoOficial status={status} />
    <section className="card river-summary-card"><h2>Rios</h2><p className="source-context">Visão das estações</p><p>11 estações monitoradas</p>
      <div className="river-counts">{nivelSchema.options.map(n => <div key={n}><strong>{rios.contagem[n]}</strong><span>{rotuloNivel(n)}</span></div>)}
        {rios.contagem.desconhecido > 0 && <div><strong>{rios.contagem.desconhecido}</strong><span>Sem estado confirmado</span></div>}</div>
      <p>Maior severidade: <strong>{rotuloNivel(rios.maior)}</strong></p>
      {rios.retidas > 0 && <p className="meta">{rios.retidas} estações sem dado recente; última condição conhecida preservada.</p>}
      <p className="meta">Sem dado recente: {Object.values(status.rios).filter(r => r?.qualidade === 'atrasado').length} · Indisponíveis: {11 - Object.values(status.rios).filter(r => r && r.nivel_m !== null && r.qualidade !== 'indisponivel').length}</p>
      <a href="#/monitoramento/rios">Acompanhar DC01–DC11 →</a>
    </section>
    <ResumoChuva status={status} />
    <PrevisaoDias previsao={status.previsao} resumo />
    <section className="card exposure"><h2>Exposição Territorial JBS</h2><p className="source-context">Contexto territorial</p>
      <div className="exposure-totals"><p><strong>{territorio.resumo_jbs.colaboradores_itajai}</strong> colaboradores residentes em Itajaí</p><p><strong>{territorio.resumo_jbs.colaboradores_outros_municipios}</strong> colaboradores residentes fora de Itajaí</p></div>
      <h3>Principais concentrações de residentes</h3><ul className="concentrations">{concentracoes.map(b => <li key={b.id}><span>{b.nome}</span><strong>{b.colaboradores_jbs} residentes</strong></li>)}</ul>
      <p>Informações territoriais representam exposição e vulnerabilidade histórica e não significam impacto real atual.</p>
      <p className="meta">88 colaboradores residem fora de Itajaí e não estão incluídos na análise territorial automática deste painel.</p>
    </section>
  </div>;
}
