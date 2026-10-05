import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const origin=process.env.SMOKE_ORIGIN||'http://127.0.0.1:4175';
const base='/el-nino-jbs-hml/';
const output=process.env.PHASE10_OUTPUT||'.codex_work/fase10/smoke-local';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
const report={utc:new Date().toISOString(),origin,checks:[] as string[],errors:[] as string[],screenshots:[] as string[]};
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(origin+base+'#/mapa');await page.locator('.ol-viewport canvas').first().waitFor();
 const toggle=page.getByRole('checkbox',{name:'Nomes dos bairros',exact:true});assert(!await toggle.isChecked());
 await page.getByLabel('Consultar estação').selectOption('DC01');
 const level=await page.getByRole('complementary',{name:'Barra operacional'}).locator('strong').first().innerText();
 await page.waitForTimeout(200);const before=hash(await page.locator('.ol-map').screenshot());
 await toggle.focus();await page.keyboard.press('Space');assert(await toggle.isChecked());await page.waitForTimeout(200);
 const on=hash(await page.locator('.ol-map').screenshot());assert.notEqual(before,on,'Labels devem alterar o canvas real');
 await page.keyboard.press('Space');assert(!await toggle.isChecked());await page.waitForTimeout(200);
 assert.equal(hash(await page.locator('.ol-map').screenshot()),before,'Desligar deve restaurar canvas sem nomes');
 await toggle.check();assert.equal(await page.getByLabel('Consultar estação').inputValue(),'DC01');
 assert.equal(await page.locator('#selecionar-bairro optgroup[label="Bairros"] option').count(),35);
 assert.equal(await page.getByRole('complementary',{name:'Barra operacional'}).locator('strong').first().innerText(),level);
 report.checks.push('Canvas real muda ao ligar e restaura ao desligar; teclado, 35 bairros, seleção DC01 e nível preservados.');
 for(const name of process.env.CHECK_GIS==='true'?['Simplificada','Cartográfica','Aérea']:['Simplificada']){
  await page.getByRole('radio',{name,exact:true}).check();
  if(name!=='Simplificada')await page.waitForResponse(r=>r.url().includes('arcgis.itajai')&&r.status()===200&&(name==='Aérea'?r.url().includes('Ortoimagem'):r.url().endsWith('.pbf')),{timeout:30000});
  await page.waitForTimeout(700);assert(await toggle.isChecked());assert(await page.getByRole('radio',{name,exact:true}).isChecked());
  const file=`nomes-${name}.png`;await page.locator('.map-main').screenshot({path:`${output}/${file}`});report.screenshots.push(file);
 }
 await page.getByRole('radio',{name:'Simplificada',exact:true}).check();
 await page.getByRole('button',{name:'Ampliar mapa',exact:true}).click();await page.getByRole('button',{name:'Ampliar mapa',exact:true}).click();await page.waitForTimeout(200);
 await page.locator('.ol-map').screenshot({path:`${output}/nomes-proximo.png`});report.screenshots.push('nomes-proximo.png');
 await page.getByRole('checkbox',{name:'Histórico de inundação',exact:true}).check();await page.getByText(/1983: 1 feições/).waitFor();
 await page.getByRole('checkbox',{name:'Vias com histórico de inundação',exact:true}).check();await page.getByText(/555 feições/).waitFor();assert(await toggle.isChecked());
 await page.route('https://arcgis.itajai.sc.gov.br/**',r=>r.abort());
 for(const name of ['Aérea','Cartográfica']){await page.getByRole('radio',{name,exact:true}).check();await page.getByText(`Base ${name} indisponível.`,{exact:false}).waitFor({timeout:25000});assert(await toggle.isChecked());}
 report.checks.push('Nomes nas bases testadas; histórico/vias e fallback duplo preservados com nomes ativos.');
 await page.close();
 for(const width of [768,390,320]){
  const p=await browser.newPage({viewport:{width,height:960},hasTouch:true});
  await p.goto(origin+base+'#/mapa');const t=p.getByRole('checkbox',{name:'Nomes dos bairros'});await t.check();
  await p.getByLabel('Consultar bairro ou localidade').selectOption({label:'São Vicente · 67 residentes'});await p.getByRole('article',{name:'Detalhe territorial São Vicente'}).waitFor();
  await p.getByRole('button',{name:'Ampliar mapa'}).click();await p.getByRole('region',{name:'Mapa interativo de bairros e estações'}).focus();await p.keyboard.press('ArrowRight');
  assert(await t.isChecked());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await t.focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');
  assert(await t.evaluate(el=>el===document.activeElement&&getComputedStyle(el).outlineStyle!=='none'));
  const file=`nomes-${width}.png`;await p.screenshot({path:`${output}/${file}`,fullPage:true});report.screenshots.push(file);
  await p.close();report.checks.push(`Nomes, seleção, pan/zoom, foco e ausência de overflow em ${width}px.`);
 }
 // Apenas respostas do cliente: nenhuma operação real é enviada ao Supabase.
 const fixture=JSON.parse(await readFile('tests/fixtures/status-operacional.json','utf8'));
 const states=await browser.newPage({viewport:{width:1440,height:960}});
 await states.route('**/data/status.json',r=>r.fulfill({json:fixture}));
 await states.route('https://ufeahglxwygvlugfsopi.supabase.co/rest/v1/impacto_jbs_publico*',r=>r.fulfill({json:{id:1,revisao:1,ativo:true,impacto_id:'11111111-1111-4111-8111-111111111111',tipo:'alagamento_terminal',acionado_em:'2026-10-04T04:00:00Z',atualizado_em:'2026-10-04T04:00:00Z'}}));
 await states.goto(origin+base+'#/dashboard');await states.getByRole('button',{name:'Encerrar Impacto JBS'}).waitFor();
 assert(await states.getByText('Condição ambiental:',{exact:false}).isVisible());
 await states.screenshot({path:`${output}/impacto-fixture.png`,fullPage:true});report.screenshots.push('impacto-fixture.png');
 await states.getByRole('button',{name:'Encerrar Impacto JBS'}).click();await states.getByLabel('PIN',{exact:true}).waitFor();await states.getByRole('button',{name:'Cancelar',exact:true}).click();
 await states.close();report.checks.push('Apresentação de Impacto preto e formulário testados por resposta local interceptada, sem escrita remota.');
 assert.deepEqual(report.errors,[]);
}finally{await writeFile(`${output}/checks.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report.checks,null,2));
