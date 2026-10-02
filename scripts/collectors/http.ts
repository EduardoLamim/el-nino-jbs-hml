export interface Requisicao {
  url: string;
  coletado_em: string;
  http_status: number | null;
  erro: string | null;
  resposta_erro: string | null;
}
export type Transport = (url: string, init: RequestInit) => Promise<Response>;
export function criarHttp(registros: Requisicao[], transport: Transport = fetch, timeoutMs = 20000) {
  return async (url: string): Promise<string> => {
    const registro: Requisicao = { url, coletado_em: new Date().toISOString(), http_status: null,
      erro: null, resposta_erro: null };
    registros.push(registro);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resposta = await transport(url, { signal: controller.signal, redirect: 'error',
        headers: { Accept: 'application/json, text/html, application/xml, text/xml',
          'User-Agent': 'JBS-ElNino-Collector/0.2' } });
      registro.http_status = resposta.status;
      const leitor = resposta.body?.getReader();
      if (!leitor) throw new Error('Resposta sem corpo.');
      const partes: Uint8Array[] = [];
      let tamanho = 0;
      while (true) {
        const { done, value } = await leitor.read();
        if (done) break;
        tamanho += value.length;
        if (tamanho > 8 * 1024 * 1024) { await leitor.cancel(); throw new Error('Resposta excede 8 MiB.'); }
        partes.push(value);
      }
      const bytes = Buffer.concat(partes);
      const declaracao = bytes.subarray(0, 200).toString('ascii');
      const charset = resposta.headers.get('content-type')?.match(/charset=["']?([\w-]+)/i)?.[1]
        ?? declaracao.match(/encoding=["']([\w-]+)/i)?.[1] ?? 'utf-8';
      const texto = new TextDecoder(charset, { fatal: true }).decode(bytes);
      if (!resposta.ok) {
        registro.resposta_erro = texto.slice(0, 500);
        throw new Error(`HTTP ${resposta.status} ${resposta.statusText}`);
      }
      return texto;
    } catch (erro) {
      registro.erro = controller.signal.aborted ? `Timeout após ${timeoutMs} ms` : erro instanceof Error ? erro.message : String(erro);
      throw new Error(`${url}: ${registro.erro}`);
    } finally { clearTimeout(timer); }
  };
}
