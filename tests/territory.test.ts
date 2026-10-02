import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import publicado from '../public/data/territorio.json';
import status from '../public/data/status.json';
import { bairrosGeojsonSchema, parseTerritorio, territorioSchema } from '../src/domain/territory';
import { parseStatus } from '../src/domain/contracts';
import { agregados, zonaExata } from '../scripts/territory/config';
import { anéisEsri } from '../scripts/territory/geometry';

const geoRaw = readFileSync('public/data/bairros.geojson', 'utf8');
const geo = bairrosGeojsonSchema.parse(JSON.parse(geoRaw));
const t = parseTerritorio(publicado);
const chaves = (v: unknown): string[] => v !== null && typeof v === 'object'
  ? Object.entries(v).flatMap(([k, x]) => [k, ...chaves(x)]) : [];

describe('Fase 04 — território estático e agregados', () => {
  it('preserva todos os 25 agregados e os totais 380/292/88', () => {
    expect(Object.keys(agregados)).toHaveLength(25);
    expect(Object.values(agregados).reduce((a, n) => a + n, 0)).toBe(292);
    expect(t.resumo_jbs).toEqual({ colaboradores_total: 380, colaboradores_itajai: 292, colaboradores_outros_municipios: 88, fonte_id: 'jbs' });
    for (const [nome, n] of Object.entries(agregados)) {
      const correspondentes = [...t.bairros.filter(b => b.nome === nome), ...t.localidades.filter(l => l.nome_exibicao === nome)];
      expect(correspondentes).toHaveLength(1);
      expect(correspondentes[0]!.colaboradores_jbs).toBe(n);
    }
    expect(t.bairros.reduce((a, b) => a + b.colaboradores_jbs, 0)).toBe(290);
    const errado = structuredClone(publicado); errado.bairros[0]!.colaboradores_jbs++;
    expect(territorioSchema.safeParse(errado).success).toBe(false);
  });
  it('mantém Portal 2 separado de Espinheiros, sem herdar resultados espaciais', () => {
    const portal = t.localidades.find(l => l.nome_exibicao === 'Portal 2')!;
    const espinheiros = t.bairros.find(b => b.nome === 'Espinheiros')!;
    expect(portal.colaboradores_jbs).toBe(1); expect(espinheiros.colaboradores_jbs).toBe(10);
    expect(portal.bairro_referencia_id).toBe(espinheiros.id);
    expect(portal.bairro_referencia).toBe('Espinheiros'); expect(portal.zona_defesa_civil).toBe(1);
    expect(portal.historico_inundacao).toBeNull(); expect(portal.susceptibilidade_hand).toBeNull();
    expect(portal.vias_historicas_alagamento).toBeNull();
    expect(territorioSchema.safeParse({ ...t, localidades: [{ ...portal, bairro_referencia_id: 'inexistente' }, t.localidades[1]] }).success).toBe(false);
  });
  it('não usa aproximação para Brilhante I e nomes de zonas', () => {
    const l = t.localidades.find(l => l.nome_exibicao === 'Brilhante I')!;
    expect(l.correspondencia).toBe('sem_correspondencia'); expect(l.bairro_referencia_id).toBeNull();
    expect(l.colaboradores_jbs).toBe(1); expect(l.zona_defesa_civil).toBe(10);
    expect(t.bairros.find(b => b.nome === 'Brilhante')!.colaboradores_jbs).toBe(0);
    expect(zonaExata('Brilhante')).toBeNull(); expect(zonaExata('Baia')).toBeNull();
    expect(zonaExata('Sao Vicente')).toBeNull(); expect(zonaExata('São Vicente')).toBe(3);
  });
  it('valida 35 polígonos, chaves 1:1, coordenadas web e atestado OGC', () => {
    expect(geo.features).toHaveLength(35); expect(t.bairros).toHaveLength(35); expect(t.localidades).toHaveLength(2);
    expect(new Set(geo.features.map(f => f.properties.nome)).size).toBe(35);
    for (const b of t.bairros) {
      expect(b.zona_defesa_civil).toBe(zonaExata(b.nome));
      const f = geo.features.find(f => f.id === b.id)!;
      expect(f.properties.nome_bruto).toBe(b.nome_bruto);
      expect(f.properties.identificador_fonte).toBe(b.identificador_fonte);
    }
    const atestado = JSON.parse(readFileSync('docs/fase-04-validacao-geometrica.json', 'utf8'));
    expect(atestado.valido).toBe(true); expect(atestado.erros).toEqual([]);
    expect(atestado.geojson_sha256).toBe(createHash('sha256').update(geoRaw).digest('hex'));
    const invalido = structuredClone(geo); const f = invalido.features[0]!;
    if (f.geometry.type === 'Polygon') f.geometry.coordinates[0]![0]![0] = 999;
    else f.geometry.coordinates[0]![0]![0]![0] = 999;
    expect(bairrosGeojsonSchema.safeParse(invalido).success).toBe(false);
  });
  it('rejeita campos individuais e campos de condição atual em todos os níveis', () => {
    const proibidos = ['matricula', 'cpf', 'endereco', 'cep', 'cargo', 'coordenada_residencial', 'nome_colaborador',
      'nivel_jbs', 'nivel_atual', 'risco_atual', 'colaboradores_afetados', 'estacoes', 'estacoes_relacionadas', 'dc', 'cota_via_publico'];
    for (const k of proibidos) {
      expect(chaves(publicado)).not.toContain(k); expect(chaves(geo)).not.toContain(k);
      expect(territorioSchema.safeParse({ ...t, [k]: 'indevido' }).success).toBe(false);
      expect(territorioSchema.safeParse({ ...t, bairros: [{ ...t.bairros[0], [k]: 'indevido' }, ...t.bairros.slice(1)] }).success).toBe(false);
    }
    expect(chaves(geo)).not.toContain('colaboradores_jbs');
  });
  it('preserva proveniência de cada cruzamento e deduplica períodos', () => {
    const ids = new Set(t.fontes.map(f => f.id));
    for (const f of t.fontes) if (f.id !== 'jbs') expect(new URL(f.url!).hostname.endsWith('itajai.sc.gov.br')).toBe(true);
    for (const b of t.bairros) {
      expect(ids.has(b.fonte_id)).toBe(true);
      expect(b.historico_inundacao.natureza).toBe('historico');
      const refs = b.historico_inundacao.referencias;
      expect(new Set(refs.map(r => r.periodo)).size).toBe(refs.length);
      for (const r of refs) for (const c of r.camadas) expect(ids.has(c.fonte_id)).toBe(true);
      expect(b.vias_historicas_alagamento.filtro).toBe("trecho_alagado = '1'");
      expect(b.susceptibilidade_hand.ativacao).toBe('nenhuma');
      expect(b.susceptibilidade_hand.natureza).toBe('susceptibilidade_modelada');
    }
    expect(territorioSchema.safeParse({ ...t, fontes: t.fontes.filter(f => f.id !== 'hand') }).success).toBe(false);
    const bad = structuredClone(t); const b = bad.bairros.find(b => b.historico_inundacao.referencias.length)!;
    b.historico_inundacao.referencias.push(b.historico_inundacao.referencias[0]!);
    expect(territorioSchema.safeParse(bad).success).toBe(false);
  });
  it('preserva 12 consultas espaciais por bairro com vínculo e parâmetros auditáveis', () => {
    const a = JSON.parse(readFileSync('docs/fase-04-consultas.json', 'utf8')) as { consultas: {
      bairro_id?: string; parametros: { spatialRel?: string; where?: string }; contagem?: number;
    }[] };
    expect(a.consultas).toHaveLength(423);
    for (const b of t.bairros) {
      const consultas = a.consultas.filter(c => c.bairro_id === b.id);
      expect(consultas).toHaveLength(12);
      expect(consultas.every(c => c.parametros.spatialRel === 'esriSpatialRelIntersects' && Number.isInteger(c.contagem))).toBe(true);
      expect(consultas.filter(c => c.parametros.where === "trecho_alagado = '1'")).toHaveLength(1);
      expect(consultas.filter(c => c.parametros.where === 'nivel_cm >= 10 AND nivel_cm <= 400')).toHaveLength(1);
    }
  });
  it('mantém status dinâmico e motor separados do território', () => {
    expect(parseStatus(status)).toBeDefined();
    expect(() => parseStatus({ ...status, territorio: t })).toThrow();
    expect(() => parseTerritorio({ ...t, nivel_jbs: status.nivel_jbs })).toThrow();
    for (const f of ['src/domain/alert-engine.ts', 'src/domain/hydrology.ts'])
      expect(readFileSync(f, 'utf8')).not.toMatch(/territorio|territory|colaboradores_jbs/);
    expect(t.zonas.every(z => z.natureza === 'administrativa_operacional')).toBe(true);
  });
  it('converte orientação GeoJSON para Esri preservando buracos e multipolígonos', () => {
    const exterior: [number, number][] = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];
    const buraco: [number, number][] = [[1, 1], [1, 2], [2, 2], [2, 1], [1, 1]];
    expect(anéisEsri({ type: 'Polygon', coordinates: [exterior, buraco] })).toEqual([[...exterior].reverse(), [...buraco].reverse()]);
    expect(anéisEsri({ type: 'MultiPolygon', coordinates: [[exterior, buraco], [exterior]] })).toHaveLength(3);
  });
});
