import type { Status } from '../domain/contracts';
import { labelsImpacto, type EstadoImpacto } from '../domain/impact';
import { rotuloNivel } from '../utils/format';
import { horario, simbolos } from '../utils/presentation';

export function CompactOperational({ status, impacto }: { status?: Status; impacto: EstadoImpacto }) {
  const nivel = status?.nivel_jbs.nivel ?? null;
  const ativo = impacto.dado?.ativo === true;
  return <aside className={`compact-operational ${ativo ? 'impact-active' : `level-${nivel ?? 'desconhecido'}`}`} aria-label="Barra operacional" aria-live="polite">
    <strong>{ativo ? '⚫ IMPACTO JBS ATIVO' : `${nivel ? simbolos[nivel] : '—'} Nível de Alerta JBS — ${rotuloNivel(nivel)}`}</strong>
    {impacto.dado?.ativo && <span>{labelsImpacto[impacto.dado.tipo]} · {horario(impacto.dado.acionado_em)}</span>}
    {ativo && <span>Condição ambiental: {nivel ? simbolos[nivel] : ''} {rotuloNivel(nivel)}</span>}
    <span className="compact-triggers">{status?.nivel_jbs.gatilhos.map(g => g.tipo === 'situacao_oficial' ? 'Situação Oficial' : g.origem).join(' + ') || (nivel === 'normalidade' ? 'Nenhum indicador exige elevação do nível.' : 'Gatilhos indisponíveis.')}</span>
    {!status && <p>Dados ambientais indisponíveis.</p>}
    {!impacto.dado && <p>Estado operacional JBS indisponível. Não foi possível verificar se existe Impacto JBS ativo.</p>}
    {impacto.qualidade !== 'confirmado' && <small>{ativo ? 'Impacto conhecido preservado — confirmação pendente.' : 'Condição do Terminal sem confirmação atual.'}</small>}
  </aside>;
}
