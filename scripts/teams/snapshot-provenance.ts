import { isHmlRepository } from '../automation/hml-repository';
const persistence = 'Persistir somente o snapshot validado para o próximo ciclo';
type Run = { id: number; event: string; head_branch: string; run_started_at: string; head_repository: { id: number; full_name: string } };
type Job = { name: string; steps?: { name: string; conclusion: string; started_at: string; completed_at: string }[] };
export class ProvenanceError extends Error {
  constructor(readonly category: 'github_api_failure' | 'github_pagination_limit' | 'provenance_missing' | 'persistence_time_mismatch') { super(category); }
}
// Run metadata is only a search aid. The successful persistence step proves the commit time.
export function createProvenanceVerifier(api: (path: string) => Promise<unknown>) {
  const days = new Map<string, Promise<Run[]>>();
  const jobs = new Map<number, Promise<Job[]>>();
  async function pages<T>(path: string, field: string): Promise<T[]> {
    const all: T[] = [];
    for (let page = 1; page <= 10; page++) {
      let data: Record<string, unknown>;
      try { data = await api(`${path}&per_page=100&page=${page}`) as Record<string, unknown>; }
      catch { throw new ProvenanceError('github_api_failure'); }
      if (!Array.isArray(data[field])) throw new ProvenanceError('github_api_failure');
      const entries = data[field] as T[];
      all.push(...entries);
      if (entries.length < 100) return all;
    }
    // GitHub search caps results at 1,000: never accept an incomplete provenance search.
    throw new ProvenanceError('github_pagination_limit');
  }
  return async (at: number) => {
    if (!Number.isFinite(at)) throw new ProvenanceError('persistence_time_mismatch');
    const day = new Date(at).toISOString().slice(0, 10);
    if (!days.has(day)) {
      const midnight = Date.parse(`${day}T00:00:00Z`);
      const start = new Date(midnight - 86400_000).toISOString();
      const end = new Date(midnight + 2 * 86400_000).toISOString();
      days.set(day, pages<Run>(`actions/workflows/deploy-pages.yml/runs?event=workflow_dispatch&branch=main&created=${encodeURIComponent(`${start}..${end}`)}`, 'workflow_runs'));
    }
    const runs = (await days.get(day)!).filter(r => isHmlRepository(r.head_repository?.full_name, r.head_repository?.id) && r.event === 'workflow_dispatch' && r.head_branch === 'main');
    // Closest first reduces API calls, but no run-start threshold can reject a legitimate step.
    runs.sort((a,b) => Math.abs(at-Date.parse(a.run_started_at))-Math.abs(at-Date.parse(b.run_started_at)));
    let successfulStep = false;
    for (const run of runs) {
      if (!jobs.has(run.id)) jobs.set(run.id, pages<Job>(`actions/runs/${run.id}/jobs?filter=latest`, 'jobs'));
      for (const job of await jobs.get(run.id)!) {
        if (job.name !== 'prepare') continue;
        for (const step of job.steps ?? []) {
          if (step.name !== persistence || step.conclusion !== 'success') continue;
          successfulStep = true;
          if (Date.parse(step.started_at) <= at && at <= Date.parse(step.completed_at)) return;
        }
      }
    }
    throw new ProvenanceError(successfulStep ? 'persistence_time_mismatch' : 'provenance_missing');
  };
}