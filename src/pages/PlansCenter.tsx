import { useState } from 'react';
import { ActionPlan } from './ActionPlan';
import { areas, areaPlans, areaSlug, findAreaPlan, planLevels, type AreaPlan, type PlanLevel } from '../content/area-plans';
import type { Status, Territorio } from '../domain/contracts';
import type { EstadoImpacto } from '../domain/impact';

function Metadata({ plan }: { plan: AreaPlan }) {
  return <dl className="plan-metadata"><div><dt>Área</dt><dd>{plan.area}</dd></div><div><dt>Responsável pelo plano</dt><dd>{plan.responsavel}</dd></div><div><dt>Versão</dt><dd>{plan.versao}</dd></div><div><dt>Última atualização</dt><dd>{plan.atualizado}</dd></div></dl>;
}
export function AreaPlanView({ plan }: { plan: AreaPlan }) {
  const [level, setLevel] = useState<PlanLevel>('Emergência');
  const actions = plan.acoes.filter(a => a['Nível'] === level).sort((a, b) => Number(a.Ordem) - Number(b.Ordem));
  return <section className="area-plan"><a href="#/plano-de-acao/areas">← Planos de Ação por Área</a><h2>Plano de Ação — {plan.area}</h2><Metadata plan={plan} />
    <p className="meta">Categorias de consulta do plano. Não representam o nível operacional atual.</p>
    <div className="plan-category-tabs" role="tablist" aria-label="Categoria das ações">{planLevels.map((l, index) => <button key={l} id={`category-${index}`} role="tab" aria-selected={level === l} aria-controls="area-actions" tabIndex={level === l ? 0 : -1} className={l === 'Emergência' ? 'category-emergency' : 'category-impact'} onClick={() => setLevel(l)} onKeyDown={e => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 1 : 1 - index; setLevel(planLevels[next]!); document.getElementById(`category-${next}`)?.focus(); }
    }}>{l}</button>)}</div>
    <div id="area-actions" role="tabpanel" aria-labelledby={`category-${planLevels.indexOf(level)}`} tabIndex={0}>
      {actions.length ? actions.map(action => <article className="card area-action" key={action.Ordem}><h3>Ordem {action.Ordem}</h3><dl>{(['Quem faz', 'Quem faz - Secundário', 'Quando faz', 'Onde faz', 'Como faz'] as const).map(field => <div key={field} className={field === 'Como faz' ? 'action-method' : undefined}><dt>{field}</dt><dd>{action[field]}</dd></div>)}</dl></article>) : <p>Nenhuma ação cadastrada para {level}.</p>}
    </div></section>;
}
export function PlansCenter({ status, territorio, impacto, secao = 'geral' }: { status?: Status; territorio?: Territorio; impacto: EstadoImpacto; secao?: string }) {
  const selected = findAreaPlan(secao);
  return <><div className="page-heading"><h2>Central de Planos</h2></div><nav className="section-nav" aria-label="Seções da Central de Planos"><a href="#/plano-de-acao/geral" aria-current={secao === 'geral' ? 'page' : undefined}>Plano de Ação Geral</a><a href="#/plano-de-acao/areas" aria-current={secao !== 'geral' ? 'page' : undefined}>Planos de Ação por Área</a></nav>
    {secao === 'geral' ? <ActionPlan status={status} territorio={territorio} impacto={impacto} /> : selected ? <AreaPlanView key={secao} plan={selected} /> : <section className="area-catalog" aria-label="Planos por área">{areas.map(area => { const plan = areaPlans[area]; return <article className="card" key={area}><h3>{area}</h3>{plan ? <><Metadata plan={plan} /><a className="plan-consult" href={`#/plano-de-acao/${areaSlug(area)}`}>Consultar plano<span className="sr-only"> de {area}</span></a></> : <p className="meta">Plano em elaboração</p>}</article>; })}</section>}
  </>;
}
