// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Monitoramento } from '../src/pages/Monitoramento';
import { parseStatus } from '../src/domain/contracts';
import { horario } from '../src/utils/presentation';
const fixture = () => parseStatus(JSON.parse(readFileSync('tests/fixtures/status-operacional.json','utf8')));
afterEach(cleanup);
it.each(['rios','chuva','previsao','barragens'] as const)('remove somente coleta global em %s e preserva dados', secao => {
  const status = fixture(), before = JSON.stringify(status);
  const {container} = render(<Monitoramento status={status} secao={secao}/>);
  expect(container.textContent).not.toContain('Coleta JBS:'); expect(JSON.stringify(status)).toBe(before);
  if(secao === 'rios') expect(screen.getAllByText(`Leitura: ${horario(status.rios.DC01!.medido_em)}`).length).toBeGreaterThan(0);
  if(secao === 'chuva') { expect(screen.getByRole('heading',{name:'Chuva — Estações'})).toBeTruthy(); expect(container.textContent).not.toContain('Valores da última coleta'); expect(screen.getByRole('columnheader',{name:'Atualização'})).toBeTruthy(); }
  if(secao === 'previsao') expect(screen.getByText(/Consulta:/)).toBeTruthy();
});
