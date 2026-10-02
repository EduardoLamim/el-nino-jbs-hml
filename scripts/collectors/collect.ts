import { mkdir, rename, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { coletar } from './pipeline';
import { lerAnterior } from './previous-status';

const diretorio = new URL('../../public/data/', import.meta.url);
const destino = new URL('status.json', diretorio);
const temporario = new URL(`status.${randomUUID()}.tmp`, diretorio);
try {
  const anterior = await lerAnterior(destino);
  const status = await coletar(undefined, anterior);
  await mkdir(diretorio, { recursive: true });
  await writeFile(temporario, JSON.stringify(status, null, 2) + '\n', { flag: 'wx' });
  await rename(temporario, destino);
  for (const [nome, fonte] of Object.entries(status.fontes)) {
    console.log(`${nome}: ${fonte.resultado} | ${fonte.coletado_em} | ${fonte.motivo ?? 'aquisição validada'}`);
    for (const aviso of fonte.avisos ?? []) console.log(`  Aviso: ${aviso}`);
  }
  console.log(`Rios: ${Object.keys(status.rios).length}; chuva: ${Object.keys(status.chuvas).length}; barragens: ${Object.keys(status.barragens).length}; previsão: ${status.previsao.dias.length} dias.`);
  console.log(`Gerado e validado: ${fileURLToPath(destino)}. Nível JBS: ${status.nivel_jbs.nivel ?? 'desconhecido'}.`);
  console.log(`Qualidade: ${status.qualidade_monitoramento.estado}. Desde: ${status.nivel_jbs.desde ?? 'não reconstruível'}.`);
  for (const gatilho of status.nivel_jbs.gatilhos) console.log(`Gatilho: ${JSON.stringify(gatilho)}`);
  // Falha parcial é visível também ao chamador; os dados válidos já foram gravados.
  if (Object.values(status.fontes).some(f => f.resultado === 'falha')) process.exitCode = 1;
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
} finally { await rm(temporario, { force: true }); }
