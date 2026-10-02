import { parseStatus, parseTerritorio } from '../domain/contracts';

async function carregarJson(arquivo: string, signal?: AbortSignal): Promise<unknown> {
  const resposta = await fetch(`${import.meta.env.BASE_URL}data/${arquivo}`, { signal });
  if (!resposta.ok) throw new Error(`Falha ao carregar ${arquivo}: HTTP ${resposta.status}`);
  return resposta.json() as Promise<unknown>;
}
export async function carregarDados(signal?: AbortSignal) {
  const [status, territorio] = await Promise.all([
    carregarJson('status.json', signal), carregarJson('territorio.json', signal),
  ]);
  return { status: parseStatus(status), territorio: parseTerritorio(territorio) };
}
