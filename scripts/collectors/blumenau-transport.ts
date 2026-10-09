import { get } from 'node:https';
import { rootCertificates } from 'node:tls';
import { readFileSync } from 'node:fs';
import type { Transport } from './http';
import { blumenauUrl } from '../../src/domain/blumenau';

// The source omits its intermediates. Complete its chain, never trust its leaf,
// disable verification, or change the trust store of any other collector.
export const blumenauTls = {
  ca: [...rootCertificates, readFileSync(new URL('./certificates/blumenau-intermediates.pem', import.meta.url), 'utf8')],
  rejectUnauthorized: true,
  allowPartialTrustChain: false,
} as const;

export const blumenauTransport: Transport = async (url, init) => {
  if (url !== blumenauUrl) throw new Error('Transporte restrito à fonte oficial de Blumenau.');
  return new Promise((resolve, reject) => {
    const request = get(url, { ...blumenauTls, ca: [...blumenauTls.ca], signal: init.signal ?? undefined,
      headers: { Accept: 'text/html', 'User-Agent': 'JBS-ElNino-Collector/0.2' } }, response => {
      const chunks: Buffer[] = []; let bytes = 0;
      response.on('error', reject);
      response.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 8 * 1024 * 1024) { response.destroy(new Error('Resposta excede 8 MiB.')); return; }
        chunks.push(chunk);
      });
      response.on('end', () => {
        // No redirects: a changed endpoint requires review, not implicit trust.
        const status = response.statusCode ?? 502;
        if (status >= 300 && status < 400) { reject(new Error('Redirecionamento da fonte oficial não autorizado.')); return; }
        resolve(new Response(status === 204 || status === 304 ? null : new Uint8Array(Buffer.concat(chunks)), {
          status, headers: { 'content-type': response.headers['content-type'] ?? 'text/html; charset=utf-8' },
        }));
      });
    });
    request.on('error', reject);
  });
};
