import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validarStatusPublicavel } from '../automation/status';

export type Snapshot = { collected_at: string; level: string | null; since: string | null; reasons: string[] };
export function projectSnapshot(raw: unknown): Snapshot {
  const s = validarStatusPublicavel(raw);
  return { collected_at: s.atualizado_em!, level: s.nivel_jbs.nivel, since: s.nivel_jbs.desde,
    reasons: s.nivel_jbs.gatilhos.map(g => g.descricao) };
}
export function trustedSnapshotCommit(author: string, subject: string, paths: string[]) {
  return author === '41898282+github-actions[bot]@users.noreply.github.com'
    && subject === 'Atualizar snapshot operacional validado'
    && paths.length === 1 && paths[0] === 'public/data/status.json';
}
export async function reconcile(deps: {
  call: (action: string, payload?: Record<string, unknown>) => Promise<unknown>;
  commits: (cursor: string) => string[];
  snapshot: (sha: string) => Promise<Snapshot>;
}) {
  // Streams are independent: a damaged Git sequence must not prevent Impacto reconciliation or pending delivery.
  const outcomes: Record<string, string> = {};
  try {
    const cursor = await deps.call('checkpoint') as { commit: string | null };
    if (!cursor.commit || !/^[0-9a-f]{40}$/.test(cursor.commit)) throw new Error('Explicit baseline required');
    let previous = cursor.commit;
    for (const commit of deps.commits(previous)) {
      const snapshot = await deps.snapshot(commit);
      await deps.call('snapshot', { commit, previous_commit: previous, snapshot, pages_confirmed: false });
      previous = commit;
    }
    outcomes.snapshots = 'ok';
  } catch { outcomes.snapshots = 'blocked'; }
  try {
    for (let page = 0; page < 10; page++) {
      const result = await deps.call('impacts') as { reconciled: number };
      if (result.reconciled < 100) break;
    }
    outcomes.impacts = 'ok';
  } catch { outcomes.impacts = 'blocked'; }
  try {
    for (let i = 0; i < 8; i++) {
      const result = await deps.call('drain') as { status: string };
      if (result.status === 'idle') break;
    }
    outcomes.worker = 'ok';
  } catch { outcomes.worker = 'blocked'; }
  return outcomes;
}

async function main() {
  if (process.env.GITHUB_REPOSITORY !== 'EduardoLamim/el-nino-jbs-hml') throw new Error('HML repository required');
  const credential = process.env.TEAMS_WAKE_TOKEN_HML ?? '';
  const github = process.env.GITHUB_TOKEN ?? '';
  if (credential.length < 64 || !github) throw new Error('Missing notification credential');
  const call = async (action: string, payload = {}) => {
    const r = await fetch('https://ufeahglxwygvlugfsopi.supabase.co/functions/v1/teams-notifications', {
      method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }), signal: AbortSignal.timeout(40_000), redirect: 'error',
    });
    if (!r.ok) { await r.body?.cancel(); throw new Error('Notification endpoint failed'); }
    return r.json();
  };
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore','pipe','pipe'] }).trim();
  const api = async (path: string) => {
    const r = await fetch(`https://api.github.com/repos/EduardoLamim/el-nino-jbs-hml/${path}`, {
      headers: { Authorization: `Bearer ${github}`, Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15_000), redirect: 'error',
    });
    if (!r.ok) { await r.body?.cancel(); throw new Error('Provenance lookup failed'); }
    return r.json();
  };
  const result = await reconcile({ call,
    commits(cursor) {
      git('merge-base', '--is-ancestor', cursor, 'HEAD');
      return git('log', '--first-parent', '--reverse', '--format=%H', `${cursor}..HEAD`, '--', 'public/data/status.json').split('\n').filter(Boolean);
    },
    async snapshot(sha) {
      const [author, subject, committed] = git('show','-s','--format=%ae%n%s%n%cI',sha).split('\n');
      if (!trustedSnapshotCommit(author!, subject!, git('diff-tree','--no-commit-id','--name-only','-r',sha).split('\n'))) throw new Error('Untrusted snapshot');
      // Verify the persistence step, not the overall job: later artifact upload/Pages can fail.
      const at = Date.parse(committed!);
      const start = new Date(at - 24 * 3600_000).toISOString(), end = new Date(at + 3600_000).toISOString();
      const runs = await api(`actions/workflows/deploy-pages.yml/runs?event=workflow_dispatch&branch=main&per_page=100&created=${encodeURIComponent(`${start}..${end}`)}`) as { workflow_runs: { id: number; run_started_at: string; head_repository: { full_name: string } }[] };
      let verified = false;
      for (const run of runs.workflow_runs.filter(r => r.head_repository.full_name === 'EduardoLamim/el-nino-jbs-hml' && Math.abs(at - Date.parse(r.run_started_at)) < 15 * 60_000)) {
        const jobs = await api(`actions/runs/${run.id}/jobs?per_page=100`) as { jobs: { name: string; steps: { name: string; conclusion: string; started_at: string; completed_at: string }[] }[] };
        if (jobs.jobs.some(j => j.name === 'prepare' && j.steps.some(step =>
          step.name === 'Persistir somente o snapshot validado para o próximo ciclo' && step.conclusion === 'success'
          && Date.parse(step.started_at) <= at && at <= Date.parse(step.completed_at)))) { verified = true; break; }
      }
      if (!verified) throw new Error('No pipeline evidence for snapshot');
      return projectSnapshot(JSON.parse(git('show',`${sha}:public/data/status.json`)));
    },
  });
  console.log(JSON.stringify(result));
  if (Object.values(result).some(s => s !== 'ok')) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Notification reconciliation failed (sanitized). Operational pipeline unaffected.'); process.exitCode = 1; });
}
