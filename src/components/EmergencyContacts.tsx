import { useRef, useState } from 'react';
import { externalContacts, internalContacts, type EmergencyContact } from '../content/emergency-contacts';

export function ContactCard({ contact }: { contact: EmergencyContact }) {
  return <article className="contact-card" aria-labelledby={`contact-${contact.id}`}>
    <h3 id={`contact-${contact.id}`}>{contact.name}</h3>
    <p className="contact-phone">{contact.phone}</p>
    {contact.category === 'external' && <dl><dt>Tempo de deslocamento até o terminal</dt><dd>{contact.travelMinutes} minutos</dd></dl>}
  </article>;
}
export function EmergencyContacts() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [category, setCategory] = useState<'external' | 'internal'>('external');
  const categories = ['external', 'internal'] as const;
  return <>
    <button ref={trigger} type="button" onClick={() => { setCategory('external'); dialog.current?.showModal(); }}>Contatos de Emergência</button>
    <dialog ref={dialog} className="contacts-dialog" aria-labelledby="contacts-title" onClose={() => trigger.current?.focus()}>
      <header className="contacts-heading"><h2 id="contacts-title">Contatos de Emergência</h2><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Fechar contatos de emergência">Fechar</button></header>
      <div role="tablist" aria-label="Categoria dos contatos" className="contacts-tabs">{categories.map((value, index) => <button key={value} type="button" role="tab" id={`contacts-tab-${value}`} aria-controls="contacts-panel" aria-selected={category === value} tabIndex={category === value ? 0 : -1} onClick={() => setCategory(value)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = categories[event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index]!;
        setCategory(next); document.getElementById(`contacts-tab-${next}`)?.focus();
      }}>{value === 'external' ? 'Órgãos externos' : 'Contatos internos'}</button>)}</div>
      <div role="tabpanel" id="contacts-panel" aria-labelledby={`contacts-tab-${category}`} tabIndex={0}>
        {category === 'external' ? <><div className="contacts-grid">{externalContacts.map(contact => <ContactCard key={contact.id} contact={contact} />)}</div>
          <p className="contacts-note">Tempos de percurso de referência do Plano de Contingência. Não representam trânsito em tempo real.</p></>
          : internalContacts.length ? <div className="contacts-grid">{internalContacts.map(contact => <ContactCard key={contact.id} contact={contact} />)}</div> : <p className="contacts-empty">Contatos internos ainda não cadastrados.</p>}
      </div>
    </dialog>
  </>;
}
