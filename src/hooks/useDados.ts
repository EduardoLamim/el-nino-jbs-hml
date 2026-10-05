import { useEffect, useState } from 'react';
import { carregarDados } from '../services/data';

type Estado = { estado: 'carregando' } | { estado: 'erro'; mensagem: string }
  | { estado: 'carregado'; dados: Awaited<ReturnType<typeof carregarDados>>; aviso?: string };
export function useDados(): Estado {
  const [estado, setEstado] = useState<Estado>({ estado: 'carregando' });
  useEffect(() => {
    const controller = new AbortController();
    let pendente = false;
    let ultimaGeracao = -Infinity;
    const atualizar = async () => {
      if (pendente || controller.signal.aborted) return;
      pendente = true;
      try {
        const dados = await carregarDados(controller.signal);
        const geracao = dados.status.atualizado_em ? Date.parse(dados.status.atualizado_em) : -Infinity;
        if (geracao < ultimaGeracao) throw new Error('Snapshot anterior ao já apresentado.');
        if (!controller.signal.aborted) { ultimaGeracao = geracao; setEstado({ estado: 'carregado', dados }); }
      } catch {
        if (!controller.signal.aborted) setEstado(anterior => anterior.estado === 'carregado'
          ? { ...anterior, aviso: 'Não foi possível obter uma nova leitura. Última coleta disponível preservada; consulte os horários.' }
          : { estado: 'erro', mensagem: 'Dados indisponíveis ou contrato inválido. Não é possível determinar a condição operacional.' });
      } finally { pendente = false; }
    };
    void atualizar();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void atualizar(); }, 600_000);
    const aoRetornar = () => { if (document.visibilityState === 'visible') void atualizar(); };
    document.addEventListener('visibilitychange', aoRetornar);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', aoRetornar); };
  }, []);
  return estado;
}
