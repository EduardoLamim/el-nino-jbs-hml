import { describe, expect, it, vi } from 'vitest';
import { adaptiveCard, createHandler, drainOne, validWebhook, type Claim, type Event } from '../supabase/functions/teams-notifications/handler';
const event: Event = { event_key:'hml:test:test-001',kind:'level',is_test:true,body:{before:'normalidade',after:'alerta',occurred_at:'2026-10-13T15:00:00Z'} };
const claim: Claim = { id:'id',lease:'lease',attempt:1,mode:'synthetic_live',event };
function setup(c: Claim | null = claim) {
  const rpc = vi.fn(async (_scope: string, action: string, payload?: Record<string, unknown>) => action === 'claim' ? c : action === 'freeze' ? payload!.payload : {});
  return {rpc, fetcher:vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:202}))};
}
const webhook = 'https://example.logic.azure.com/workflows/test?sig=DO_NOT_LOG';
describe('Teams — cartão e transporte mock', () => {
  for (const before of ['normalidade','atencao','alerta','emergencia']) for (const after of ['normalidade','atencao','alerta','emergencia']) if (before!==after)
    it(`renderiza ${before} → ${after} sem executar motor`, () => {
      const payload = adaptiveCard({...event,body:{...event.body,before,after}});
      expect(payload.type).toBe('message'); expect(payload.attachments).toHaveLength(1);
      expect(payload.attachments[0]!.content.type).toBe('AdaptiveCard');
      expect(JSON.stringify(payload)).toContain('[HML — TESTE]'); expect(JSON.stringify(payload)).toContain('SIMULAÇÃO');
      expect(JSON.stringify(payload)).toContain('13/10/2026 às 12:00');
    });
  it.each(['impact_open','impact_close'] as const)('identifica ação manual sintética %s', kind => {
    const payload = JSON.stringify(adaptiveCard({...event,kind})); expect(payload).toContain('manual autorizad'); expect(payload).toContain('SIMULAÇÃO');
  });
  it('não afirma publicação, horário desconhecido ou situação atual', () => {
    const payload = JSON.stringify(adaptiveCard({...event,is_test:false,body:{before:'alerta',after:'atencao',detected_at:'2026-10-13T15:00:00Z',reasons:['Razão registrada']}}));
    expect(payload).toContain('Publicação correspondente no painel não confirmada'); expect(payload).toContain('transição sem horário determinado'); expect(payload).toContain('Razão registrada');
  });
  it('aceitação não é confirmação; não envia Authorization ao gatilho Anyone', async () => {
    const {rpc,fetcher}=setup(); expect(await drainOne(rpc,{webhook,liveEnabled:true,fetcher})).toEqual({status:'accepted',http_status:202});
    expect(fetcher.mock.calls[0]![1]!.headers).toEqual({'Content-Type':'application/json'});
    expect(rpc.mock.calls.map(c=>c[1])).toEqual(['claim','freeze','sending','finish']);
  });
  it.each([400,401,403,404,500,503,429])('classifica HTTP %s sem registrar resposta', async code => {
    const {rpc,fetcher}=setup(); fetcher.mockResolvedValue(new Response('sensitive remote body',{status:code,headers:{'Retry-After':'3600'}}));
    const result = await drainOne(rpc,{webhook,liveEnabled:true,fetcher});
    expect(result.status).toBe(code===429?'retry':code>=500?'uncertain':'blocked'); expect(JSON.stringify(rpc.mock.calls)).not.toContain('sensitive');
  });
  it('timeout fica incerto e não repete POST', async () => {
    const {rpc,fetcher}=setup(); fetcher.mockRejectedValue(new Error('SECRET URL'));
    expect(await drainOne(rpc,{webhook,liveEnabled:true,fetcher})).toEqual({status:'uncertain'}); expect(fetcher).toHaveBeenCalledTimes(1); expect(JSON.stringify(rpc.mock.calls)).not.toContain('SECRET');
  });
  it('mock, desabilitação, evento real e URL externa não enviam', async () => {
    for (const options of [{c:{...claim,mode:'mock' as const},liveEnabled:true,url:webhook},{c:claim,liveEnabled:false,url:webhook},
      {c:{...claim,event:{...event,is_test:false}},liveEnabled:true,url:webhook},{c:claim,liveEnabled:true,url:'https://evil.test/'}]) {
      const {rpc,fetcher}=setup(options.c); await drainOne(rpc,{webhook:options.url,liveEnabled:options.liveEnabled,fetcher}); expect(fetcher).not.toHaveBeenCalled();
    }
    expect(validWebhook('https://example.logic.azure.com.evil.test/')).toBe(false);
    expect(validWebhook('http://example.logic.azure.com/')).toBe(false);
  });
  it('credencial wake não autoriza configurar/testar/replay; falhas não vazam detalhes', async () => {
    const rpc=vi.fn().mockRejectedValue(new Error('PRIVATE'));
    const handler=createHandler({rpc,wakeToken:'w'.repeat(64),adminToken:'a'.repeat(64),liveEnabled:false});
    const req=(action:string,token:string)=>new Request('https://local/',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({action})});
    expect((await handler(req('configure','w'.repeat(64)))).status).toBe(403);
    expect((await handler(req('checkpoint','bad'))).status).toBe(401);
    const failure=await handler(req('checkpoint','w'.repeat(64))); expect(failure.status).toBe(503); expect(await failure.text()).not.toContain('PRIVATE');
  });
  it('health autentica os três escopos sem consumir fila nem expor URL e é exclusivo do admin',async()=>{
    const rpc=vi.fn(async(scope:string)=>scope==='worker'?{ready:true}:scope==='admin'?{mode:'disabled'}:{commit:null});
    const handler=createHandler({rpc,wakeToken:'w'.repeat(64),adminToken:'a'.repeat(64),webhook,liveEnabled:false});
    const req=(token:string)=>new Request('https://local/',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({action:'health'})});
    expect((await handler(req('w'.repeat(64)))).status).toBe(403);
    const response=await handler(req('a'.repeat(64)));
    expect(await response.json()).toEqual({ready:true,mode:'disabled',live_enabled:false,webhook_valid:true,operational_enabled:false});
    expect(rpc.mock.calls).toEqual([['ingest','checkpoint'],['worker','probe_worker'],['admin','report']]);
  });
});

describe('Teams — transporte operacional com destino mock', () => {
  it('rejeita sintético no modo operacional mesmo com secret sintético habilitado', async () => {
    const {rpc,fetcher}=setup({...claim,mode:'operational'});
    expect(await drainOne(rpc,{webhook,liveEnabled:true,fetcher})).toEqual({status:'blocked'});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('não envia quando a autorização transacional sending falha', async () => {
    const {rpc,fetcher}=setup({...claim,mode:'operational',event:{...event,is_test:false}});
    const base=rpc.getMockImplementation()!;
    rpc.mockImplementation(async(scope,action,payload)=>{
      if(action==='sending') throw new Error('Disabled during lease');
      return base(scope,action,payload);
    });
    await expect(drainOne(rpc,{webhook,liveEnabled:false,fetcher})).rejects.toThrow('Disabled');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([202,429,503])('real mantém classificação HTTP %s independente do secret de testes', async status => {
    const {rpc,fetcher}=setup({...claim,mode:'operational',event:{...event,is_test:false}});
    fetcher.mockResolvedValue(new Response(null,{status}));
    expect((await drainOne(rpc,{webhook,liveEnabled:false,fetcher})).status).toBe(status===202?'accepted':status===429?'retry':'uncertain');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]![1]!.body)).not.toContain('SIMULAÇÃO');
  });
});

