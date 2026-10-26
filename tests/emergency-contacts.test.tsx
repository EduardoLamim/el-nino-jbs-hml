// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ContactCard, EmergencyContacts } from '../src/components/EmergencyContacts';
import { ActivationHierarchy } from '../src/components/ActivationHierarchy';
import { externalContacts, internalContacts } from '../src/content/emergency-contacts';
import { activationHierarchy } from '../src/content/activation-hierarchy';
import { areas } from '../src/content/area-plans';
import { planos } from '../src/content/action-plans';
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable:true, value:function(this:HTMLDialogElement){this.open=true;} });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable:true, value:function(this:HTMLDialogElement){this.open=false;this.dispatchEvent(new Event('close'));} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('preserva exatamente os sete contatos e tempos fornecidos pelo plano', () => {
  expect(externalContacts.map(c => [c.name,c.phone,c.travelMinutes])).toEqual([
    ['Polícia Militar','190',10],['SAMU','192',10],['Corpo de Bombeiros','193',10],['Defesa Civil','199',16],['CODETRAN','153',8],['Hospital Mat. Marieta','3349-9400',5],['Base da Ambulância','0800 488 488',20],
  ]);
  expect(internalContacts).toEqual([{id:'cccom',category:'internal',name:'CCCOM',phone:'(47)9970-91600'}]);
});
it('modal oferece contatos legíveis sem links, cópia, endereço ou rotas', () => {
  render(<EmergencyContacts />);
  const trigger=screen.getByRole('button',{name:'Contatos de Emergência'});fireEvent.click(trigger);
  expect(screen.getAllByRole('article')).toHaveLength(7);
  expect(screen.queryAllByRole('link')).toHaveLength(0);
  expect(screen.queryByRole('button',{name:/Copiar|Ligar/})).toBeNull();
  expect(screen.queryByText(/Endereço|Google Maps|Rota indisponível/)).toBeNull();
  expect(screen.getAllByText('10 minutos')).toHaveLength(3);
  fireEvent.keyDown(screen.getByRole('tab',{name:'Órgãos externos'}),{key:'ArrowRight'});
  expect(screen.getByText('CCCOM')).toBeTruthy();expect(screen.getByText('(47)9970-91600')).toBeTruthy();
  expect(screen.queryByText('Tempo de percurso')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Fechar contatos de emergência'}));
  expect(screen.queryByRole('dialog')).toBeNull();expect(document.activeElement).toBe(trigger);
});
it('compartilha o cartão com internos sem campos externos', () => {
  const {container}=render(<ContactCard contact={internalContacts[0]!} />);
  expect(container.querySelector('.contact-card')).toBeTruthy();
  expect(container.querySelectorAll('a,button,dl')).toHaveLength(0);
});
it('hierarquia vazia sem responsáveis inventados, fecha e retorna o foco', () => {
  expect(activationHierarchy).toEqual([]);render(<ActivationHierarchy />);
  const trigger=screen.getByRole('button',{name:'Hierarquia de Acionamento'});fireEvent.click(trigger);
  expect(screen.getByRole('dialog',{name:'Hierarquia de Acionamento'})).toBeTruthy();
  expect(screen.getByText('Hierarquia de acionamento ainda não cadastrada.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Fechar hierarquia de acionamento'}));
  expect(screen.queryByRole('dialog')).toBeNull();expect(document.activeElement).toBe(trigger);
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
