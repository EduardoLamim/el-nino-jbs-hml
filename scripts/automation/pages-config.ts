export function basePages(env: Record<string, string | undefined> = process.env) {
  const repo = env.GITHUB_REPOSITORY?.split('/')[1];
  const base = env.PAGES_BASE_PATH || (repo ? (repo.endsWith('.github.io') ? '/' : `/${repo}/`) : '/el-nino-jbs-hml/');
  if (!/^\/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*$/.test(base)) throw new Error('PAGES_BASE_PATH deve ser um caminho absoluto com barra final.');
  return base;
}

export function validarAmbientePublico(env: Record<string, string | undefined>, exigir = false) {
  const allowed = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
  if (Object.keys(env).some(k => k.startsWith('VITE_') && !allowed.includes(k))) throw new Error('Variável VITE_ não autorizada. Somente URL e chave publishable são públicas.');
  const url = env.VITE_SUPABASE_URL || '', key = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  if (exigir || url || key) {
    if (url !== 'https://ufeahglxwygvlugfsopi.supabase.co' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error('Configuração pública Supabase ausente/incompatível. Nunca usar service_role ou PIN.');
  }
}
