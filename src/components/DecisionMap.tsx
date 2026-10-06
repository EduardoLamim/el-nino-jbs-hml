import { useRef, useState } from 'react';

export const decisionMapUrl = `${import.meta.env.BASE_URL}assets/mapa-decisoes-terminal.png`;

export function DecisionMap() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [zoom, setZoom] = useState(100);
  return <div className="decision-map">
    <button ref={trigger} type="button" onClick={() => { setEstado('carregando'); setZoom(100); setAberto(true); dialog.current?.showModal(); }}>Visualizar Mapa de Decisões do Terminal</button>
    <dialog ref={dialog} className="decision-dialog" aria-labelledby="decision-title" onClose={() => { setAberto(false); trigger.current?.focus(); }}>
      <div className="decision-toolbar"><h2 id="decision-title">Mapa de Decisões do Terminal</h2><button type="button" autoFocus onClick={() => dialog.current?.close()}>Fechar mapa</button></div>
      {aberto && <>
        <div className="decision-toolbar"><button type="button" disabled={estado !== 'pronto' || zoom <= 100} onClick={() => setZoom(z => z - 50)}>Diminuir zoom</button><output aria-label="Zoom">{zoom}%</output><button type="button" disabled={estado !== 'pronto' || zoom >= 400} onClick={() => setZoom(z => z + 50)}>Ampliar zoom</button><button type="button" disabled={estado !== 'pronto'} onClick={() => setZoom(100)}>Ajustar à largura</button></div>
        {estado === 'carregando' && <p role="status">Carregando mapa…</p>}
        {estado === 'erro' && <p role="status">Mapa de Decisões do Terminal ainda não disponibilizado ou temporariamente indisponível. Os Planos de Ação permanecem disponíveis. Feche e abra novamente para tentar carregar.</p>}
        <div className="decision-viewport" tabIndex={0} aria-label="Imagem do mapa; use as barras de rolagem após ampliar">
          {estado !== 'erro' && <img src={decisionMapUrl} alt="Mapa de Decisões do Terminal" style={{ width: `${zoom}%`, visibility: estado === 'pronto' ? 'visible' : 'hidden' }} onLoad={() => setEstado('pronto')} onError={() => setEstado('erro')} />}
        </div>
      </>}
    </dialog>
  </div>;
}
