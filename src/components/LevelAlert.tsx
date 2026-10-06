import { useEffect, useRef, useState } from 'react';
import { severidade, type NivelJbs } from '../domain/contracts';
import { rotuloNivel } from '../utils/format';
import { AlertAudio } from '../services/alertAudio';

export function LevelAlert({ nivel }: { nivel: NivelJbs | null }) {
  const anterior = useRef<NivelJbs | null>(null);
  const audio = useRef<AlertAudio | null>(null);
  const [habilitado, setHabilitado] = useState(false);
  const [mensagem, setMensagem] = useState('Som desabilitado nesta aba. Habilite e confira o volume do dispositivo.');
  const [pendentes, setPendentes] = useState<Array<{ de: NivelJbs; para: NivelJbs }>>([]);
  useEffect(() => { audio.current = new AlertAudio(); return () => audio.current?.dispose(); }, []);
  useEffect(() => {
    if (!nivel) return;
    const de = anterior.current;
    anterior.current = nivel;
    if (!de || severidade[nivel] <= severidade[de]) return;
    setPendentes(lista => [...lista, { de, para: nivel }]);
    if (!audio.current?.play(nivel)) {
      setHabilitado(false);
      setMensagem('Alerta sonoro indisponível. Habilite o som; o aviso visual permanece até reconhecimento.');
    }
  }, [nivel]);
  return <section className="level-alert-control" aria-label="Alertas de agravamento">
    <div className="audio-controls"><button type="button" onClick={async () => {
      try { await audio.current?.enable(); audio.current?.play('atencao'); setHabilitado(true); setMensagem('Som habilitado nesta aba. Teste suave de dois bipes.'); }
      catch { setHabilitado(false); setMensagem('Não foi possível habilitar o áudio. Verifique as permissões do navegador e tente novamente.'); }
    }}>{habilitado ? 'Testar som' : 'Habilitar som'}</button>
    {habilitado && <button type="button" onClick={() => { audio.current?.dispose(); audio.current = new AlertAudio(); setHabilitado(false); setMensagem('Som desabilitado nesta aba.'); }}>Desabilitar som</button>}
    <span role="status">{mensagem}</span></div>
    {pendentes.length > 0 && <div className="escalation-alert" role="alert">
      <h2>Agravamento do Nível de Alerta JBS</h2>
      <ul>{pendentes.map((p, i) => <li key={i}><strong>{rotuloNivel(p.de)} → {rotuloNivel(p.para)}</strong></li>)}</ul>
      <p>Nível atual: {rotuloNivel(nivel)}. Consulte o Plano de Ação. Reconhecer este aviso não altera o nível.</p>
      <button type="button" onClick={() => { audio.current?.stop(); setPendentes([]); }}>Reconhecer alerta</button>
      <a href="#/plano-de-acao">Consultar Plano de Ação</a>
    </div>}
  </section>;
}
