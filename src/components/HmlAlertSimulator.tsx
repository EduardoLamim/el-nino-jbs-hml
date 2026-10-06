import { useState } from 'react';
import type { NivelJbs } from '../domain/contracts';
import { rotuloNivel } from '../utils/format';
import { LevelAlert } from './LevelAlert';

export function HmlAlertSimulator({ nivel, impactoAtivo, audioHost, onActiveChange }: {
  nivel: NivelJbs | null; impactoAtivo: boolean | null; audioHost: HTMLElement | null; onActiveChange: (active: boolean) => void;
}) {
  const [sim, setSim] = useState<{ nivel: NivelJbs; impacto: boolean; session: number } | null>(null);
  const [sequence, setSequence] = useState(0);
  const start = () => {
    setSequence(n => n + 1); setSim({ nivel: 'normalidade', impacto: false, session: sequence + 1 }); onActiveChange(true);
  };
  return <>
    <details className="simulation-tools" open={sim ? true : undefined}>
      <summary>Diagnóstico de avisos — HML</summary>
      <p>Teste local dos alertas, sem alterar fontes oficiais, Impacto JBS ou dados persistidos.</p>
      {!sim ? <button type="button" onClick={start}>Iniciar simulação</button> : <section aria-label="SIMULAÇÃO / HML">
        <h2>SIMULAÇÃO / HML</h2>
        <p>Somente os avisos estão sendo simulados. A visualização operacional e os avisos reais ficam suspensos nesta aba até encerrar; a atualização dos dados reais continua. Habilite o som no header para ouvir.</p>
        <p role="status">Nível simulado: {rotuloNivel(sim.nivel)} · Impacto simulado: {sim.impacto ? 'ativo' : 'inativo'}</p>
        <div className="simulation-actions">
          {(['normalidade', 'atencao', 'alerta', 'emergencia'] as const).map(n => <button type="button" key={n} onClick={() => setSim(s => s && ({ ...s, nivel: n }))}>Simular {rotuloNivel(n)}</button>)}
          <button type="button" onClick={() => setSim(s => s && ({ ...s, impacto: true }))}>Simular ativação de Impacto JBS</button>
          <button type="button" onClick={() => setSim(s => s && ({ ...s, impacto: false }))}>Simular encerramento de Impacto JBS</button>
          <button type="button" onClick={() => setSim(s => s && ({ ...s, nivel: 'emergencia', impacto: true }))}>Simular Emergência + Impacto simultâneos</button>
          <button type="button" onClick={start}>Resetar simulação</button>
          <button type="button" onClick={() => { setSim(null); onActiveChange(false); }}>Encerrar simulação e voltar aos dados reais</button>
        </div>
        <p>Use os níveis em sequência ou, após resetar, selecione diretamente Alerta/Emergência para testar saltos. Resetar limpa os avisos e retorna à Normalidade simulada, sem alarme.</p>
      </section>}
    </details>
    <LevelAlert nivel={sim ? sim.nivel : nivel} impactoAtivo={sim ? sim.impacto : impactoAtivo} audioHost={audioHost} source={sim ? `sim-${sim.session}` : 'real'} />
  </>;
}
