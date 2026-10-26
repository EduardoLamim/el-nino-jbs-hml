import { useRef } from 'react';
import { activationHierarchy } from '../content/activation-hierarchy';
export function ActivationHierarchy() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={trigger} type="button" onClick={() => dialog.current?.showModal()}>Hierarquia de Acionamento</button>
    <dialog ref={dialog} className="contacts-dialog" aria-labelledby="hierarchy-title" onClose={() => trigger.current?.focus()}>
      <header className="contacts-heading"><h2 id="hierarchy-title">Hierarquia de Acionamento</h2><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Fechar hierarquia de acionamento">Fechar</button></header>
      {activationHierarchy.length ? <ol className="activation-sequence">{[...activationHierarchy].sort((a,b) => a.order - b.order).map(step => <li key={step.id} value={step.order}><h3>{step.responsible}</h3>{step.contacts.map(contact => <p key={`${contact.label}/${contact.phone}`}>{contact.label}: {contact.phone}</p>)}</li>)}</ol> : <p className="contacts-empty">Hierarquia de acionamento ainda não cadastrada.</p>}
    </dialog>
  </>;
}
