export const HML_REPOSITORY_ID = '1401997354';
export const HML_REPOSITORIES = ['EduardoLamim/el-nino-jbs-hml', 'EduardoLamim/monitoramento-el-nino-hml'] as const;
export function isHmlRepository(name: unknown, id: unknown) {
  return String(id) === HML_REPOSITORY_ID && HML_REPOSITORIES.some(expected => expected === name);
}
export function requireHmlRepository(env: Record<string, string | undefined>) {
  if (!isHmlRepository(env.GITHUB_REPOSITORY, env.GITHUB_REPOSITORY_ID)) throw new Error('HML repository identity required');
  return env.GITHUB_REPOSITORY!;
}
