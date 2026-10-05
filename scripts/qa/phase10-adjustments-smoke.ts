import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin=process.env.SMOKE_ORIGIN||'http://127.0.0.1:4175';
const output=process.env.ADJUSTMENTS_OUTPUT||'docs/fase-10-visual/ajustes-local';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
const report={utc:new Date().toISOString(),origin,checks:[] as string[],errors:[] as string[]};
try{for(const width of [1440,768,390,320]){
 const p=await browser.newPage({viewport:{width,height:960},hasTouch:width<=768});p.on('pageerror',e=>report.errors.push(e.message));
 for(const route of ['dashboard','monitoramento/rios','monitoramento/chuva','monitoramento/previsao','monitoramento/barragens','mapa','plano-de-acao']){
  await p.goto(origin+'/el-nino-jbs-hml/#/'+route);await p.getByRole('heading',{name:route==='dashboard'?'Exposição Territorial JBS':route==='mapa'?'Mapa':route==='plano-de-acao'?/^Plano de Ação/:'Monitoramento',exact:true}).waitFor();
  if(route==='dashboard'){await p.getByText('Nenhum impacto físico confirmado.',{exact:true}).waitFor();assert(await p.getByAltText('Defesa Civil',{exact:true}).isVisible());assert(await p.getByText('Última atualização da Defesa Civil:',{exact:false}).isVisible());for(const [name,selector] of [['defesa-civil','.official'],['chuva','.rain-card'],['previsao','.forecast-card'],['territorio','.exposure']] as const)await p.locator(selector).screenshot({path:`${output}/${name}-${width}.png`});}
  const visible=await p.locator('body').innerText();assert(!/Parcialmente degradado|Qualidade não informada|Ver informações de qualidade|O que sustenta a condição ambiental/.test(visible));
  if(route==='monitoramento/rios'){
   await p.getByText('Detalhar DC01',{exact:true}).click();await p.getByText('Consultar valores da série',{exact:true}).first().click();const station=p.getByRole('article',{name:'Estação DC01'});assert(!/Localização:|Qualidade/.test(await station.innerText()));const rows=await station.locator('tbody tr td:first-child').allTextContents();assert(rows.length>1);await station.screenshot({path:`${output}/rio-serie-${width}.png`});
  }
  if(route==='mapa'){
   await p.locator('.ol-viewport canvas').first().waitFor();assert.equal(await p.getByRole('button',{name:/Mover mapa/}).count(),0);assert.equal(await p.locator('a[href*="data/"]').count(),0);
   const map=p.getByRole('region',{name:'Mapa interativo de bairros e estações'});await map.focus();await p.waitForTimeout(250);const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');const a=hash(await map.screenshot());await p.keyboard.press('ArrowRight');await p.waitForTimeout(300);assert.notEqual(hash(await map.screenshot()),a,'Seta do teclado deve mover mapa');await p.getByRole('button',{name:'Enquadrar bairros',exact:true}).click();
   await p.getByRole('checkbox',{name:'Nomes dos bairros',exact:true}).check();
   await p.getByRole('checkbox',{name:'Histórico de inundação',exact:true}).check();await p.getByText(/1983: 1 feições/).waitFor();await p.getByRole('checkbox',{name:'Vias com histórico de inundação',exact:true}).check();await p.getByText(/555 feições/).waitFor();
   assert.equal(await p.getByRole('link',{name:'Proveniência'}).count(),0);await p.getByRole('group',{name:'Base do mapa',exact:true}).screenshot({path:`${output}/base-${width}.png`});
  }
  if(route==='plano-de-acao'){assert.equal(await p.getByRole('heading',{name:'Por que estamos neste nível?',exact:true}).count(),1);await p.getByLabel('Consultar orientações de outros níveis').selectOption('impacto');assert(await p.getByText(/Esta consulta não indica uma ocorrência ativa/).isVisible());}
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${route} ${width}`);
  await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(200);
  await p.screenshot({path:`${output}/${route.replace('/','-')}-${width}.png`,fullPage:true});report.checks.push(`${route} ${width}px: apresentação, disponibilidade e ausência de overflow verificadas.`);
 }await p.close();
}assert.deepEqual(report.errors,[]);}finally{await writeFile(`${output}/checks.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(`${report.checks.length} cenários aprovados.`);
