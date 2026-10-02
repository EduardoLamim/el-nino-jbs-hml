import { describe, expect, it } from 'vitest';
import fixture from './fixtures/epagri-itajai.json';
import catalogo from './fixtures/epagri-municipio.json';
import { normalizarEpagri, validarMunicipioEpagri } from '../scripts/collectors/epagri';
import { previsaoSchema } from '../src/domain/contracts';

const coleta = '2026-10-01T15:00:00-03:00';
describe('Epagri/Ciram — formato municipal real', () => {
  it('valida nome e código Itajaí; recusa divergências e UF diferente quando informada', () => {
    expect(() => validarMunicipioEpagri(catalogo)).not.toThrow();
    expect(() => validarMunicipioEpagri([{ texto: 'Outra cidade', valor: '4208203' }])).toThrow();
    expect(() => validarMunicipioEpagri([{ texto: 'Itajaí', valor: '123' }])).toThrow();
    expect(() => validarMunicipioEpagri([{ ...catalogo[0], uf: 'PR' }])).toThrow();
    expect(() => validarMunicipioEpagri([...catalogo, ...catalogo])).toThrow();
    expect(() => normalizarEpagri([{ ...fixture[0], nmMunicipio: 'Litoral Norte' }], coleta)).toThrow();
    expect(() => normalizarEpagri([{ ...fixture[0], uf: 'SP' }], coleta)).toThrow();
  });
  it('preserva cinco dias, condições e medidas oficiais', () => {
    const p = normalizarEpagri(fixture, coleta).previsao;
    expect(p.fonte).toBe('Epagri/Ciram');
    expect(p.municipio).toBe('Itajaí');
    expect(p.codigo_municipio).toBe('4208203');
    expect(p.regiao).toBeNull();
    expect(p.abrangencia).toBe('municipal');
    expect(p.dias).toHaveLength(5);
    expect(p.dias[0]).toMatchObject({ data: '2026-10-01', condicao: 'Encoberto com chuva',
      temperatura_min_c: 15, temperatura_max_c: 16, precipitacao_mm: 6.4,
      vento: { direcao: 'ESE/NNW', velocidade_media_kmh: 3, rajada_kmh: 10 } });
    expect(p.dias[4]?.precipitacao_mm).toBe(43.6);
    expect(p.dias.map(d => d.descricao)).toEqual(fixture.map(d => d.nmCondicao));
  });
  it('não inventa modelo, emissão, probabilidade ou umidade', () => {
    const p = normalizarEpagri(fixture, coleta).previsao;
    expect(p.modelo).toBeNull();
    expect(p.atualizado_em).toBeNull();
    expect(p.coletado_em).toBe(coleta);
    expect(p.uf).toBeNull();
    expect(p.dias[0]?.probabilidade_precipitacao_percentual).toBeNull();
    expect(p.dias[0]?.umidade).toEqual({ relativa_percentual: null, minima_percentual: null, maxima_percentual: null });
  });
  it('null permanece null e zero explícito permanece zero', () => {
    const p = normalizarEpagri([{ ...fixture[0], tempMin: null, mmChuva: '0mm', velVentoMed: null, nmCondicao: null }], coleta).previsao;
    expect(p.dias[0]?.temperatura_min_c).toBeNull();
    expect(p.dias[0]?.precipitacao_mm).toBe(0);
    expect(p.dias[0]?.vento?.velocidade_media_kmh).toBeNull();
    expect(p.dias[0]?.descricao).toBeNull();
  });
  it('rejeita respostas vazias, datas inválidas/duplicadas e unidades divergentes', () => {
    expect(() => normalizarEpagri([], coleta)).toThrow();
    expect(() => normalizarEpagri([{ ...fixture[0], data: '31/02/2026' }], coleta)).toThrow();
    expect(() => normalizarEpagri([fixture[0], fixture[0]], coleta)).toThrow();
    expect(() => normalizarEpagri([{ ...fixture[0], mmChuva: '6in' }], coleta)).toThrow();
    expect(() => normalizarEpagri([{ ...fixture[0], mmChuva: '-1mm' }], coleta)).toThrow();
  });
  it('contrato preserva modelo/timestamp explícitos sem confundir região e município', () => {
    const p = normalizarEpagri(fixture, coleta).previsao;
    // MOCK de metadados futuros: nenhum modelo/horário foi atribuído ao JSON real.
    const regional = { ...p, abrangencia: 'regional', municipio: null, codigo_municipio: null,
      regiao: 'Vale do Itajaí', modelo: 'WRF', atualizado_em: '2026-10-01T00:00:00-03:00' };
    expect(previsaoSchema.parse(regional).modelo).toBe('WRF');
    expect(previsaoSchema.parse(regional).atualizado_em).toBe(regional.atualizado_em);
    expect(previsaoSchema.parse(regional).coletado_em).toBe(coleta);
    expect(() => previsaoSchema.parse({ ...regional, municipio: 'Itajaí' })).toThrow();
    expect(() => previsaoSchema.parse({ ...p, regiao: 'Vale do Itajaí' })).toThrow();
  });
});
