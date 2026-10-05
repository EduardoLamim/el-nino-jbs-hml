// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {parseStatus,parseTerritorio,nivelPorFlag} from '../src/domain/contracts';
import {Dashboard,SituacaoOficial} from '../src/pages/Dashboard';
import {Rios,Chuva,Barragens} from '../src/pages/Monitoramento';
import {RiverChart} from '../src/components/RiverChart';
import {WeatherIcon,iconesCondicao} from '../src/components/WeatherIcon';
import {PrevisaoDias,ResumoChuva} from '../src/components/Weather';
import {Gatilhos,QualidadeDados} from '../src/components/Operational';
import {ActionPlan} from '../src/pages/ActionPlan';
const fixture=()=>parseStatus(JSON.parse(readFileSync('tests/fixtures/status-operacional.json','utf8')));
const territorio=parseTerritorio(JSON.parse(readFileSync('public/data/territorio.json','utf8')));
afterEach(cleanup);
it('diagnóstico técnico não aparece nos cards; qualidade e agregados permanecem nos dados',()=>{
 const s=fixture(),before=JSON.stringify(s);const {container}=render(<><Dashboard status={s} territorio={territorio}/><Rios status={s}/><Chuva status={s}/><Barragens status={s}/><QualidadeDados status={s}/></>);
 expect(container.textContent).not.toMatch(/Parcialmente degradado|Qualidade não informada|Qualidade:|Ver informações de qualidade|Dados degradados|Contagem entre estações/);
 expect(JSON.stringify(s)).toBe(before);expect(screen.getByText('292')).toBeTruthy();expect(screen.getByText('88')).toBeTruthy();
});
it.each(Object.keys(nivelPorFlag) as Array<keyof typeof nivelPorFlag>)('Defesa Civil %s usa flag normalizada, logo e horário oficial',flag=>{
 const s=fixture();s.situacao_oficial={flag,conteudo:'Texto livre: emergência',qualidade:null,atualizado_em:'2026-10-04T13:45:52-03:00'};
 s.atualizado_em='2026-10-05T03:20:00Z';render(<SituacaoOficial status={s}/>);
 expect(screen.getByText(flag,{selector:'.official-flag'}).className).toContain('level-'+nivelPorFlag[flag]);
 expect(screen.getByAltText('Defesa Civil')).toBeTruthy();expect(screen.getByText(/Última atualização da Defesa Civil:.*13:45/)).toBeTruthy();
 expect(screen.queryByText(/00:20/)).toBeNull();
});
it('ausência real de leitura não se converte em Normalidade',()=>{const s=fixture();delete s.rios.DC01;s.motor!.rios.DC01!.nivel=null;render(<Rios status={s}/>);const c=within(screen.getByRole('article',{name:'Estação DC01'}));expect(c.getByText('Dado indisponível.')).toBeTruthy();expect(c.queryByText('Normalidade')).toBeNull();});
it.each(['normalidade','atencao','alerta','emergencia',null] as const)('borda DC consome exclusivamente estado %s',nivel=>{const s=fixture();s.motor!.rios.DC01!.nivel=nivel;s.rios.DC01!.nivel_m=999;render(<Rios status={s}/>);expect(screen.getByRole('article',{name:'Estação DC01'}).className).toContain('level-'+(nivel??'desconhecido'));expect(screen.queryByText(/Localização:/)).toBeNull();});
it('tabela da série é decrescente, sem qualidade e sem mutar a série',()=>{
 const s=fixture().rios.DC01!;s.serie_12h=[{medido_em:'2026-10-05T00:00:00Z',nivel_m:1,qualidade:null},{medido_em:'2026-10-05T00:10:00Z',nivel_m:2,qualidade:null}];const before=JSON.stringify(s);
 render(<RiverChart estacao={s}/>);const table=screen.getByRole('region',{name:'Valores da série DC01'});expect(within(table).queryByText('Qualidade')).toBeNull();expect(table.querySelector('tbody tr')!.textContent).toContain('21:10');expect(JSON.stringify(s)).toBe(before);
});
it('chuva usa SVG, mantém N/M e remove metodologia',()=>{const {container}=render(<ResumoChuva status={fixture()}/>);expect(container.querySelector('[data-weather-icon="rain"]')).toBeTruthy();expect(screen.getByText(/Estações com chuva na última 1h/)).toBeTruthy();expect(screen.queryByText(/Contagem entre estações/)).toBeNull();});
it.each(Object.keys(iconesCondicao))('previsão mapeia condição oficial %s com texto nas duas apresentações',condition=>{
 const p=fixture().previsao;p.dias[0]!.condicao=condition;for(const resumo of [true,false]){const {container,unmount}=render(<PrevisaoDias previsao={p} resumo={resumo}/>);expect(container.querySelector('[data-weather-icon]')!.getAttribute('data-weather-icon')).toBe(iconesCondicao[condition as keyof typeof iconesCondicao]);expect(screen.getAllByText(condition).length).toBeGreaterThan(0);unmount();}
});
it('condição desconhecida não recebe previsão inventada',()=>{const {container}=render(<WeatherIcon condition="Novo código ainda não documentado"/>);expect(container.querySelector('svg')!.dataset.weatherIcon).toBe('unknown');});
it('explicação sem gatilho é direta e Plano não repete título',()=>{const s=fixture();s.nivel_jbs={nivel:'normalidade',gatilhos:[],desde:null};const {unmount}=render(<Gatilhos status={s}/>);expect(screen.getByText('Nenhum indicador monitorado exige elevação do nível neste momento.')).toBeTruthy();unmount();render(<ActionPlan status={s} territorio={territorio} impacto={{dado:null,qualidade:'desconhecido',confirmado_em:null,realtime:'reconectando'}}/>);expect(screen.getAllByRole('heading',{name:'Por que estamos neste nível?'})).toHaveLength(1);expect(screen.queryByText('O que sustenta a condição ambiental')).toBeNull();});
