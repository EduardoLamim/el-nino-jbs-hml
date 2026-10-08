import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBlumenau, coletarBlumenau } from '../scripts/collectors/blumenau';
import { nivelBlumenau } from '../src/domain/blumenau';
import { statusVazio } from '../scripts/collectors/pipeline';
import { aplicarMotor } from '../src/domain/alert-engine';
const html = (level = '4,23', date = '08/10/2026 10:00') => `<table><tr><th>Hora da Leitura</th><th>Nível (m)</th><th>Variação (m)</th></tr><tr><td>${date}</td><td>${level}</td><td>0,07</td></tr><tr><td>08/10/2026 09:00</td><td>4,16</td><td>0,11</td></tr></table><table><tr><td>Itajaí-Açu</td><td>Atenção</td></tr></table>`;
describe('Blumenau informativo', () => {
  it('interpreta a estrutura aninhada real observada na fonte oficial', () => {
    expect(parseBlumenau(readFileSync('tests/fixtures/blumenau-oficial-recorte.html', 'utf8'), '2026-10-08T18:10:00Z')).toMatchObject({ nivel_m: 4.24, nivel: 'atencao', medido_em: '2026-10-08T15:00:00-03:00', tendencia: 'descendo', classificacao_original: 'Atenção', qualidade: 'atualizado' });
  });
  it.each([[2.99, 'normalidade'], [3, 'atencao'], [5.99, 'atencao'], [6, 'alerta'], [7.99, 'alerta'], [8, 'emergencia'], [9, 'emergencia']] as const)('normaliza %s para %s', (n, expected) => expect(nivelBlumenau(n)).toBe(expected));
  it('extrai valor, horário BRT, tendência e classificação original', () => {
    const b = parseBlumenau(html(), '2026-10-08T13:30:00Z');
    expect(b).toMatchObject({ nivel_m: 4.23, medido_em: '2026-10-08T10:00:00-03:00', tendencia: 'subindo', classificacao_original: 'Atenção', qualidade: 'atualizado' });
  });
  it('duas horas inclusive válido; acima disso atrasado', () => {
    expect(parseBlumenau(html(), '2026-10-08T15:00:00Z').qualidade).toBe('atualizado');
    expect(parseBlumenau(html(), '2026-10-08T15:00:01Z').qualidade).toBe('atrasado');
  });
  it.each(['<html>Indisponível</html>', html('x'), html('3', '31/02/2026 10:00'), html('3', '09/10/2026 10:00'), html() + html()])('rejeita estrutura e leitura inválida', input => expect(() => parseBlumenau(input, '2026-10-08T14:00:00Z')).toThrow());
  it('falha de rede e HTTP não geram zero ou normalidade', async () => {
    for (const transport of [async () => { throw Error('timeout'); }, async () => new Response('error', { status: 503 })]) {
      expect(await coletarBlumenau(transport)).toMatchObject({ qualidade: 'indisponivel', nivel: null, nivel_m: null, medido_em: null });
    }
  });
  it('nenhuma influência em gatilhos, histerese ou nível JBS', () => {
    const base = statusVazio(); base.atualizado_em = '2026-10-08T14:00:00Z';
    const a = aplicarMotor(base);
    const b = aplicarMotor({ ...base, blumenau: parseBlumenau(html('10'), base.atualizado_em) });
    expect(b.motor).toEqual(a.motor); expect(b.nivel_jbs).toEqual(a.nivel_jbs);
  });
});
