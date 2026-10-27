// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { areaPlans } from '../src/content/area-plans';
import { PlansCenter } from '../src/pages/PlansCenter';
const plan=areaPlans.Operações!;
const view=()=>render(<PlansCenter secao="operacoes" impacto={{dado:null,qualidade:'desconhecido',confirmado_em:null,realtime:'reconectando'}} />);
beforeEach(()=>{
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
});
afterEach(cleanup);
it('cadastra seis ações nas duas categorias com metadados oficiais',()=>{
  expect(plan).toMatchObject({responsavel:'Diego Rodrigo Juliani',atualizado:'26/10/2026',versao:1});
  expect(plan.acoes).toHaveLength(6);
  const {container}=view();
  expect(screen.getByText('Diego Rodrigo Juliani')).toBeTruthy();
  for(const level of ['Emergência','Impacto JBS']) {
    fireEvent.click(screen.getByRole('tab',{name:level}));
    expect(container.querySelectorAll('tr.area-action')).toHaveLength(3);
    for(const action of plan.acoes.filter(a=>a['Nível']===level)) {
      const cells=Array.from(container.querySelectorAll('td'),c=>c.textContent);
      for(const field of ['Quem faz','Quem faz - Secundário','Quando faz','Onde faz','Como faz'] as const) expect(cells).toContain(action[field]);
    }
  }
  expect(plan.acoes[2]!['Onde faz']).toBe('Pátios / Cais ');
});
it('mantém JPEG original byte a byte, sem recompressão',()=>{
  expect(createHash('sha256').update(readFileSync('public/assets/operacoes-posicionamento-equipamentos.jpg')).digest('hex')).toBe('4690494854f45e79fe6da7fad68e1b6246994fc3419f6770787382e68de42ead');
});
it('abre mapa da área com zoom e foco, sem substituir mapa geral',()=>{
  view();
  const trigger=screen.getByRole('button',{name:'Mapa de Decisões'});
  expect(screen.getAllByRole('button',{name:/Mapa de Decisões/})).toHaveLength(1);
  expect(screen.queryByText('← Planos de Ação por Área')).toBeNull();
  expect(screen.getByRole('link',{name:'Planos de Ação por Área'})).toBeTruthy();
  fireEvent.click(trigger);
  fireEvent.change(screen.getByRole('combobox',{name:'Mapa em consulta'}),{target:{value:'operacoes'}});
  const dialog=screen.getByRole('dialog',{name:'Mapa de Decisões do Terminal'});
  expect(within(dialog).getByText(/Diego Rodrigo Juliani.*26\/10\/2026/)).toBeTruthy();
  const img=within(dialog).getByAltText('Posicionamento de equipamentos — Operações') as HTMLImageElement;
  expect(img.getAttribute('src')).toContain('assets/operacoes-posicionamento-equipamentos.jpg');
  fireEvent.load(img);
  fireEvent.click(within(dialog).getByRole('button',{name:'Ampliar zoom'}));
  expect(img.style.width).toBe('150%');
  fireEvent.click(within(dialog).getByRole('button',{name:'Ajustar à largura'}));
  expect(img.style.width).toBe('100%');
  fireEvent.click(within(dialog).getByRole('button',{name:'Fechar mapa'}));
  expect(document.activeElement).toBe(trigger);
});
it('falha da imagem mantém plano acessível sem inventar conteúdo',()=>{
  view(); fireEvent.click(screen.getByRole('button',{name:'Mapa de Decisões'}));
  fireEvent.change(screen.getByRole('combobox',{name:'Mapa em consulta'}),{target:{value:'operacoes'}});
  fireEvent.error(screen.getByAltText('Posicionamento de equipamentos — Operações'));
  expect(screen.getByText(/ainda não disponibilizado ou temporariamente indisponível/)).toBeTruthy();
  expect(document.querySelectorAll('tr.area-action')).toHaveLength(3);
});
