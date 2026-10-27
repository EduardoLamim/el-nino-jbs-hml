import { useId, useRef, useState } from 'react';

export const decisionMapUrl = `${import.meta.env.BASE_URL}assets/mapa-decisoes-terminal.png`;

export function DecisionMap({ url = decisionMapUrl, title = 'Mapa de Decisões do Terminal', label = 'Mapa de Decisões', description }: { url?: string; title?: string; label?: string; description?: string }) {
  const [map, setMap] = useState('terminal');
  const selectedUrl = map === 'operacoes' ? `${import.meta.env.BASE_URL}assets/operacoes-posicionamento-equipamentos.jpg` : url;
  const selectedTitle = map === 'operacoes' ? 'Posicionamento de equipamentos — Operações' : title;
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [zoom, setZoom] = useState(100);
  return <div className="decision-map">
    <button ref={trigger} type="button" onClick={() => { setMap('terminal'); setEstado('carregando'); setZoom(100); setAberto(true); dialog.current?.showModal(); }}>{label}</button>
    <dialog ref={dialog} className="decision-dialog" aria-labelledby={titleId} onClose={() => { setAberto(false); trigger.current?.focus(); }}>
      <div className="decision-toolbar"><h2 id={titleId}>{title}</h2><button type="button" autoFocus onClick={() => dialog.current?.close()}>Fechar mapa</button></div>
      {description && <p>{description}</p>}
      {aberto && <>
        <label>Mapa em consulta <select style={{maxWidth: '100%'}} value={map} onChange={e => { setMap(e.target.value); setZoom(100); setEstado('carregando'); }}><option value="terminal">Mapa de Decisões do Terminal</option><option value="operacoes">Posicionamento de equipamentos — Operações</option></select></label>
        {map === 'operacoes' && <p>Responsável: Diego Rodrigo Juliani · Atualização: 26/10/2026</p>}
        <div className="decision-toolbar"><button type="button" disabled={estado !== 'pronto' || zoom <= 100} onClick={() => setZoom(z => z - 50)}>Diminuir zoom</button><output aria-label="Zoom">{zoom}%</output><button type="button" disabled={estado !== 'pronto' || zoom >= 400} onClick={() => setZoom(z => z + 50)}>Ampliar zoom</button><button type="button" disabled={estado !== 'pronto'} onClick={() => setZoom(100)}>Ajustar à largura</button></div>
        {estado === 'carregando' && <p role="status">Carregando mapa…</p>}
        {estado === 'erro' && <p role="status">{title} ainda não disponibilizado ou temporariamente indisponível. Os Planos de Ação permanecem disponíveis. Feche e abra novamente para tentar carregar.</p>}
        <div className="decision-viewport" tabIndex={0} aria-label="Imagem do mapa; use as barras de rolagem após ampliar">
          {estado !== 'erro' && <img key={selectedUrl} src={selectedUrl} alt={selectedTitle} style={{ width: `${zoom}%`, visibility: estado === 'pronto' ? 'visible' : 'hidden' }} onLoad={() => setEstado('pronto')} onError={() => setEstado('erro')} />}
        </div>
      </>}
    </dialog>
  </div>;
}
