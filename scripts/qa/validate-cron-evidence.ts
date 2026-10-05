import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
type Cycle = { request_id: number; expected_at: string; requested_at: string; http_status: number; timed_out: boolean; edge_response: { github_status: number; workflow_run_id: number }; cron?: { status: string; start_time: string }; run: { id: number; event: string; conclusion: string; updated_at: string }; commit?: { sha: string; date: string }; snapshot_at: string; pages_at: string; same_snapshot: boolean; snapshot_sha256: string; pages_sha256: string; published: boolean };
const cycles = JSON.parse(readFileSync('docs/fase-10-cron-evidencias/cycles.json','utf8')) as Cycle[];
assert(cycles.length >= 12, `Somente ${cycles.length}/12 ciclos documentados`);
const selected = cycles.slice(-12);
assert.equal(new Set(selected.map(c => c.run.id)).size,12,'Workflow repetido');
for (const [i,c] of selected.entries()) {
  assert.equal(c.cron?.status,'succeeded'); assert.equal(c.http_status,202); assert.equal(c.timed_out,false);
  assert.equal(c.edge_response.github_status,200); assert.equal(c.edge_response.workflow_run_id,c.run.id);
  assert.equal(c.run.event,'workflow_dispatch'); assert.equal(c.run.conclusion,'success'); assert(c.published && c.same_snapshot);
  assert(c.commit?.sha); assert.equal(c.pages_at,c.snapshot_at); assert.equal(c.snapshot_sha256,c.pages_sha256);
  const expected=Date.parse(c.expected_at), real=Date.parse(c.cron!.start_time);
  assert(real>=expected && real-expected<120000,'Atraso Cron exige investigação');
  assert(Date.parse(c.run.updated_at)-expected<600000,'Publicação ultrapassou o ciclo seguinte');
  if(i){assert.equal(expected-Date.parse(selected[i-1]!.expected_at),600000,'Ciclo ausente ou duplicado');assert(Date.parse(c.snapshot_at)>Date.parse(selected[i-1]!.snapshot_at),'Regressão/repetição de snapshot');}
}
console.log('12 ciclos consecutivos: Cron, Edge, dispatch, workflow, Git e Pages comprovados.');
