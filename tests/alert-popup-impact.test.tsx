// @vitest-environment jsdom
import { useCallback, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LevelAlert } from '../src/components/LevelAlert';
import { ImpactoJbs } from '../src/components/ImpactoJbs';
import { ImpactoStore } from '../src/services/impact';
import type { EstadoImpacto } from '../src/domain/impact';
const ref = vi.hoisted(() => ({ store: null as unknown }));
vi.mock('../src/services/impact', async original => ({ ...await original<object>(), criarImpactoStore: () => ref.store }));
class Media {
  static all: Media[] = [];
  loop=false; volume=1; currentTime=0; onended: (()=>void)|null=null; onerror: (()=>void)|null=null;
  play=vi.fn(async()=>{}); pause=vi.fn(); removeAttribute=vi.fn(); load=vi.fn();
  constructor(public src:string) { Media.all.push(this); }
}
beforeEach(() => {
  Media.all=[]; vi.stubGlobal('Audio',Media);
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  HTMLDialogElement.prototype.close=function(){this.open=false;};
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('Parar som silencia sem reconhecer; término natural mantém popup; Escape não dispensa',async()=>{
  const {rerender}=render(<LevelAlert nivel="normalidade"/>);
  fireEvent.click(screen.getByText('Habilitar som')); await screen.findByText('Testar som');
  rerender(<LevelAlert nivel="alerta"/>);
  await waitFor(()=>expect((screen.getByText('Parar som') as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByText('Parar som')); expect(Media.all[1]!.pause).toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeTruthy();
  expect(fireEvent(screen.getByRole('dialog'),new Event('cancel',{bubbles:true,cancelable:true}))).toBe(false);
  fireEvent.click(screen.getByText('Reconhecer')); expect(screen.queryByRole('dialog')).toBeNull();
  rerender(<LevelAlert nivel="emergencia"/>);
  await waitFor(()=>expect((screen.getByText('Parar som') as HTMLButtonElement).disabled).toBe(false));
  act(()=>Media.all[2]!.onended?.()); expect((screen.getByText('Parar som') as HTMLButtonElement).disabled).toBe(true); expect(screen.getByRole('dialog')).toBeTruthy();
});
function Harness(){
  const [event,setEvent]=useState(0);
  const [state,setState]=useState<EstadoImpacto|null>(null);
  const activated=useCallback(()=>setEvent(n=>n+1),[]);
  return <><ImpactoJbs onAtivacao={activated} onEstado={setState}/><LevelAlert nivel="normalidade" impactoAtivo={state?.dado?.ativo??null} impactEvent={event}/></>;
}
function backend(initial:boolean){
  let active=initial; let revision=0;
  const snapshot=()=>({id:1,revisao:++revision,ativo:active,impacto_id:active?'00000000-0000-4000-8000-000000000001':null,tipo:active?'alagamento_terminal':null,acionado_em:active?'2026-10-06T12:00:00Z':null,atualizado_em:'2026-10-06T12:00:00Z'});
  const store=new ImpactoStore({consultar:async()=>snapshot(),executar:async()=>snapshot(),assinar:()=>()=>{}});
  ref.store=store;
  return { store, set:(value:boolean)=>{active=value;} };
}
it('store real → componente → MP3: transição confirmada agrupada pelo React não é perdida nem repetida',async()=>{
  const {store,set}=backend(false); render(<Harness/>);
  fireEvent.click(screen.getByText('Habilitar som'));await screen.findByText('Testar som');
  await act(async()=>{await store.reconciliar();set(true);await store.reconciliar();});
  await screen.findByRole('heading',{name:'IMPACTO NO TERMINAL CONFIRMADO'});
  await waitFor(()=>expect(Media.all[2]!.play).toHaveBeenCalledTimes(2)); // unlock + alarm
  await act(async()=>{await store.reconciliar();await store.reconciliar();});expect(Media.all[2]!.play).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByText('Reconhecer'));
  await act(async()=>{set(false);await store.reconciliar();});expect(screen.queryByRole('dialog')).toBeNull();
});
it('store inicialmente ativo não abre popup nem toca sirene',async()=>{
  const {store}=backend(true);render(<Harness/>);await act(async()=>{await store.reconciliar();});
  expect(screen.queryByRole('dialog')).toBeNull();expect(Media.all).toHaveLength(0);
});
