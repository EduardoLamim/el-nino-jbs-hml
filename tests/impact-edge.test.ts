import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { criarHandler, tipos, type Backend } from '../supabase/functions/impacto-jbs/handler';
import { tipoImpactoSchema } from '../src/domain/impact';
const pin = randomUUID(); const key = 'chave-publica-de-teste';
const body = { action: 'ativar', pin, tipo: 'alagamento_terminal', responsavel: 'Teste' };
const config = { pin, apikey: key, origin: 'https://hml.example.test' };
function setup() {
  const backend: Backend = { tentar: vi.fn().mockResolvedValue(true), escrever: vi.fn().mockResolvedValue({ id: 1, revisao: 1, ativo: true,
    impacto_id: randomUUID(), tipo: 'alagamento_terminal', acionado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(), interno: 'privado' }) };
  const handler = criarHandler(config, backend);
  return { backend, call: (payload: unknown) => handler(new Request('https://edge.test', { method: 'POST',
    headers: { apikey: key, origin: config.origin, 'content-type': 'application/json' }, body: JSON.stringify(payload) })) };
}
describe('Edge — fronteira de autorização', () => {
  it('mantém os tipos permitidos iguais aos do domínio', () => {
    expect([...tipos]).toEqual(tipoImpactoSchema.options);
  });
  it('valida PIN server-side e não envia PIN à persistência nem ao retorno', async () => {
    const { call, backend } = setup(); const r = await call(body); expect(r.status).toBe(200);
    const text = await r.text(); expect(text).not.toContain(pin); expect(text).not.toContain('interno');
    expect(JSON.stringify(vi.mocked(backend.escrever).mock.calls)).not.toContain(pin);
    expect(backend.tentar).toHaveBeenCalledOnce();
  });
  it('nega PIN errado sem escrever e sem ecoar payload', async () => {
    const { call, backend } = setup(); const r = await call({ ...body, pin: 'incorreto' });
    expect(r.status).toBe(403); expect(backend.escrever).not.toHaveBeenCalled(); expect(await r.text()).toBe('{"erro":"pin_invalido"}');
  });
  it('não persiste PIN copiado em observação ou responsável', async () => {
    const { call, backend } = setup();
    expect((await call({ ...body, observacao: `Anotação ${pin}` })).status).toBe(400);
    expect((await call({ ...body, responsavel: pin })).status).toBe(400);
    expect(backend.escrever).not.toHaveBeenCalled();
  });
  it('nega tipos, responsáveis, datas e chaves extras inválidos', async () => {
    const { call, backend } = setup();
    for (const p of [{ ...body, tipo: 'rio_alto' }, { ...body, responsavel: ' ' }, { ...body, acionado_em: 'ontem' },
      { ...body, observacao: 'a'.repeat(2001) }, { ...body, action: 'deletar' }]) expect((await call(p)).status).toBe(400);
    expect(backend.escrever).not.toHaveBeenCalled();
  });
  it('encerramento exige ID e preserva responsáveis somente no backend', async () => {
    const { call, backend } = setup(); const id = randomUUID();
    expect((await call({ action: 'encerrar', pin, responsavel: 'Teste' })).status).toBe(400);
    expect((await call({ action: 'encerrar', pin, responsavel: 'Teste', impacto_id: id })).status).toBe(200);
    expect(backend.escrever).toHaveBeenCalledWith({ action: 'encerrar', tipo: null, responsavel: 'Teste', observacao: null, impacto_id: id });
  });
  it('limita tentativas e falha fechada quando backend indisponível', async () => {
    const { call, backend } = setup(); vi.mocked(backend.tentar).mockResolvedValue(false);
    expect((await call(body)).status).toBe(429); expect(backend.escrever).not.toHaveBeenCalled();
    vi.mocked(backend.tentar).mockRejectedValue(new Error('segredo interno'));
    const r = await call(body); expect(r.status).toBe(503); expect(await r.text()).not.toContain('segredo');
  });
  it('conflito retorna erro controlado; erro bruto não vaza', async () => {
    const { call, backend } = setup(); vi.mocked(backend.escrever).mockRejectedValue({ code: '23505', message: pin });
    const r = await call(body); expect(r.status).toBe(409); expect(await r.text()).not.toContain(pin);
  });
});
