import { readFile, writeFile, rename, rm, appendFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { coletar } from '../collectors/pipeline';
import { validarStatusPublicavel } from './status';

export async function atualizar(destino = 'public/data/status.json', pipeline = coletar) {
  // Automação exige snapshot válido: corrupção não pode reiniciar a continuidade silenciosamente.
  const original = await readFile(destino, 'utf8');
  const anterior = validarStatusPublicavel(JSON.parse(original));
  const novo = validarStatusPublicavel(await pipeline(undefined, anterior));
  if (Date.parse(novo.atualizado_em!) <= Date.parse(anterior.atualizado_em!)) throw new Error('Saída não é posterior ao snapshot anterior.');
  const texto = JSON.stringify(novo, null, 2) + '\n';
  validarStatusPublicavel(JSON.parse(texto));
  const temp = `${destino}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, texto, { flag: 'wx' });
    if (await readFile(destino, 'utf8') !== original) throw new Error('Snapshot mudou durante a coleta; publicação abortada.');
    await rename(temp, destino);
  } finally { await rm(temp, { force: true }); }
  return novo;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log('Início da atualização operacional; lendo snapshot persistido.');
    const s = await atualizar();
    const falhas = Object.entries(s.fontes).filter(([, f]) => f.resultado === 'falha').map(([id]) => id);
    for (const [id, f] of Object.entries(s.fontes)) console.log(`${id}: ${f.resultado}; consulta ${f.coletado_em}; qualidade ${f.qualidade ?? 'não informada'}`);
    console.log(`Saída validada e gravada atomicamente: ${s.atualizado_em}; qualidade ${s.qualidade_monitoramento.estado}.`);
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `degraded=${falhas.length > 0}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `### Coleta operacional\n\nSnapshot: ${s.atualizado_em}. Qualidade: ${s.qualidade_monitoramento.estado}. Fontes com falha: ${falhas.join(', ') || 'nenhuma'}.\n`);
    // Snapshot degradado válido pode ser publicado. O job de diagnóstico sinaliza falha após publicação.
    if (falhas.length) console.warn(`::warning::Fontes indisponíveis: ${falhas.join(', ')}. Estado degradado explícito; não representa normalidade.`);
  } catch (e) { console.error(e instanceof Error ? e.message : 'Falha de atualização'); process.exitCode = 1; }
}
