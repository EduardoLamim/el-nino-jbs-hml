import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { basePages } from './pages-config';
import { setTimeout as delay } from 'node:timers/promises';

const base = basePages();
const origin = process.env.SMOKE_ORIGIN || 'http://127.0.0.1:4173';
const url = origin + base;
const output = '.codex_work/fase08';
await mkdir(output, { recursive: true });
for (let attempt = 0; ; attempt++) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (!r.ok) throw new Error('Servidor não pronto'); break; }
  catch (e) { if (attempt >= 19) throw e; await delay(500); }
}
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const report = { utc: new Date().toISOString(), browser: browser.version(), base, checks: [] as string[], localFailures: [] as string[], errors: [] as string[], consoleErrors: [] as string[], gis: [] as { url: string; status: number }[] };
function observe(page: Page) {
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') report.consoleErrors.push(e.text()); });
  page.on('response', r => {
    if (r.url().startsWith(origin) && r.status() >= 400) report.localFailures.push(`${r.status()} ${r.url()}`);
    if (r.url().includes('arcgis.itajai')) report.gis.push({ url: r.url(), status: r.status() });
  });
  page.on('requestfailed', r => { if (r.url().startsWith(origin) && r.failure()?.errorText !== 'net::ERR_ABORTED') report.localFailures.push(r.url()); });
}
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); observe(page);
  const requests: string[] = []; page.on('request', r => requests.push(r.url()));
  await page.goto(url + '#/dashboard'); await page.getByRole('button', { name: 'Acionar Impacto JBS' }).waitFor();
  assert(!requests.some(u => /TerritoryMap|data\/historico\//.test(u)));
  await page.getByRole('button', { name: 'Acionar Impacto JBS' }).click(); await page.getByLabel('PIN', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  for (const name of ['Monitoramento', 'Mapa', 'Plano de Ação', 'Dashboard']) { await page.getByRole('link', { name, exact: true }).click(); await page.waitForTimeout(150); }
  report.checks.push('Navegação pelas quatro páginas; formulário Impacto acessível sem enviar comando; Dashboard sem chunks do mapa.');
  for (const route of ['dashboard', 'monitoramento/rios', 'monitoramento/chuva', 'monitoramento/barragens', 'monitoramento/previsao', 'mapa', 'plano-de-acao']) {
    await page.goto(url + '#/' + route); await page.reload(); await page.locator('main').waitFor();
    if (route === 'mapa') await page.getByLabel('Consultar estação').waitFor();
    else if (route === 'plano-de-acao') await page.getByRole('heading', { name: /^Plano de Ação/ }).waitFor();
    else if (route.startsWith('monitoramento')) await page.getByRole('heading', { name: 'Monitoramento', exact: true }).waitFor();
    else await page.getByRole('heading', { name: 'Exposição Territorial JBS' }).waitFor();
    assert.equal(await page.getByText('Página não encontrada', { exact: true }).count(), 0);
  }
  report.checks.push('Acesso direto e refresh em rotas hash, incluindo seções de Monitoramento.');
  await page.goto(url + '#/mapa'); await page.getByLabel('Consultar estação').waitFor(); await page.locator('.ol-viewport canvas').first().waitFor();
  assert.equal(await page.locator('#selecionar-dc option').count(), 12); assert.equal(await page.locator('#selecionar-bairro optgroup[label="Bairros"] option').count(), 35);
  await page.getByRole('checkbox', { name: 'Histórico de inundação', exact: true }).check(); await page.getByText(/1983: 1 feições/).waitFor();
  await page.getByLabel('Referência histórica').selectOption('historico-3'); await page.getByText(/2008: 1 feições/).waitFor();
  await page.getByRole('checkbox', { name: 'Vias com histórico de inundação', exact: true }).check(); await page.getByText(/555 feições/).waitFor();
  assert(!requests.some(u => /FeatureServer.*query/.test(u)));
  report.checks.push('OpenLayers, 35 bairros, 11 DC, histórico e vias locais sob subpath.');
  if (process.env.CHECK_GIS === 'true') {
    const pbf = page.waitForResponse(r => r.url().includes('arcgis.itajai') && r.url().endsWith('.pbf') && r.status() === 200, { timeout: 30000 });
    await page.getByRole('radio', { name: 'Cartográfica', exact: true }).click(); await pbf; await page.waitForTimeout(1500);
    assert(await page.getByRole('radio', { name: 'Cartográfica', exact: true }).isChecked());
    await page.locator('.ol-map').screenshot({ path: `${output}/cartografica.png` });
    const tile = page.waitForResponse(r => r.url().includes('Ortoimagem') && r.status() === 200, { timeout: 30000 });
    await page.getByRole('radio', { name: 'Aérea', exact: true }).click(); await tile; await page.waitForTimeout(1500);
    assert(await page.getByRole('radio', { name: 'Aérea', exact: true }).isChecked());
    await page.locator('.ol-map').screenshot({ path: `${output}/aerea.png` });
    report.checks.push('Cartográfica e Aérea reais renderizadas no build Pages, com estilos/sprites/PBF/tiles municipais.');
  }
  await page.close();
  for (const width of [390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    const p = await context.newPage(); observe(p); await p.route('https://arcgis.itajai.sc.gov.br/**', r => r.abort());
    for (const route of ['dashboard', 'monitoramento/chuva', 'plano-de-acao', 'mapa']) {
      await p.goto(url + '#/' + route); await p.waitForTimeout(500);
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow ${width}: ${route}`);
    }
    await p.getByLabel('Consultar estação').selectOption('DC01');
    const bar = await p.getByRole('complementary', { name: 'Barra operacional' }).innerText();
    for (const name of ['Aérea', 'Cartográfica']) { await p.getByRole('radio', { name, exact: true }).click(); await p.getByText(`Base ${name} indisponível.`, { exact: false }).waitFor({ timeout: 25000 }); }
    assert(await p.getByRole('radio', { name: 'Simplificada' }).isChecked());
    assert.equal(await p.getByLabel('Consultar estação').inputValue(), 'DC01');
    assert.equal(await p.getByRole('complementary', { name: 'Barra operacional' }).innerText(), bar);
    await p.getByRole('checkbox', { name: 'Histórico de inundação', exact: true }).check(); await p.getByText(/1983: 1 feições/).waitFor();
    await p.getByRole('checkbox', { name: 'Vias com histórico de inundação', exact: true }).check(); await p.getByText(/555 feições/).waitFor();
    await p.getByRole('button', { name: 'Ampliar mapa' }).focus(); await p.keyboard.press('Enter');
    await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${output}/mobile-${width}.png`, fullPage: true });
    report.checks.push(`Mobile ${width}: quatro páginas sem overflow; fallback duplo, camadas locais, seleção e alerta preservados.`);
    await context.close();
  }
  assert.deepEqual(report.localFailures, []); assert.deepEqual(report.errors, []);
  report.checks.push('Nenhum request local 404/falho nem exceção JavaScript; erros de rede GIS simulados registrados separadamente.');
  console.log(JSON.stringify(report.checks, null, 2));
} finally { await writeFile(`${output}/browser.json`, JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
