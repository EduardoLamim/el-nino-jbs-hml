import { useEffect, useRef, useState } from 'react';
import { carregarHistorico, carregarManifesto } from '../services/history-data';
import type { ArquivoHistorico, ColecaoHistorica } from '../domain/map-layers';
export function useHistoryLayer(id: string, enabled: boolean) {
  const cache = useRef(new Map<string, { geo: ColecaoHistorica; arquivo: ArquivoHistorico }>());
  const [estado, setEstado] = useState<{ id: string; geo: ColecaoHistorica | null; arquivo?: ArquivoHistorico; carregando: boolean; erro: boolean }>({ id, geo: null, carregando: false, erro: false });
  useEffect(() => {
    if (!enabled) return;
    const cached = cache.current.get(id);
    if (cached) { setEstado({ id, ...cached, carregando: false, erro: false }); return; }
    const controller = new AbortController();
    setEstado({ id, geo: null, carregando: true, erro: false });
    (async () => {
      const manifest = await carregarManifesto(controller.signal);
      const arquivo = manifest.arquivos.find(a => a.id === id);
      if (!arquivo) throw new Error('Referência não encontrada');
      const geo = await carregarHistorico(arquivo, controller.signal);
      if (controller.signal.aborted) return;
      if (cache.current.size >= 2) cache.current.delete(cache.current.keys().next().value!);
      cache.current.set(id, { geo, arquivo });
      setEstado({ id, geo, arquivo, carregando: false, erro: false });
    })().catch(() => { if (!controller.signal.aborted) setEstado({ id, geo: null, carregando: false, erro: true }); });
    return () => controller.abort();
  }, [id, enabled]);
  return { ...estado, geo: enabled && estado.id === id ? estado.geo : null };
}
