import { describe, expect, it } from 'vitest';
import { adaptiveCard, type Event } from '../supabase/functions/teams-notifications/handler';
const base: Event = { event_key: 'internal-correlation', kind: 'level', is_test: true, body: { before: 'normalidade', after: 'atencao', occurred_at: '2026-10-14T01:05:00Z' } };
const card = (event = base) => adaptiveCard(event).attachments[0]!.content;
describe('Teams renderer — apresentação', () => {
  it.each([
    ['normalidade','atencao','Atenção','Warning'], ['normalidade','alerta','Alerta','Warning'],
    ['atencao','emergencia','Emergência','Attention'], ['emergencia','alerta','Alerta','Warning'],
    ['alerta','normalidade','Normalidade','Good'],
  ])('%s → %s tem destaque semântico', (before,after,title,color) => {
    const value=JSON.stringify(card({...base,body:{...base.body,before,after}}));
    expect(value).toContain(`"text":"${title}"`); expect(value).toContain(`"color":"${color}"`);
    expect(value).toContain('→'); expect(value).toContain('[HML — TESTE]'); expect(value).toContain('SIMULAÇÃO');
  });
  it.each([['impact_open','Attention','confirmado'],['impact_close','Good','encerrado']] as const)('ação manual %s', (kind,color,label) => {
    const value=JSON.stringify(card({...base,kind})); expect(value).toContain(`Impacto JBS ${label}`);
    expect(value).toContain(`"color":"${color}"`); expect(value).toContain('manual autorizad');
  });
  it('formata data local, não expõe auditoria e não altera evento', () => {
    const previous=JSON.stringify(base), value=JSON.stringify(card());
    expect(value).toContain('13/10/2026 às 22:05');
    for(const hidden of ['internal-correlation','America/Sao_Paulo','Horário do cenário','"Ambiente"','"Evento"']) expect(value).not.toContain(hidden);
    expect(JSON.stringify(base)).toBe(previous);
    expect(card().actions[0]!.title).toBe('Abrir painel');
  });
  it('não inventa data ou justificativa sintética', () => {
    const value=JSON.stringify(card({...base,body:{...base.body,occurred_at:'invalid',reasons:['Não mostrar como causa real']}}));
    expect(value).toContain('Não informado'); expect(value).not.toContain('Não mostrar como causa real');
  });
  it('preserva justificativa registrada e ressalva de publicação', () => {
    const value=JSON.stringify(card({...base,is_test:false,body:{...base.body,reasons:['Justificativa registrada pelo motor']}}));
    expect(value).toContain('Justificativa registrada pelo motor'); expect(value).toContain('Publicação correspondente no painel não confirmada');
  });
  it('usa apenas elementos nativos 1.2 e texto com quebra sem largura fixa', () => {
    const value=card(); expect(value.version).toBe('1.2');
    const visit=(node: unknown) => { if(!node || typeof node!=='object') return;
      const n=node as Record<string,unknown>;
      if(n.type==='TextBlock') expect(n.wrap).toBe(true);
      if(n.type) expect(['AdaptiveCard','TextBlock','Container','Action.OpenUrl']).toContain(n.type);
      expect(n).not.toHaveProperty('width'); Object.values(n).forEach(v=>Array.isArray(v)?v.forEach(visit):visit(v));
    }; visit(value);
  });
  it.each([
    ['normalidade','atencao','warning','ALTERAÇÃO DE NÍVEL','Atenção'],
    ['normalidade','alerta','warning','ALTERAÇÃO DE NÍVEL','Alerta'],
    ['alerta','emergencia','attention','ALTERAÇÃO DE NÍVEL','Emergência'],
    ['emergencia','atencao','warning','ALTERAÇÃO DE NÍVEL · Redução','Atenção'],
    ['emergencia','normalidade','good','ALTERAÇÃO DE NÍVEL · Normalização','Normalidade'],
  ])('bloco semântico com nível de destino %s → %s', (before,after,style,category,title) => {
    const value=card({...base,body:{before,after,occurred_at:'2026-10-14T14:09:00Z'}});
    const block=value.body.find(b=>b.type==='Container');
    expect(block).toMatchObject({style,items:[
      {text:category},{text:title,size:'Large'},expect.objectContaining({text:expect.stringContaining('→')}),{text:'Data e hora: 14/10/2026 às 11:09'},
    ]});
    const decoded=Buffer.from(JSON.stringify(value),'utf8').toString('utf8');
    expect(decoded).toContain(category);expect(decoded).toContain(title);
    expect(decoded).not.toMatch(/\uFFFD|Ã[§£ª©]|Â[· ]|â€|Aten\?\?o/);
  });
  it.each(['level','impact_open','impact_close'] as const)('rótulos sintéticos nunca aparecem no card operacional %s',kind=>{
    const value=JSON.stringify(card({...base,kind,is_test:false}));
    for(const text of ['[HML — TESTE]','SIMULAÇÃO','O painel apresenta os dados reais.','"Ambiente"','"Evento"']) expect(value).not.toContain(text);
    expect(value).toContain('Abrir painel');
  });
  it.each([['impact_open','attention'],['impact_close','good']] as const)('Impacto independente no bloco %s', (kind,style)=>{
    const value=card({...base,kind});
    expect(value.body.find(b=>b.type==='Container')).toMatchObject({style});
    expect(JSON.stringify(value)).toContain('CONDIÇÃO DO TERMINAL');
    expect(JSON.stringify(value)).not.toContain('ALTERAÇÃO DE NÍVEL');
  });
});
