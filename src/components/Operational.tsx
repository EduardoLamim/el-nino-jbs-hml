import type { Status } from '../domain/contracts';
import { rotuloNivel } from '../utils/format';
import { horario, qualidade, simbolos } from '../utils/presentation';
import { ImpactoJbs } from './ImpactoJbs';
import type { EstadoImpacto } from '../domain/impact';

export function Gatilhos({ status }: { status: Status }) {
  return <div className="triggers"><h3>O que sustenta a condição ambiental</h3>
    {status.nivel_jbs.gatilhos.length ? <ul>{status.nivel_jbs.gatilhos.map(g => <li key={`${g.tipo}-${g.origem}`}>
      <strong>{g.tipo === 'situacao_oficial' ? 'Defesa Civil de Itajaí' : `${g.origem} · ${g.nome ?? status.rios[g.origem]?.nome ?? 'Estação hidrológica'}`}</strong>
      <span>{rotuloNivel(g.severidade)}{g.tipo === 'estacao_hidrologica' && g.nivel_observado_m != null ? ` · ${g.nivel_observado_m.toLocaleString('pt-BR')} m` : ''}</span>
      {g.stale && <small>Última condição conhecida — fonte degradada.</small>}
      <small>Fonte: {horario(g.atualizado_em)}</small>
    </li>)}</ul> : <p>{status.nivel_jbs.nivel === 'normalidade' ? 'Nenhum gatilho elevado na última avaliação disponível.' : 'Não há gatilhos disponíveis para explicar a condição.'}</p>}
  </div>;
}

export function QualidadeDados({ status }: { status: Status }) {
  return <div className="data-quality"><span>Qualidade dos dados: <strong>{qualidade(status.qualidade_monitoramento.estado)}</strong></span>
    <span>Coleta: {horario(status.atualizado_em)} · Horários de Brasília</span>
    {status.qualidade_monitoramento.problemas.length > 0 && <details><summary>Ver informações de qualidade</summary><ul>{status.qualidade_monitoramento.problemas.map((p, i) => <li key={i}>{p}</li>)}</ul></details>}
  </div>;
}

export function PainelOperacional({ status, onEstado }: { status?: Status; onEstado?: (estado: EstadoImpacto) => void }) {
  const nivel = status?.nivel_jbs.nivel ?? null;
  const contexto = <><p className="underlying">Condição ambiental: <strong>{nivel ? `${simbolos[nivel]} ` : ''}{rotuloNivel(nivel)}</strong></p>
    {status && <><Gatilhos status={status} /><QualidadeDados status={status} /></>}</>;
  const painel = <section className={`operational level-${nivel ?? 'desconhecido'}`} aria-label="Nível de Alerta JBS">
    <p className="eyebrow">Nível de Alerta JBS</p><h2>{nivel ? `${simbolos[nivel]} ` : ''}{rotuloNivel(nivel)}</h2>
    <p className="lead">{nivel === 'normalidade' ? 'Condição ambiental em Normalidade na última avaliação disponível.' : nivel ? 'A condição ambiental é sustentada pelas fontes abaixo.' : 'Não foi possível determinar a condição ambiental.'}</p>
    {status && <><Gatilhos status={status} /><QualidadeDados status={status} /></>}
  </section>;
  return <ImpactoJbs painelAmbiental={painel} contextoAmbiental={contexto} onEstado={onEstado} />;
}
