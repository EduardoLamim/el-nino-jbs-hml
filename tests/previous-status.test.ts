import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { lerAnterior } from '../scripts/collectors/previous-status';

it('leitura do arquivo distingue primeira execução, JSON válido, corrupção e falha de IO', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'jbs-status-test-'));
  const arquivo = join(pasta, 'status.json');
  const url = pathToFileURL(arquivo);
  try {
    expect(await lerAnterior(url)).toBeUndefined();
    await writeFile(arquivo, JSON.stringify({ versao: 1 }));
    expect(await lerAnterior(url)).toEqual({ versao: 1 });
    await writeFile(arquivo, '{interrompido');
    expect(await lerAnterior(url)).toHaveProperty('status_anterior_invalido');
    await expect(lerAnterior(pathToFileURL(pasta))).rejects.toThrow();
  } finally {
    await unlink(arquivo).catch(() => undefined);
    await rmdir(pasta);
  }
});
