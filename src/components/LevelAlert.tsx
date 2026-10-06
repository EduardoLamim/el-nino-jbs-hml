import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { severidade, type NivelJbs } from '../domain/contracts';
import { rotuloNivel } from '../utils/format';
import { AlertAudio } from '../services/alertAudio';

export function LevelAlert({ nivel, impactoAtivo = null, audioHost, source = 'real' }: { nivel: NivelJbs | null; impactoAtivo?: boolean | null; audioHost?: HTMLElement | null; source?: string }) {
  const anterior = useRef<NivelJbs | null>(null);
  const impactoAnterior = useRef<boolean | null>(null);
  const previousSource = useRef(source);
  const audio = useRef<AlertAudio | null>(null);
  const [habilitado, setHabilitado] = useState(false);
  const [mensagem, setMensagem] = useState('Som desabilitado');
  const [pendentes, setPendentes] = useState<Array<{ de: string; para: string; impacto?: boolean }>>([]);
  useEffect(() => { audio.current = new AlertAudio(); return () => audio.current?.dispose(); }, []);
  useEffect(() => {
    if (previousSource.current !== source) {
      previousSource.current = source;
      anterior.current = nivel;
      impactoAnterior.current = impactoAtivo;
      audio.current?.stop();
      setPendentes([]);
      return;
    }
    const de = anterior.current;
    const agravou = !!(nivel && de && severidade[nivel] > severidade[de]);
    const ativou = impactoAnterior.current === false && impactoAtivo === true;
    if (nivel) anterior.current = nivel;
    if (impactoAtivo !== null) impactoAnterior.current = impactoAtivo;
    if (!agravou && !ativou) return;
    setPendentes(lista => [...lista,
      ...(agravou ? [{ de: rotuloNivel(de), para: rotuloNivel(nivel) }] : []),
      ...(ativou ? [{ de: 'Impacto JBS inativo', para: 'Impacto JBS ativo', impacto: true }] : []),
    ]);
    if (!audio.current?.play(ativou ? 'emergencia' : nivel!)) {
      setHabilitado(false);
      setMensagem('Alerta sonoro indisponível — habilite o som');
    }
  }, [nivel, impactoAtivo, source]);
  const controles = <div className="audio-controls" role="group" aria-label="Controles de áudio">
    <span role="status"><span aria-hidden="true">{habilitado ? '🔊 ' : '🔇 '}</span>{mensagem}</span>
    <button type="button" onClick={async () => {
      try { await audio.current?.enable(); audio.current?.play('atencao'); setHabilitado(true); setMensagem('Som habilitado'); }
      catch { setHabilitado(false); setMensagem('Não foi possível habilitar o áudio'); }
    }}>{habilitado ? 'Testar som' : 'Habilitar som'}</button>
    {habilitado && <button type="button" onClick={() => { audio.current?.dispose(); audio.current = new AlertAudio(); setHabilitado(false); setMensagem('Som desabilitado'); }}>Desabilitar som</button>}
    </div>;
  return <>
    {audioHost ? createPortal(controles, audioHost) : audioHost === undefined ? controles : null}
    {pendentes.length > 0 && <div className="escalation-alert" role="alert">
      {source !== 'real' && <p className="simulation-label">SIMULAÇÃO / HML — sem ocorrência operacional real</p>}
      <h2>Agravamento do Nível de Alerta JBS</h2>
      <ul>{pendentes.map((p, i) => <li className="alert-entry" key={i}><span>NÍVEL ALTERADO — </span><strong>{p.de} → {p.para}</strong>{p.impacto && <p className="impact-alert-confirmation">Impacto físico no Terminal confirmado.</p>}</li>)}</ul>
      <p>Nível atual: {rotuloNivel(nivel)}. {impactoAtivo === true ? 'Impacto JBS ativo.' : impactoAtivo === false ? 'Impacto JBS inativo.' : 'Estado atual do Impacto JBS não confirmado.'} Consulte o Plano de Ação. Reconhecer este aviso não altera o nível.</p>
      <button type="button" onClick={() => { audio.current?.stop(); setPendentes([]); }}>Reconhecer alerta</button>
      <a href="#/plano-de-acao">Consultar Plano de Ação</a>
    </div>}
  </>;
}
