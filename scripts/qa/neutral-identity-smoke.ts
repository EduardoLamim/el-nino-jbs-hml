import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const output='.codex_work/neutral-identity'; await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {})});
const checks:unknown[]=[];
try {
 const context=await browser.newContext();
 await context.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4189/')?r.continue():r.abort());
 const page=await context.newPage();const assets:string[]=[];page.on('request',r=>assets.push(r.url()));
 for(const width of [1920,1440,1366,1280,768,390,320]) for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:960});
  await page.goto('http://127.0.0.1:4189/el-nino-jbs-hml/');
  await page.evaluate(t=>localStorage.setItem('jbs-theme',t),theme);await page.reload();
  for(const route of ['dashboard','monitoramento/rios','mapa','plano-de-acao/geral','plano-de-acao/ti','plano-de-acao/operacoes']){
   await page.goto('http://127.0.0.1:4189/el-nino-jbs-hml/#/'+route);await page.waitForTimeout(150);
   assert(!/\bJBS\b/i.test(await page.locator('body').innerText()),`${width}/${theme}/${route}: marca visível`);
   assert.equal(await page.title(),'Monitoramento El Niño');
   assert.equal(await page.locator('.brand img').count(),0);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}/${route}`);
   checks.push({width,theme,route});
  }
  await page.locator('.app-header').screenshot({path:`${output}/header-${width}-${theme}.png`});
 }
 await page.setViewportSize({width:1440,height:960});
 await page.goto('http://127.0.0.1:4189/el-nino-jbs-hml/#/plano-de-acao/geral');
 await page.getByRole('button',{name:'Mapa de Decisões',exact:true}).click();
 const img=page.getByAltText('Mapa de Decisões do Terminal');await img.waitFor();
 await page.waitForFunction(()=>[...document.images].some(i=>i.src.includes('operacoes-posicionamento')&&i.complete&&i.naturalWidth===1337));
 await page.getByRole('button',{name:'Ampliar zoom',exact:true}).click();assert((await img.getAttribute('style'))?.includes('150%'));
 await page.getByRole('button',{name:'Ajustar à largura',exact:true}).click();
 await page.screenshot({path:`${output}/mapa-neutro.png`});
 assert(!assets.some(p=>p.includes('jbs-terminais-branco')||p.includes('operacoes-posicionamento-equipamentos.jpg')));
 await writeFile(`${output}/checks.json`,JSON.stringify({checks,legacyAssetsLoaded:false},null,2));
 console.log(`${checks.length} páginas verificadas; 14 capturas do cabeçalho; modal e zoom preservados.`);
} finally {await browser.close();}