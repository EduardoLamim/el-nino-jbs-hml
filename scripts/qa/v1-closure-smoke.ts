import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.SMOKE_ORIGIN ?? 'http://127.0.0.1:4180';
const base = `${origin}/el-nino-jbs-hml/`;
const output = '.codex_work/v1-closure-visual';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const checks: unknown[] = [];
const errors: string[] = [];
try {
  const context = await browser.newContext();
  // tsx preserves function names with this helper in serialized evaluation callbacks.
  await context.addInitScript('window.__name = (fn) => fn');
  // Only display fixtures; no real Impacto, Edge, PIN or mutations in visual QA.
  await context.route('**/*.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, revisao: 0, ativo: false, impacto_id: null, tipo: null, acionado_em: null, atualizado_em: new Date().toISOString() }) }));
  await context.route('**/*arcgis*', route => route.abort());
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  const routes = ['dashboard', 'monitoramento/rios', 'monitoramento/chuva', 'monitoramento/previsao', 'monitoramento/barragens', 'plano-de-acao/geral', 'plano-de-acao/areas', 'plano-de-acao/ti', 'mapa'];
  for (const width of [1440, 768, 390, 320]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(base); await page.evaluate(t => localStorage.setItem('jbs-theme', t), theme);
    for (const route of routes) {
      await page.goto(`${base}#/${route}`); await page.reload();
      await page.getByRole('link', { name: 'Central de Planos', exact: true }).waitFor();
      await page.locator('.operational, .compact-operational').first().waitFor();
      if (route === 'plano-de-acao/ti') { await page.getByRole('tab', { name: 'Emergência', exact: true }).waitFor(); assert.equal(await page.locator('.area-action').count(), 7); await page.getByRole('tab', { name: 'Impacto JBS', exact: true }).click(); assert.equal(await page.locator('.area-action').count(), 6); }
      const metrics = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, theme: document.documentElement.dataset.theme }));
      assert(metrics.scroll <= width + 1, `Overflow ${route} ${width}/${theme}: ${metrics.scroll}`);
      assert.equal(metrics.theme, theme);
      const contrastFailures = await page.evaluate(() => {
        const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const luminance = (c: number[]) => c.reduce((sum, v, i) => { const n = v / 255; return sum + (n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i]!; }, 0);
        return [...document.querySelectorAll<HTMLElement>('main .meta, main dt, main th, main .level-badge, main .section-nav a')].filter(e => e.offsetWidth && e.offsetHeight).flatMap(e => {
          let node: HTMLElement | null = e; let bg = 'rgb(255,255,255)';
          while (node) { const color = getComputedStyle(node).backgroundColor; if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') { bg = color; break; } node = node.parentElement; }
          const fg = luminance(rgb(getComputedStyle(e).color)), back = luminance(rgb(bg));
          const ratio = (Math.max(fg, back) + .05) / (Math.min(fg, back) + .05);
          return ratio < 4.5 ? [{ text: e.textContent?.trim().slice(0, 50), ratio, fg: getComputedStyle(e).color, bg }] : [];
        });
      });
      assert.deepEqual(contrastFailures, [], `Contraste de texto ${route}/${theme}`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/${route.replaceAll('/', '-')}-${width}-${theme}.png`, fullPage: true });
      if (route === 'plano-de-acao/ti') await page.screenshot({ path: `${output}/ti-viewport-${width}-${theme}.png` });
      checks.push({ route, ...metrics });
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/checks.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log(`${checks.length} cenários de tema/rota/largura sem overflow ou erro JavaScript.`);
} finally { await browser.close(); }
