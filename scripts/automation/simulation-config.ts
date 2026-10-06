/** Fail closed: an ordinary/PRD build never includes the simulation UI. */
export function simulationEnabled(env: Record<string, string | undefined>, mode: string, command: string) {
  if (env.APP_ENV && env.APP_ENV !== 'hml' && env.APP_ENV !== 'development') return false;
  if (command === 'serve' && mode === 'development') return true;
  if (env.APP_ENV !== 'hml' || env.ENABLE_HML_SIMULATION !== 'true') return false;
  if (env.GITHUB_REPOSITORY && env.GITHUB_REPOSITORY !== 'EduardoLamim/el-nino-jbs-hml') return false;
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL !== 'https://ufeahglxwygvlugfsopi.supabase.co') return false;
  return true;
}
