import { readFile } from 'node:fs/promises';

/** Ausência é primeira execução; corrupção é diagnosticada pelo motor; falha de IO aborta. */
export async function lerAnterior(destino: URL): Promise<unknown> {
  let texto: string;
  try { texto = await readFile(destino, 'utf8'); }
  catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw erro;
  }
  try { return JSON.parse(texto); }
  catch { return { status_anterior_invalido: 'JSON ilegível' }; }
}
