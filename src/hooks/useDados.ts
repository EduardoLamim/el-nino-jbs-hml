import { useEffect, useState } from 'react';
import { carregarDados } from '../services/data';

type Estado = { estado: 'carregando' } | { estado: 'erro'; mensagem: string }
  | { estado: 'carregado'; dados: Awaited<ReturnType<typeof carregarDados>> };
export function useDados(): Estado {
  const [estado, setEstado] = useState<Estado>({ estado: 'carregando' });
  useEffect(() => {
    const controller = new AbortController();
    carregarDados(controller.signal).then(dados => {
      if (!controller.signal.aborted) setEstado({ estado: 'carregado', dados });
    }).catch(() => {
      if (!controller.signal.aborted) setEstado({ estado: 'erro',
        mensagem: 'Dados indisponíveis ou contrato inválido. Não é possível determinar a condição operacional.' });
    });
    return () => controller.abort();
  }, []);
  return estado;
}
