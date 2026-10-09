import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.SMOKE_ORIGIN ?? 'http://127.0.0.1:4180';
const output = process.env.SMOKE_OUTPUT ?? '.codex_work/header-audio-local';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const checks: unknown[] = [];
try {
  const context = await browser.newContext();
  await context.addInitScript('window.__name = (fn) => fn');
  await context.route('**/*.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, revisao: 0, ativo: false, impacto_id: null, tipo: null, acionado_em: null, atualizado_em: new Date().toISOString() }) }));
  const page = await context.newPage(); const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const width of [1440, 768, 390, 320]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(`${origin}/el-nino-jbs-hml/`);
    await page.evaluate(t => localStorage.setItem('jbs-theme', t), theme); await page.reload();
    for (const enabled of [false, true]) {
      if (enabled) await page.getByRole('button', { name: 'Habilitar som', exact: true }).click();
      const button = page.getByRole('button', { name: enabled ? 'Desabilitar som' : 'Habilitar som', exact: true });
      await button.waitFor();
      assert.equal(await button.getAttribute('aria-pressed'), String(enabled));
      const sound = (await button.boundingBox())!;
      const themeBox = (await page.locator('.theme-toggle').boundingBox())!;
      assert(Math.abs(sound.y + sound.height / 2 - themeBox.y - themeBox.height / 2) < 2, `Alignment ${width} ${theme} ${enabled}`);
      assert.equal(sound.height, themeBox.height);
      const metrics = await page.evaluate(() => {
        const status = document.querySelector('.header-audio [role="status"]')!;
        const rect = status.getBoundingClientRect();
        return { pageWidth: document.documentElement.scrollWidth, width: innerWidth, statusWidth: rect.width, statusHeight: rect.height, clip: getComputedStyle(status).clip, visibleHeader: (document.querySelector('header') as HTMLElement).innerText };
      });
      assert(metrics.pageWidth <= width + 1);
      assert(metrics.statusWidth <= 1 && metrics.statusHeight <= 1 && metrics.clip !== 'auto');
      await page.locator('header').screenshot({ path: `${output}/header-${width}-${theme}-${enabled ? 'on' : 'off'}.png` });
      checks.push({ width, theme, enabled, sound, themeBox, metrics });
    }
    await page.getByRole('link', { name: 'Monitoramento', exact: true }).click();
    await page.getByRole('button', { name: 'Desabilitar som', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await page.getByRole('button', { name: 'Desabilitar som', exact: true }).click();
    await page.getByRole('button', { name: 'Habilitar som', exact: true }).waitFor();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/checks.json`, JSON.stringify(checks, null, 2));
  console.log(`${checks.length} cenários de header aprovados; navegação e alternância de áudio preservadas.`);
} finally { await browser.close(); }
