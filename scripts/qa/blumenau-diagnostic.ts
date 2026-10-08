import { lookup } from 'node:dns/promises';
import { createHash } from 'node:crypto';
import { parseBlumenau } from '../collectors/blumenau';
import { blumenauUrl } from '../../src/domain/blumenau';

// Public endpoint only: no environment, authorization headers or response body logged.
console.log('Blumenau diagnostic', { node: process.version, platform: process.platform });
try { console.log('DNS', await lookup(new URL(blumenauUrl).hostname, { all: true })); }
catch { console.log('DNS lookup failed'); }
const started = Date.now();
try {
  const response = await fetch(blumenauUrl, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  const html = await response.text();
  console.log('HTTP', { status: response.status, redirect: response.headers.get('location'), bytes: Buffer.byteLength(html), sha256: createHash('sha256').update(html).digest('hex'), elapsedMs: Date.now() - started });
  if (response.ok) console.log('Parsed official reading', parseBlumenau(html, new Date().toISOString()));
} catch (error) {
  const e = error as Error & { cause?: { code?: string } };
  console.log('Blumenau failure', { type: e.name, code: e.cause?.code ?? null, elapsedMs: Date.now() - started });
}
