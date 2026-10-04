import { useState } from 'react';
import type { Status, Territorio } from '../domain/contracts';
import { labelsImpacto, type EstadoImpacto } from '../domain/impact';
import { planos, type NivelPlano } from '../content/action-plans';
import { Gatilhos } from '../components/Operational';
import { rotuloNivel } from '../utils/format';
import { horario, simbolos } from '../utils/presentation';

export function ActionPlan({ status, territorio, impacto }: { status?: Status; territorio?: Territorio; impacto: EstadoImpacto }) {
  const [consulta, setConsulta] = useState<NivelPlano | null>(null);
  const ambiental = status?.nivel_jbs.nivel ?? null;
  const vigente: NivelPlano | null = impacto.dado?.ativo ? 'impacto' : ambiental;
  const escolhido = consulta ?? vigente;
  const plano = escolhido ? planos[escolhido] : null;
  const referencia = consulta !== null && consulta !== vigente;
  const municipal = territorio?.fontes.find(f => f.id === 'v17');
  return <section className="action-plan" aria-label="Plano de Ação">
    <div className="page-heading"><p className="eyebrow">Orientações operacionais JBS</p>
      <h2>{referencia ? `Consulta — ${plano!.titulo}` : plano ? `Plano de Ação — ${plano.titulo}` : 'Plano de Ação — nível não confirmado'}</h2>
      {referencia && <p className="consultation">O Nível de Alerta JBS atual permanece {vigente === 'impacto' ? '⚫ Impacto JBS' : `${ambiental ? simbolos[ambiental] : ''} ${rotuloNivel(ambiental)}`}.</p>}
      {!impacto.dado && <p className="meta">A condição do Terminal não foi confirmada. O plano ambiental disponível não confirma ausência de impacto físico.</p>}
      {impacto.qualidade === 'degradado' && <p className="stale">Último estado operacional conhecido preservado; confirmação pendente.</p>}
    </div>
    <section className="plan-reasons" aria-label="Motivo do nível"><h3>Por que estamos neste nível?</h3>
      {impacto.dado?.ativo && <div><p><strong>{labelsImpacto[impacto.dado.tipo]}</strong> · Acionado em {horario(impacto.dado.acionado_em)}</p>
        <p>Condição ambiental: {ambiental ? simbolos[ambiental] : ''} {rotuloNivel(ambiental)}</p></div>}
      {status ? <Gatilhos status={status} /> : <p>Gatilhos ambientais indisponíveis.</p>}
    </section>
    {plano ? <article className={`plan-guidance ${referencia ? 'plan-reference' : `level-${vigente === 'impacto' ? 'impacto' : vigente}`}`}>
      <p className="eyebrow">{referencia ? 'Plano de referência · consulta' : 'Orientações do nível vigente'}</p>
      {escolhido === 'impacto' && !impacto.dado?.ativo && <p>Plano de referência para Impacto JBS. Esta consulta não indica uma ocorrência ativa.</p>}
      <h3>Objetivo</h3><p className="lead">{plano.objetivo}</p>
      <h3>Orientações</h3><ol>{plano.orientacoes.map(o => <li key={o}>{o}</li>)}</ol>
      {(escolhido === 'emergencia' || escolhido === 'impacto') && <p className="meta">Decisões sobre pessoas, acessos e continuidade da operação permanecem com os responsáveis competentes.</p>}
    </article> : <p className="card">Não há nível confirmado para destacar automaticamente um plano. As orientações de referência podem ser consultadas abaixo.</p>}
    <nav className="plan-links" aria-label="Links operacionais"><a href="#/monitoramento/rios">Avaliar evolução dos rios</a><a href="#/monitoramento/chuva">Acompanhar chuva</a><a href="#/monitoramento/previsao">Acompanhar previsão</a><a href="#/mapa">Consultar exposição territorial</a></nav>
    <div className="plan-selector"><label htmlFor="consulta-plano">Consultar orientações de outros níveis</label><select id="consulta-plano" value={consulta ?? 'vigente'} onChange={e => setConsulta(e.target.value === 'vigente' ? null : e.target.value as NivelPlano)}>
      <option value="vigente">Acompanhar o nível vigente</option>{Object.entries(planos).map(([n, p]) => <option key={n} value={n}>{p.titulo}</option>)}
    </select>{consulta && <button type="button" onClick={() => setConsulta(null)}>Voltar ao plano vigente</button>}</div>
    <p className="municipal-reference">Este painel apoia o acompanhamento interno da JBS Terminais. Para procedimentos e informações oficiais do município, consulte o {municipal?.url ? <a href={municipal.url} target="_blank" rel="noreferrer">Plano de Contingência de Inundação da Defesa Civil de Itajaí</a> : 'Plano de Contingência de Inundação da Defesa Civil de Itajaí (referência indisponível nesta leitura)' }.</p>
  </section>;
}
