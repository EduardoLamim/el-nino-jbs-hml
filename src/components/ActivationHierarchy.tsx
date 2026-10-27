import { useRef, useState } from 'react';
import { activationHierarchy } from '../content/activation-hierarchy';
export function ActivationHierarchy() {
  const [zoom, setZoom] = useState(100);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={trigger} type="button" onClick={() => { setZoom(100); setOpen(true); setLoaded(false); setFailed(false); dialog.current?.showModal(); }}>Hierarquia de Acionamento</button>
    <dialog ref={dialog} className="contacts-dialog decision-dialog" aria-labelledby="hierarchy-title" onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <header className="contacts-heading"><h2 id="hierarchy-title">Hierarquia de Acionamento</h2><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Fechar hierarquia de acionamento">Fechar</button></header>
      {open && <>
        <div className="decision-toolbar"><button type="button" disabled={!loaded || zoom <= 100} onClick={() => setZoom(z => z - 50)}>Diminuir zoom</button><output aria-label="Zoom">{zoom}%</output><button type="button" disabled={!loaded || zoom >= 400} onClick={() => setZoom(z => z + 50)}>Ampliar zoom</button><button type="button" disabled={!loaded} onClick={() => setZoom(100)}>Ajustar à largura</button></div>
        {failed && <p role="status">Imagem da hierarquia temporariamente indisponível.</p>}
        <div className="decision-viewport" tabIndex={0} aria-label="Fluxo de acionamento; use as barras de rolagem após ampliar">{!failed && <img src={`${import.meta.env.BASE_URL}assets/fluxo-acionamento-el-nino.png`} alt="Fluxo de Acionamento El Niño — imagem oficial" style={{width: `${zoom}%`}} onLoad={() => setLoaded(true)} onError={() => { setFailed(true); setLoaded(false); }} />}</div>
      </>}
      {activationHierarchy.length ? <ol className="activation-sequence">{[...activationHierarchy].sort((a,b) => a.order - b.order).map(step => <li key={step.id} value={step.order}><h3>{step.responsible}</h3>{step.contacts.map(contact => <p key={`${contact.label}/${contact.phone}`}>{contact.label}: {contact.phone}</p>)}</li>)}</ol> : null}
    </dialog>
  </>;
}
