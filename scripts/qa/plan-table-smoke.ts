import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.SMOKE_ORIGIN ?? 'http://127.0.0.1:4180';
const output = process.env.SMOKE_OUTPUT ?? '.codex_work/plan-table-local';
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
    await page.evaluate(t => localStorage.setItem('jbs-theme', t), theme);
    await page.goto(`${origin}/el-nino-jbs-hml/#/plano-de-acao/ti`); await page.reload();
    await page.locator('.plan-actions-table tbody tr').first().waitFor();
    assert.equal(await page.locator('.plan-actions-table tbody tr').count(), 7);
    assert.equal(await page.locator('.plan-metadata dt').allTextContents().then(a => a.includes('Área')), false);
    await page.getByRole('tab', { name: 'Impacto JBS', exact: true }).click();
    assert.equal(await page.locator('.plan-actions-table tbody tr').count(), 6);
    await page.getByRole('tab', { name: 'Emergência', exact: true }).click();
    for (const count of [7, 50]) {
      if (count === 50) await page.evaluate(() => {
        // Test-only DOM stress fixture. Never changes React content, JSON, or a server.
        const body = document.querySelector('.plan-actions-table tbody')!;
        const sample = body.firstElementChild!; body.replaceChildren();
        for (let i = 1; i <= 50; i++) {
          const row = sample.cloneNode(true) as HTMLElement;
          row.querySelector('th')!.textContent = String(i);
          row.querySelector('td:last-child')!.textContent = 'TESTE VISUAL — procedimento extenso.\n'.repeat(i === 1 ? 35 : 4);
          body.append(row);
        }
      });
      const region = page.getByRole('region', { name: 'Ações de Emergência' });
      await region.evaluate(e => { e.scrollTop = 0; e.scrollLeft = 0; });
      await region.scrollIntoViewIfNeeded();
      const metrics = await page.evaluate(() => {
        const box = document.querySelector('.plan-table-scroll')!;
        return { width: innerWidth, pageWidth: document.documentElement.scrollWidth, horizontal: box.scrollWidth > box.clientWidth, vertical: box.scrollHeight > box.clientHeight, theme: document.documentElement.dataset.theme };
      });
      assert(metrics.pageWidth <= width + 1); assert.equal(metrics.theme, theme);
      if (width <= 768) assert(metrics.horizontal);
      if (count === 50) assert(metrics.vertical);
      await page.screenshot({ path: `${output}/table-${count}-${width}-${theme}.png`, fullPage: true });
      await region.evaluate(e => { e.scrollTop = 120; e.scrollLeft = 220; });
      const sticky = await region.evaluate(e => {
        const box = e.getBoundingClientRect();
        const heading = e.querySelector('thead th')!.getBoundingClientRect();
        const order = e.querySelector('tbody th')!.getBoundingClientRect();
        return { head: Math.abs(heading.top - box.top), order: Math.abs(order.left - box.left) };
      });
      assert(sticky.head < 3 && sticky.order < 3, JSON.stringify(sticky));
      await page.screenshot({ path: `${output}/scrolled-${count}-${width}-${theme}.png`, fullPage: true });
      checks.push({ count, width, theme, metrics, sticky });
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/checks.json`, JSON.stringify(checks, null, 2));
  console.log(`${checks.length} cenários de tabela real/50 ações aprovados.`);
} finally { await browser.close(); }
