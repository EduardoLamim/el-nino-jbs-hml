import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { comandoImpactoSchema, labelsImpacto, tipoImpactoSchema, type EstadoImpacto } from '../domain/impact';
import { criarImpactoStore } from '../services/impact';
import { horario } from '../utils/presentation';

export function ImpactoJbs({ painelAmbiental, contextoAmbiental, onEstado }: { painelAmbiental?: ReactNode; contextoAmbiental?: ReactNode; onEstado?: (estado: EstadoImpacto) => void } = {}) {
  const [store] = useState(criarImpactoStore);
  const estado = useSyncExternalStore(store.subscribe, store.snapshot);
  // Compartilha somente o snapshot público para apresentação; mantém um único store/Realtime.
  useEffect(() => { onEstado?.(estado); }, [estado, onEstado]);
  const [operacao, setOperacao] = useState<'ativar' | 'encerrar' | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const pinRef = useRef<HTMLInputElement>(null);
  // Fixa o ID ao abrir o formulário: encerramento atrasado nunca fecha um novo impacto.
  const alvo = useRef<string | null>(null);
  useEffect(() => { store.iniciar(); return () => store.parar(); }, [store]);
  const ativo = estado.dado?.ativo === true;
  return <>{!ativo && painelAmbiental}<section aria-label="Impacto JBS" className={ativo ? 'operational impact-active' : 'terminal-card card'}>
    <h2>{ativo ? '⚫ IMPACTO JBS' : painelAmbiental ? 'Condição do Terminal' : 'Impacto JBS'}</h2>
    {ativo && <p className="lead">Impacto físico confirmado no Terminal, em infraestrutura crítica, área operacional ou acesso operacional imediato.</p>}
    <div aria-live="polite">
      {!estado.dado && <p>Estado operacional JBS indisponível. Não foi possível verificar se existe Impacto JBS ativo.</p>}
      {estado.dado?.ativo && <p className="impact-type">{labelsImpacto[estado.dado.tipo]} · Acionado em {horario(estado.dado.acionado_em)}</p>}
      {estado.dado && !estado.dado.ativo && <p>{estado.qualidade === 'confirmado' ? painelAmbiental ? 'Nenhum impacto físico confirmado.' : 'Nenhum Impacto JBS ativo na última consulta confirmada.' : 'Último estado conhecido: inativo. A condição atual não foi confirmada.'}</p>}
      {estado.qualidade === 'degradado' && <p>Último estado conhecido preservado; confirmação atual pendente.</p>}
      <p className="meta">Última confirmação: {estado.confirmado_em ? horario(estado.confirmado_em) : 'Nenhuma'}.</p>
      {estado.realtime !== 'conectado' && <p className="meta">Sincronização em reconexão; atualização automática a cada minuto.</p>}
    </div>
    {ativo && contextoAmbiental}
    {!operacao && <button type="button" onClick={() => { alvo.current = estado.dado?.ativo ? estado.dado.impacto_id : null;
      setOperacao(ativo ? 'encerrar' : 'ativar'); setMensagem(''); }}>{ativo ? 'Encerrar Impacto JBS' : 'Acionar Impacto JBS'}</button>}
    {operacao && <form className="impact-form" autoComplete="off" onSubmit={async e => {
      e.preventDefault(); if (enviando) return;
      const form = e.currentTarget; const data = new FormData(form);
      const entrada = { action: operacao, pin: String(data.get('pin') ?? ''), responsavel: String(data.get('responsavel') ?? ''),
        observacao: String(data.get('observacao') ?? ''), ...(operacao === 'ativar' ? { tipo: data.get('tipo') } : { impacto_id: alvo.current }) };
      if (pinRef.current) pinRef.current.value = '';
      const result = comandoImpactoSchema.safeParse(entrada);
      if (!result.success) { setMensagem('Preencha responsável, tipo e PIN válidos.'); return; }
      setEnviando(true); setMensagem('Aguardando confirmação do servidor…');
      try { await store.executar(result.data); setMensagem('Operação confirmada pelo servidor.'); setOperacao(null); }
      catch (error) { setMensagem(error instanceof Error && !error.message.includes('fetch') ? error.message : 'Operação sem confirmação. Último estado conhecido preservado.'); }
      finally { setEnviando(false); }
    }}>
      <fieldset disabled={enviando}><legend>{operacao === 'ativar' ? 'Confirmar acionamento' : 'Confirmar encerramento'}</legend>
        {operacao === 'ativar' && <label>Tipo <select name="tipo" required>{tipoImpactoSchema.options.map(t => <option key={t} value={t}>{labelsImpacto[t]}</option>)}</select></label>}
        <label>Responsável <input name="responsavel" required maxLength={120} autoComplete="off" /></label>
        <label>Observação (opcional) <textarea name="observacao" maxLength={2000} /></label>
        <label>PIN <input ref={pinRef} name="pin" type="password" inputMode="numeric" autoComplete="new-password" required maxLength={128} /></label>
        <button type="submit">{enviando ? 'Confirmando…' : 'Confirmar'}</button>
        <button type="button" onClick={() => { if (pinRef.current) pinRef.current.value = ''; setOperacao(null); }}>Cancelar</button>
      </fieldset>
    </form>}
    <p role="status">{mensagem}</p>
  </section></>;
}
