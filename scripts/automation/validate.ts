import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseTerritorio, bairrosGeojsonSchema } from '../../src/domain/territory';
import { manifestoHistoricoSchema, validarColecao, contarVertices } from '../../src/domain/map-layers';
import { validarStatusPublicavel } from './status';
import { basePages } from './pages-config';

const json = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, 'utf8'));
export async function validarDados(root = 'public') {
  const status = validarStatusPublicavel(await json(join(root, 'data/status.json')));
  const territorio = parseTerritorio(await json(join(root, 'data/territorio.json')));
  const geo = bairrosGeojsonSchema.parse(await json(join(root, 'data/bairros.geojson')));
  if (geo.features.length !== 35 || territorio.bairros.length !== 35 || geo.features.some(f => !territorio.bairros.some(b => b.id === f.id && b.nome === f.properties.nome))) throw new Error('Base dos 35 bairros incompatível.');
  const manifesto = manifestoHistoricoSchema.parse(await json(join(root, 'data/historico/manifesto.json')));
  for (const a of manifesto.arquivos) {
    const bytes = await readFile(join(root, 'data/historico', a.arquivo));
    if (bytes.length !== a.bytes || createHash('sha256').update(bytes).digest('hex') !== a.sha256) throw new Error(`Integridade histórica: ${a.id}`);
    const g = validarColecao(JSON.parse(bytes.toString('utf8')), a.tipo, a.contagem);
    if (g.features.reduce((s, f) => s + contarVertices(f.geometry.coordinates), 0) !== a.vertices) throw new Error(`Vértices: ${a.id}`);
  }
  return { status, manifesto };
}
export function verificarConteudoPublico(texto: string, env: Record<string, string | undefined> = process.env) {
  if (/sb_secret_[A-Za-z0-9_-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+/.test(texto)) throw new Error('Credencial privada no artefato.');
  for (const jwt of texto.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try { if (JSON.parse(Buffer.from(jwt[1]!, 'base64url').toString()).role === 'service_role') throw new Error('service_role no artefato.'); }
    catch (e) { if (e instanceof Error && e.message === 'service_role no artefato.') throw e; }
  }
  for (const [nome, valor] of Object.entries(env)) {
    if (/SERVICE_ROLE|BACKEND_TOKEN|IMPACT_PIN|GITHUB_TOKEN|PRIVATE_KEY|ADMIN_PASSWORD/.test(nome) && valor && valor.length >= 8 && texto.includes(valor)) throw new Error('Valor secreto do ambiente encontrado no artefato.');
  }
}
async function arquivos(root: string, sub = ''): Promise<string[]> {
  const resultado: string[] = [];
  for (const item of await readdir(join(root, sub), { withFileTypes: true })) {
    const path = sub ? `${sub}/${item.name}` : item.name;
    if (item.isSymbolicLink()) throw new Error('Link simbólico não permitido no artefato.');
    if (item.isDirectory()) resultado.push(...await arquivos(root, path));
    else resultado.push(path);
  }
  return resultado;
}
export async function validarArtefato(root = 'dist', base = basePages()) {
  const { manifesto } = await validarDados(root);
  const paths = await arquivos(root);
  const data = ['data/status.json', 'data/territorio.json', 'data/bairros.geojson', 'data/historico/manifesto.json', ...manifesto.arquivos.map(a => `data/historico/${a.arquivo}`)];
  const permitido = new Set(['index.html', '.vite/manifest.json', ...data]);
  for (const path of paths) {
    if (!permitido.has(path) && !/^assets\/[\w.-]+\.(?:js|css|png|svg|woff2?)$/.test(path)) throw new Error(`Arquivo não previsto no artefato: ${path}`);
    verificarConteudoPublico(await readFile(join(root, path), 'utf8'));
  }
  for (const path of permitido) if (!paths.includes(path)) throw new Error(`Arquivo ausente: ${path}`);
  const index = await readFile(join(root, 'index.html'), 'utf8');
  const referencias = [...index.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]!);
  if (!referencias.some(r => r.endsWith('.js')) || !referencias.some(r => r.endsWith('.css'))) throw new Error('Index sem JS/CSS.');
  for (const ref of referencias) if (ref !== 'data:,' && (!ref.startsWith(base) || !paths.includes(ref.slice(base.length)))) throw new Error(`Referência fora do subpath ou ausente: ${ref}`);
  const chunks = await json(join(root, '.vite/manifest.json')) as Record<string, { file: string; css?: string[]; imports?: string[]; dynamicImports?: string[] }>;
  if (!Object.keys(chunks).some(k => k.includes('TerritoryMap'))) throw new Error('Chunk lazy do mapa ausente.');
  for (const chunk of Object.values(chunks)) {
    for (const file of [chunk.file, ...(chunk.css ?? [])]) if (!paths.includes(file)) throw new Error(`Asset ausente: ${file}`);
    for (const key of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) if (!chunks[key]) throw new Error(`Import lazy ausente: ${key}`);
  }
  for (const path of data) if (!(await readFile(join(root, path))).equals(await readFile(join('public', path)))) throw new Error(`Build diverge da entrada: ${path}`);
  return { base, arquivos: paths.length, bytes: (await Promise.all(paths.map(p => stat(join(root, p))))).reduce((s, a) => s + a.size, 0) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.includes('--artifact')) console.log('Artefato validado:', JSON.stringify(await validarArtefato()));
    else { const { status, manifesto } = await validarDados(); console.log(`Dados validados: ${status.atualizado_em}; ${manifesto.arquivos.length} datasets históricos íntegros.`); }
  } catch (e) { console.error(e instanceof Error ? e.message : 'Falha de validação'); process.exitCode = 1; }
}
