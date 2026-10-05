import type { Status } from '../domain/contracts';
import { rotuloNivel } from '../utils/format';
import { horario, simbolos } from '../utils/presentation';
import { ImpactoJbs } from './ImpactoJbs';
import type { EstadoImpacto } from '../domain/impact';

export function Gatilhos({ status, titulo = true }: { status: Status; titulo?: boolean }) {
  return <div className="triggers">{titulo && <h3>Por que estamos neste nível?</h3>}
    {status.nivel_jbs.gatilhos.length ? <ul>{status.nivel_jbs.gatilhos.map(g => <li key={`${g.tipo}-${g.origem}`}>
      <strong>{g.tipo === 'situacao_oficial' ? `Defesa Civil de Itajaí está em ${rotuloNivel(g.severidade)}.` : `${g.origem} atingiu nível de ${rotuloNivel(g.severidade)}.`}</strong>
      {g.tipo === 'estacao_hidrologica' && <span>{g.nome ?? status.rios[g.origem]?.nome ?? 'Estação hidrológica'}</span>}
      <span>{rotuloNivel(g.severidade)}{g.tipo === 'estacao_hidrologica' && g.nivel_observado_m != null ? ` · ${g.nivel_observado_m.toLocaleString('pt-BR')} m` : ''}</span>
      {g.stale && <small>Sem dado recente. Última condição conhecida preservada.</small>}
      <small>Fonte: {horario(g.atualizado_em)}</small>
    </li>)}</ul> : <p>{status.nivel_jbs.nivel === 'normalidade' ? 'Nenhum indicador monitorado exige elevação do nível neste momento.' : 'Não há gatilhos disponíveis para explicar a condição.'}</p>}
  </div>;
}

export function QualidadeDados({ status }: { status: Status }) {
  return <div className="collection-time">Coleta JBS: {horario(status.atualizado_em)} · Horários de Brasília</div>;
}

export function PainelOperacional({ status, onEstado }: { status?: Status; onEstado?: (estado: EstadoImpacto) => void }) {
  const nivel = status?.nivel_jbs.nivel ?? null;
  const contexto = <><p className="underlying">Condição ambiental: <strong>{nivel ? `${simbolos[nivel]} ` : ''}{rotuloNivel(nivel)}</strong></p>
    {status && <><Gatilhos status={status} /><QualidadeDados status={status} /></>}</>;
  const painel = <section className={`operational level-${nivel ?? 'desconhecido'}`} aria-label="Nível de Alerta JBS">
    <div className="level-overview"><p className="eyebrow">Nível de Alerta JBS</p><h2>{nivel ? `${simbolos[nivel]} ` : ''}{rotuloNivel(nivel)}</h2>
    <p className="lead">{nivel === 'normalidade' ? 'Condição ambiental em Normalidade na última avaliação disponível.' : nivel ? 'A condição ambiental é sustentada pelas fontes abaixo.' : 'Não foi possível determinar a condição ambiental.'}</p></div>
    {status && <><Gatilhos status={status} /><QualidadeDados status={status} /></>}
  </section>;
  return <ImpactoJbs painelAmbiental={painel} contextoAmbiental={contexto} onEstado={onEstado} />;
}
