// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { randomUUID } from 'node:crypto';
import { ImpactoStore, type ImpactBackend } from '../src/services/impact';
import { ImpactoJbs } from '../src/components/ImpactoJbs';
const ctx = vi.hoisted(() => ({ store: null as ImpactoStore | null }));
vi.mock('../src/services/impact', async importOriginal => ({ ...await importOriginal<typeof import('../src/services/impact')>(), criarImpactoStore: () => ctx.store }));
afterEach(cleanup);
const id = randomUUID();
const ativo = { id: 1, revisao: 1, ativo: true, impacto_id: id, tipo: 'alagamento_terminal', acionado_em: '2026-10-02T11:00:00Z', atualizado_em: '2026-10-02T11:00:00Z' };
const inativo = { ...ativo, revisao: 2, ativo: false, impacto_id: null, tipo: null, acionado_em: null };
describe('Fluxo mínimo de Impacto JBS', () => {
  it('informa indisponibilidade sem assumir inativo', async () => {
    ctx.store = new ImpactoStore({ consultar: async () => { throw Error('offline'); }, executar: vi.fn(), assinar: () => () => {} });
    render(<ImpactoJbs />);
    expect(await screen.findByText(/Não foi possível verificar se existe/)).toBeTruthy();
    expect(screen.queryByText(/Nenhum Impacto JBS ativo/)).toBeNull();
  });
  it('erro ao encerrar preserva preto, limpa PIN, sucesso confirmado encerra', async () => {
    const b: ImpactBackend = { consultar: vi.fn().mockResolvedValue(ativo), executar: vi.fn().mockRejectedValue(new Error('PIN inválido')), assinar: () => () => {} };
    ctx.store = new ImpactoStore(b); render(<ImpactoJbs />); const user = userEvent.setup();
    expect(await screen.findByText('⚫ IMPACTO JBS')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Encerrar Impacto JBS' }));
    await user.type(screen.getByLabelText('Responsável'), 'Operador de teste');
    const pin = randomUUID(); await user.type(screen.getByLabelText('PIN'), pin);
    await user.click(screen.getByRole('button', { name: /^Confirmar$/ }));
    expect(await screen.findByText('PIN inválido')).toBeTruthy();
    expect(screen.getByText('⚫ IMPACTO JBS')).toBeTruthy();
    expect((screen.getByLabelText('PIN') as HTMLInputElement).value).toBe('');
    vi.mocked(b.executar).mockResolvedValue(inativo); await user.type(screen.getByLabelText('PIN'), pin);
    await user.click(screen.getByRole('button', { name: /^Confirmar$/ }));
    await waitFor(() => expect(screen.queryByText('⚫ IMPACTO JBS')).toBeNull());
    expect(screen.getByText(/Nenhum Impacto JBS ativo na última consulta/)).toBeTruthy();
  });
  it('acionamento aguarda confirmação, sem persistir PIN no navegador', async () => {
    const initial = { ...inativo, revisao: 0 };
    let resolve!: (v: unknown) => void;
    const b: ImpactBackend = { consultar: vi.fn().mockResolvedValue(initial), executar: vi.fn().mockImplementation(() => new Promise(r => { resolve = r; })), assinar: () => () => {} };
    ctx.store = new ImpactoStore(b); render(<ImpactoJbs />); const user = userEvent.setup();
    await screen.findByText(/Nenhum Impacto JBS ativo na última consulta/);
    await user.click(screen.getByRole('button', { name: 'Acionar Impacto JBS' }));
    await user.type(screen.getByLabelText('Responsável'), 'Teste'); await user.type(screen.getByLabelText('PIN'), randomUUID());
    await user.click(screen.getByRole('button', { name: /^Confirmar$/ }));
    expect(screen.queryByText('⚫ IMPACTO JBS')).toBeNull();
    resolve(ativo); expect(await screen.findByText('⚫ IMPACTO JBS')).toBeTruthy();
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
});

