// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ContactCard, EmergencyContacts } from '../src/components/EmergencyContacts';
import { contactRoute, externalContacts, internalContacts, phoneDigits, terminalOrigin } from '../src/content/emergency-contacts';
import { areas } from '../src/content/area-plans';
import { planos } from '../src/content/action-plans';

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event('close')); } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('abre, alterna categorias por teclado, fecha e devolve foco', () => {
  render(<EmergencyContacts />);
  const trigger = screen.getByRole('button', { name: 'Contatos de Emergência' });
  fireEvent.click(trigger);
  expect(screen.getByRole('dialog').getAttribute('open')).not.toBeNull();
  expect(screen.getAllByRole('article')).toHaveLength(5);
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Órgãos externos' }), { key: 'ArrowRight' });
  expect(screen.getByText('Contatos internos ainda não cadastrados.')).toBeTruthy();
  expect(screen.queryAllByRole('article')).toHaveLength(0);
  expect(screen.getByRole('tab', { name: 'Contatos internos' }).getAttribute('aria-selected')).toBe('true');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Contatos internos' }), { key: 'Home' });
  expect(screen.getAllByRole('article')).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar contatos de emergência' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
it('copia o telefone e comunica sucesso sem chamar o serviço', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  render(<ContactCard contact={externalContacts[4]!} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copiar telefone de CELESC' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Telefone copiado.'));
  expect(writeText).toHaveBeenCalledWith('08000480196');
});
it('oferece cópia manual quando o clipboard não estiver disponível', async () => {
  vi.stubGlobal('navigator', {});
  render(<ContactCard contact={externalContacts[0]!} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copiar telefone de Defesa Civil' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('copie manualmente'));
  expect(screen.getByText('199')).toBeTruthy();
});
it('mantém telefones corretos, links tel e pendências sem rotas presumidas', () => {
  render(<EmergencyContacts />);
  fireEvent.click(screen.getByRole('button', { name: 'Contatos de Emergência' }));
  expect(screen.getAllByRole('link', { name: /^Ligar/ }).map(a => a.getAttribute('href'))).toEqual(['tel:199', 'tel:193', 'tel:192', 'tel:190', 'tel:08000480196']);
  expect(screen.queryByRole('link', { name: /Ver rota/ })).toBeNull();
  expect(screen.getAllByText('A confirmar').length).toBeGreaterThanOrEqual(5);
  expect(internalContacts).toEqual([]);
  expect(terminalOrigin.status).toBe('pending');
  expect(phoneDigits('(47) 3333-4444')).toBe('4733334444');
});
it('constrói rota rodoviária somente com origem e destino confirmados', () => {
  const contact = externalContacts[0]!;
  const origin = { status: 'confirmed' as const, text: 'Origem de teste', source: 'https://example.com' };
  const url = new URL(contactRoute(contact, origin)!);
  expect(url.origin).toBe('https://www.google.com');
  expect(url.searchParams.get('origin')).toBe(origin.text);
  expect(url.searchParams.get('destination')).toBe(contact.address.status === 'confirmed' ? contact.address.text : '');
  expect(url.searchParams.get('travelmode')).toBe('driving');
  expect(contactRoute({ ...contact, address: { status: 'pending' } }, origin)).toBeNull();
  expect(contactRoute({ ...contact, address: { status: 'not-applicable' } }, origin)).toBeNull();
});
it('usa o mesmo cartão para internos, sem endereço ou tempo', () => {
  const { container } = render(<ContactCard contact={{ id: 'fixture', category: 'internal', name: 'Contato de teste', description: 'Função de teste', phone: '(47) 3333-4444', responsibility: 'Responsabilidade de teste' }} />);
  expect(container.querySelector('.contact-card')).toBeTruthy();
  expect(screen.getByText('Responsabilidade de teste')).toBeTruthy();
  expect(screen.getByRole('link').getAttribute('href')).toBe('tel:4733334444');
  expect(screen.queryByText('Tempo de deslocamento')).toBeNull();
  expect(screen.queryByText('Endereço de referência')).toBeNull();
});
it('suporta minutos estáticos e endereço não aplicável', () => {
  const { rerender } = render(<ContactCard contact={{ ...externalContacts[0]!, travelMinutes: 12 }} />);
  expect(screen.getByText('12 min')).toBeTruthy();
  rerender(<ContactCard contact={{ ...externalContacts[0]!, address: { status: 'not-applicable' } }} />);
  expect(screen.getAllByText('Não aplicável')).toHaveLength(2);
});
it('remove apenas as seis áreas e os itens 05 solicitados', () => {
  expect(areas).toEqual(['Operações', 'Comercial', 'QSSMS', 'TI', 'RH', 'Manutenção']);
  expect(planos.atencao.orientacoes).toHaveLength(5);
  expect(planos.alerta.orientacoes).toHaveLength(7);
  expect(planos.atencao.orientacoes.join()).not.toContain('Avaliar o próximo turno');
  expect(planos.alerta.orientacoes.join()).not.toContain('Avaliar condições de entrada e saída do próximo turno');
});
it('transfere avaliar e consolida sem duplicar, mantendo o restante de Impacto', () => {
  expect(planos.impacto.orientacoes).toEqual([
    'Priorizar a segurança das pessoas nas áreas envolvidas.',
    'Manter o Comitê El Niño ativo durante o impacto.',
    'Aplicar os procedimentos de contingência correspondentes.',
    'Manter comunicação ativa durante a ocorrência.',
    'Acompanhar simultaneamente a condição ambiental subjacente.',
    'Encerrar o Impacto JBS no sistema somente após confirmação de que a condição física registrada não permanece ativa.',
  ]);
  const emergency = planos.emergencia.orientacoes;
  expect(emergency).toHaveLength(9);
  expect(new Set(emergency).size).toBe(9);
  expect(emergency).toContain('Avaliar a extensão do impacto e áreas/infraestruturas envolvidas.');
  expect(emergency.filter(s => /acessos ao Terminal/.test(s))).toHaveLength(1);
  expect(emergency.join()).toContain('movimentação de pessoas');
  expect(emergency.join()).toContain('restrição, reorganização ou suspensão');
  expect(emergency.join()).toContain('reorganização dos deslocamentos');
});
