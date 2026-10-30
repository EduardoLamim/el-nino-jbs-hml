import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { severidade, type NivelJbs } from '../domain/contracts';
import { rotuloNivel } from '../utils/format';
import { AlertAudio } from '../services/alertAudio';

export function LevelAlert({ nivel, impactoAtivo = null, impactEvent, audioHost, source = 'real' }: { nivel: NivelJbs | null; impactoAtivo?: boolean | null; impactEvent?: number; audioHost?: HTMLElement | null; source?: string }) {
  const anterior = useRef<NivelJbs | null>(null);
  const impactoAnterior = useRef<boolean | null>(null);
  const previousSource = useRef(source);
  const previousEvent = useRef(impactEvent);
  const audio = useRef<AlertAudio | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [playing, setPlaying] = useState(false);
  const [habilitado, setHabilitado] = useState(false);
  const [mensagem, setMensagem] = useState('Som desabilitado');
  const [pendentes, setPendentes] = useState<Array<{ de: string; para: string; destino: NivelJbs; impacto?: boolean }>>([]);
  useEffect(() => { audio.current = new AlertAudio(setPlaying); return () => audio.current?.dispose(); }, []);
  useEffect(() => {
    if (pendentes.length && !dialog.current?.open) dialog.current?.showModal();
    if (!pendentes.length && dialog.current?.open) dialog.current.close();
  }, [pendentes]);
  useEffect(() => {
    if (previousSource.current !== source) {
      previousSource.current = source;
      previousEvent.current = impactEvent;
      anterior.current = nivel;
      impactoAnterior.current = impactoAtivo;
      audio.current?.stop();
      setPendentes([]);
      return;
    }
    const de = anterior.current;
    const agravou = !!(nivel && de && severidade[nivel] > severidade[de]);
    const ativou = impactEvent !== undefined ? previousEvent.current !== undefined && impactEvent > previousEvent.current : impactoAnterior.current === false && impactoAtivo === true;
    previousEvent.current = impactEvent;
    if (nivel) anterior.current = nivel;
    if (impactoAtivo !== null) impactoAnterior.current = impactoAtivo;
    if (!agravou && !ativou) return;
    setPendentes(lista => [...lista,
      ...(agravou ? [{ de: rotuloNivel(de), para: rotuloNivel(nivel), destino: nivel! }] : []),
      ...(ativou ? [{ de: 'Impacto JBS inativo', para: 'Impacto JBS ativo', destino: 'emergencia' as const, impacto: true }] : []),
    ]);
    let disposed = false;
    void audio.current?.play(ativou ? 'emergencia' : nivel!).then(ok => { if (!ok && !disposed) {
      setHabilitado(false);
      setMensagem('Alerta sonoro indisponível — habilite o som');
    } });
    return () => { disposed = true; };
  }, [nivel, impactoAtivo, source, impactEvent]);
  const enableAudio = async () => {
    try { await audio.current?.enable(); if (!await audio.current?.play('atencao', true)) throw new Error('Áudio bloqueado'); setHabilitado(true); setMensagem('Som habilitado'); }
    catch { setHabilitado(false); setMensagem('Não foi possível habilitar o áudio'); }
  };
  const controles = <div className="audio-controls" role="group" aria-label="Controles de áudio">
    <span role="status" className="sr-only">{mensagem}</span>
    <button type="button" className="theme-toggle audio-toggle" aria-label={habilitado ? 'Desativar som' : 'Ativar som'} title={habilitado ? 'Desativar som' : 'Ativar som'} aria-pressed={habilitado} onClick={() => {
      if (habilitado) { audio.current?.dispose(); audio.current = new AlertAudio(setPlaying); setHabilitado(false); setMensagem('Som desabilitado'); }
      else void enableAudio();
    }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" />{habilitado ? <><path d="M15.54 8.46a5 5 0 0 1 0 7.08" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></> : <path d="m23 9-6 6m0-6 6 6" />}</svg></button>
  </div>;
  return <>
    {audioHost ? createPortal(controles, audioHost) : audioHost === undefined ? controles : null}
    <dialog ref={dialog} className={`alarm-dialog level-${pendentes.some(p => p.impacto) ? 'impacto' : pendentes.at(-1)?.destino ?? 'normalidade'}`} aria-labelledby="alarm-title" aria-describedby="alarm-instruction" onCancel={e => e.preventDefault()}>
    {pendentes.length > 0 && <div role="alert">
      {source !== 'real' && <p className="simulation-label">SIMULAÇÃO / HML — sem ocorrência operacional real</p>}
      <h2 id="alarm-title">{pendentes.some(p => p.impacto) ? 'IMPACTO NO TERMINAL CONFIRMADO' : 'NÍVEL OPERACIONAL ALTERADO'}</h2>
      <ul>{pendentes.map((p, i) => <li key={i}><strong>{p.de} → {p.para}</strong>{p.impacto && <p>Impacto físico no Terminal confirmado.</p>}</li>)}</ul>
      <p>Nível atual: {rotuloNivel(nivel)}. {impactoAtivo === true ? 'Impacto JBS ativo.' : impactoAtivo === false ? 'Impacto JBS inativo.' : 'Estado atual do Impacto JBS não confirmado.'} Consulte o Plano de Ação. Reconhecer este aviso não altera o nível.</p>
      <p id="alarm-instruction">Reconheça a ocorrência para fechar este aviso.</p>
      {!habilitado && <p>Som desabilitado ou bloqueado. Após reconhecer, habilite o som no header.</p>}
      <div className="alarm-actions"><button type="button" disabled={!playing} onClick={() => audio.current?.stop()}>Parar som</button>
      <button type="button" autoFocus onClick={() => { audio.current?.stop(); setPendentes([]); }}>Reconhecer</button></div>
    </div>}</dialog>
  </>;
}
