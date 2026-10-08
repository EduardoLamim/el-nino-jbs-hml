import { describe, expect, it, vi } from 'vitest';
import { pushSnapshot, transientPush, type GitResult } from '../scripts/automation/push-snapshot';
const ok = (output: string): GitResult => ({ ok: true, output });
const fail = (output: string): GitResult => ({ ok: false, output });
function gitResults(results: GitResult[]) { return vi.fn(() => { const r = results.shift(); if (!r) throw Error('Comando inesperado'); return r; }); }
describe('Persistência resiliente sem sobrescrever snapshots', () => {
  it('erro 500, revalidação da base e sucesso da mesma revisão', async () => {
    const git = gitResults([ok('head'), ok('base'), ok('base refs/heads/main'), fail('remote: Internal Server Error\n ! [remote rejected] HEAD -> main (Internal Server Error)'), ok('base refs/heads/main'), ok('ok')]);
    const sleep = vi.fn(async () => {});
    expect(await pushSnapshot('main', git, sleep)).toEqual({ attempts: 2, alreadyPersisted: false });
    expect(sleep).toHaveBeenCalledWith(3000);
    expect(git.mock.calls).toEqual([['rev-parse', 'HEAD'], ['rev-parse', 'HEAD^'], ['ls-remote', '--exit-code', 'origin', 'refs/heads/main'], ['push', '--porcelain', 'origin', 'HEAD:refs/heads/main'], ['ls-remote', '--exit-code', 'origin', 'refs/heads/main'], ['push', '--porcelain', 'origin', 'HEAD:refs/heads/main']].map(args => [args]));
  });
  it('commit já aceito apesar da resposta perdida não é reenviado', async () => {
    const git = gitResults([ok('head'), ok('base'), ok('base ref'), fail('Connection reset'), ok('head ref')]);
    expect((await pushSnapshot('main', git, async () => {})).alreadyPersisted).toBe(true);
    expect(git).toHaveBeenCalledTimes(5);
  });
  it('snapshot remoto novo aborta antes da repetição', async () => {
    const git = gitResults([ok('head'), ok('base'), ok('base ref'), fail('HTTP 500'), ok('newer ref')]);
    await expect(pushSnapshot('main', git, async () => {})).rejects.toThrow('Ponta remota mudou');
  });
  it('conflito, autorização e branch protegida não repetem', async () => {
    for (const message of ['non-fast-forward', 'rejected (fetch first)', 'Authentication failed', 'GH006 protected branch']) {
      const git = gitResults([ok('head'), ok('base'), ok('base ref'), fail(message)]);
      await expect(pushSnapshot('main', git, async () => {})).rejects.toThrow('Push não confirmado');
      expect(git).toHaveBeenCalledTimes(4);
    }
  });
  it('falhas contínuas limitadas a três tentativas e dois backoffs', async () => {
    const git = gitResults([ok('head'), ok('base'), ...Array.from({ length: 3 }, () => [ok('base ref'), fail('HTTP 503')]).flat()]);
    const sleep = vi.fn(async () => {});
    await expect(pushSnapshot('main', git, sleep)).rejects.toThrow('limite');
    expect(sleep.mock.calls).toEqual([[3000], [6000]]);
  });
  it('erro desconhecido e certificado inválido não são transitórios aceitos', () => {
    expect(transientPush('certificate invalid')).toBe(false); expect(transientPush('unknown')).toBe(false);
  });
});
