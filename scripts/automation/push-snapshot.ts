import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface GitResult { ok: boolean; output: string }
export type Git = (args: string[]) => GitResult;
export function transientPush(output: string) {
  if (/non-fast-forward|fetch first|pre-receive hook|permission denied|authentication failed|protected branch|GH\d+/i.test(output)) return false;
  return /Internal Server Error|HTTP (?:500|502|503|504)\b|returned error: (?:500|502|503|504)\b|Connection (?:reset|timed out)|remote end hung up unexpectedly/i.test(output);
}
/** Retry only the same immutable commit. No fetch/rebase/force or replacement of a newer snapshot. */
export async function pushSnapshot(branch: string, git: Git, sleep: (ms: number) => Promise<void> = ms => new Promise(r => setTimeout(r, ms))) {
  if (!/^[\w][\w/.-]*$/.test(branch) || branch.includes('..')) throw new Error('Branch inválida.');
  const local = git(['rev-parse', 'HEAD']);
  const parent = git(['rev-parse', 'HEAD^']);
  if (!local.ok || !parent.ok) throw new Error('Não foi possível identificar o snapshot local e sua base.');
  const head = local.output.trim(), base = parent.output.trim();
  for (let attempt = 0; attempt < 3; attempt++) {
    const remote = git(['ls-remote', '--exit-code', 'origin', `refs/heads/${branch}`]);
    if (!remote.ok) {
      if (attempt < 2 && transientPush(remote.output)) { await sleep((attempt + 1) * 3000); continue; }
      throw new Error('Não foi possível revalidar a ponta remota; nenhum push inseguro executado.');
    }
    const tip = remote.output.trim().split(/\s+/)[0];
    if (tip === head) return { attempts: attempt, alreadyPersisted: true };
    if (tip !== base) throw new Error('Ponta remota mudou: abortado sem rebase, force ou substituição do snapshot.');
    const result = git(['push', '--porcelain', 'origin', `HEAD:refs/heads/${branch}`]);
    if (result.ok) return { attempts: attempt + 1, alreadyPersisted: false };
    if (attempt === 2 || !transientPush(result.output)) throw new Error('Push não confirmado; conflito/erro definitivo ou limite de tentativas. Consulte a etapa de persistência.');
    await sleep((attempt + 1) * 3000);
  }
  throw new Error('Limite de tentativas atingido.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const git: Git = args => {
    try { return { ok: true, output: execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe', timeout: 30000 }) }; }
    catch (error) {
      const e = error as { stdout?: string; stderr?: string };
      // Raw Git output remains in memory only; never echo credentials/headers.
      return { ok: false, output: `${e.stdout ?? ''}\n${e.stderr ?? ''}` };
    }
  };
  pushSnapshot(process.env.DEFAULT_BRANCH ?? '', git).then(r => console.log(`Snapshot persistido; tentativas ${r.attempts}; previamente confirmado ${r.alreadyPersisted}.`)).catch(e => { console.error((e as Error).message); process.exitCode = 1; });
}
