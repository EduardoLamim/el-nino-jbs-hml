import { describe, expect, it } from 'vitest';
import { X509Certificate } from 'node:crypto';
import { rootCertificates } from 'node:tls';
import { blumenauTls, blumenauTransport } from '../scripts/collectors/blumenau-transport';

describe('Cadeia TLS restrita de Blumenau', () => {
  it('completa intermediários assinados até uma raiz já confiável, sem confiar no leaf', () => {
    const certificates = blumenauTls.ca.at(-1)!.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g)!.map(pem => new X509Certificate(pem));
    expect(certificates).toHaveLength(2);
    const [issuer, cross] = certificates as [X509Certificate, X509Certificate];
    expect(issuer.ca && cross.ca).toBe(true);
    expect(issuer.fingerprint256).toBe('8C:54:C3:34:B6:6B:A4:E4:26:77:2A:F4:A3:F9:13:6C:19:A1:AE:C7:29:FD:B2:8C:53:5C:07:A5:A4:EF:22:E0');
    expect(issuer.verify(cross.publicKey)).toBe(true);
    expect(rootCertificates.map(p => new X509Certificate(p)).some(root => cross.issuer === root.subject && cross.verify(root.publicKey))).toBe(true);
    expect(blumenauTls.rejectUnauthorized).toBe(true);
    expect(blumenauTls.allowPartialTrustChain).toBe(false);
  });
  it('não reutiliza o transporte para HTTP, outro host ou outro caminho', async () => {
    for (const url of ['http://defesacivil.blumenau.sc.gov.br/d/nivel-do-rio', 'https://example.com', 'https://defesacivil.blumenau.sc.gov.br/outro']) {
      await expect(blumenauTransport(url, {})).rejects.toThrow('restrito');
    }
  });
});
