import { useState } from 'react';
import { ActionPlan } from './ActionPlan';
import { areas, areaPlans, areaSlug, findAreaPlan, planLevels, type AreaPlan, type PlanLevel } from '../content/area-plans';
import type { Status, Territorio } from '../domain/contracts';
import type { EstadoImpacto } from '../domain/impact';

function Metadata({ plan }: { plan: AreaPlan }) {
  return <dl className="plan-metadata"><div><dt>Responsável pelo plano</dt><dd>{plan.responsavel}</dd></div><div><dt>Versão</dt><dd>{plan.versao}</dd></div><div><dt>Última atualização</dt><dd>{plan.atualizado}</dd></div></dl>;
}
const columns = ['Ordem', 'Quem faz', 'Quem faz - Secundário', 'Quando faz', 'Onde faz', 'Como faz'] as const;
export function AreaPlanView({ plan }: { plan: AreaPlan }) {
  const [level, setLevel] = useState<PlanLevel>('Emergência');
  const actions = plan.acoes.filter(a => a['Nível'] === level).sort((a, b) => Number(a.Ordem) - Number(b.Ordem));
  return <section className="area-plan"><a href="#/plano-de-acao/areas">← Planos de Ação por Área</a><h2>Plano de Ação — {plan.area}</h2><Metadata plan={plan} />
    <p className="meta">Categorias de consulta do plano. Não representam o nível operacional atual.</p>
    <div className="plan-category-tabs" role="tablist" aria-label="Categoria das ações">{planLevels.map((l, index) => <button key={l} id={`category-${index}`} role="tab" aria-selected={level === l} aria-controls="area-actions" tabIndex={level === l ? 0 : -1} className={l === 'Emergência' ? 'category-emergency' : 'category-impact'} onClick={() => setLevel(l)} onKeyDown={e => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 1 : 1 - index; setLevel(planLevels[next]!); document.getElementById(`category-${next}`)?.focus(); }
    }}>{l}</button>)}</div>
    <div id="area-actions" role="tabpanel" aria-labelledby={`category-${planLevels.indexOf(level)}`} tabIndex={0}>
      {actions.length ? <><p id="plan-scroll-help" className="meta">Role a tabela horizontalmente para consultar todas as colunas. A ordem permanece visível.</p>
        <div className="table-scroll plan-table-scroll" role="region" aria-label={`Ações de ${level}`} aria-describedby="plan-scroll-help" tabIndex={0}>
          <table className="plan-actions-table"><caption className="sr-only">Plano de Ação — {plan.area}: {level}</caption>
            <colgroup>{columns.map((field, i) => <col key={field} className={`plan-col-${i}`} />)}</colgroup>
            <thead><tr>{columns.map(field => <th key={field} scope="col">{field}</th>)}</tr></thead>
            <tbody>{actions.map(action => <tr className="area-action" key={action.Ordem}><th scope="row">{action.Ordem}</th>{columns.slice(1).map(field => <td key={field}>{action[field]}</td>)}</tr>)}</tbody>
          </table>
        </div></> : <p>Nenhuma ação cadastrada para {level}.</p>}
    </div></section>;
}
export function PlansCenter({ status, territorio, impacto, secao = 'geral' }: { status?: Status; territorio?: Territorio; impacto: EstadoImpacto; secao?: string }) {
  const selected = findAreaPlan(secao);
  return <><div className="page-heading"><h2>Central de Planos</h2></div><nav className="section-nav" aria-label="Seções da Central de Planos"><a href="#/plano-de-acao/geral" aria-current={secao === 'geral' ? 'page' : undefined}>Plano de Ação Geral</a><a href="#/plano-de-acao/areas" aria-current={secao !== 'geral' ? 'page' : undefined}>Planos de Ação por Área</a></nav>
    {secao === 'geral' ? <ActionPlan status={status} territorio={territorio} impacto={impacto} /> : selected ? <AreaPlanView key={secao} plan={selected} /> : <section className="area-catalog" aria-label="Planos por área">{areas.map(area => { const plan = areaPlans[area]; return <article className="card" key={area}><h3>{area}</h3>{plan ? <><Metadata plan={plan} /><a className="plan-consult" href={`#/plano-de-acao/${areaSlug(area)}`}>Consultar plano<span className="sr-only"> de {area}</span></a></> : <p className="meta">Plano em elaboração</p>}</article>; })}</section>}
  </>;
}
