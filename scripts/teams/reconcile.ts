import { createProvenanceVerifier, ProvenanceError } from './snapshot-provenance';
import { requireHmlRepository } from '../automation/hml-repository';
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
  maxSnapshots?: number;
  deadline?: number;
  diagnostic?: (category: string) => void;
}) {
  // Streams are independent: a damaged Git sequence must not prevent Impacto reconciliation or pending delivery.
  const outcomes: Record<string, string> = {};
  try {
    const cursor = await deps.call('checkpoint') as { commit: string | null };
    if (!cursor.commit || !/^[0-9a-f]{40}$/.test(cursor.commit)) throw new Error('Explicit baseline required');
    let previous = cursor.commit;
    const commits = deps.commits(previous);
    let processed = 0;
    for (const commit of commits) {
      if (processed >= (deps.maxSnapshots ?? Infinity) || Date.now() >= (deps.deadline ?? Infinity)) break;
      const snapshot = await deps.snapshot(commit);
      await deps.call('snapshot', { commit, previous_commit: previous, snapshot, pages_confirmed: false });
      previous = commit;
      processed++;
    }
    outcomes.snapshots = processed === commits.length ? 'ok' : 'partial';
  } catch (error) {
    outcomes.snapshots = 'blocked';
    deps.diagnostic?.(error instanceof ProvenanceError ? error.category : 'snapshot_or_checkpoint_rejected');
  }
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
  const repository = requireHmlRepository(process.env);
  const credential = process.env.TEAMS_WAKE_TOKEN_HML ?? '';
  const github = process.env.GITHUB_TOKEN ?? '';
  if (credential.length < 64 || !github) throw new Error('Missing notification credential');
  const progress: { snapshots: number; checkpoint: string | null } = { snapshots: 0, checkpoint: null };
  const call = async (action: string, payload: Record<string, unknown> = {}) => {
    const r = await fetch('https://ufeahglxwygvlugfsopi.supabase.co/functions/v1/teams-notifications', {
      method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }), signal: AbortSignal.timeout(40_000), redirect: 'error',
    });
    if (!r.ok) { await r.body?.cancel(); throw new Error('Notification endpoint failed'); }
    const response = await r.json();
    if (action === 'snapshot') { progress.snapshots++; progress.checkpoint = payload.commit as string; }
    return response;
  };
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore','pipe','pipe'] }).trim();
  const api = async (path: string) => {
    const r = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
      headers: { Authorization: `Bearer ${github}`, Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15_000), redirect: 'error',
    });
    if (!r.ok) { await r.body?.cancel(); throw new ProvenanceError('github_api_failure'); }
    return r.json();
  };
  const verify = createProvenanceVerifier(api);
  const result = await reconcile({ call, maxSnapshots: 100, deadline: Date.now() + 6 * 60_000,
    diagnostic: category => console.error(JSON.stringify({ snapshots_error: category })),
    commits(cursor) {
      git('merge-base', '--is-ancestor', cursor, 'HEAD');
      return git('log', '--first-parent', '--reverse', '--format=%H', `${cursor}..HEAD`, '--', 'public/data/status.json').split('\n').filter(Boolean);
    },
    async snapshot(sha) {
      const [author, subject, committed] = git('show','-s','--format=%ae%n%s%n%cI',sha).split('\n');
      if (!trustedSnapshotCommit(author!, subject!, git('diff-tree','--no-commit-id','--name-only','-r',sha).split('\n'))) throw new Error('Untrusted snapshot');
      await verify(Date.parse(committed!));
      return projectSnapshot(JSON.parse(git('show',`${sha}:public/data/status.json`)));
    },
  });
  console.log(JSON.stringify(result));
  console.log(JSON.stringify({ reconciliation_progress: progress }));
  if (Object.values(result).some(s => s === 'blocked')) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Notification reconciliation failed (sanitized). Operational pipeline unaffected.'); process.exitCode = 1; });
}
