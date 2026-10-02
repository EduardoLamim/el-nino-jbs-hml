import { describe, expect, expectTypeOf, it } from 'vitest';
import statusPublicado from '../public/data/status.json';
import { statusVazio } from '../scripts/collectors/pipeline';
import territorioInicial from '../public/data/territorio.json';
import { barragemSchema, nivelSchema, nivelPorFlag, parseStatus,
  parseTerritorio, severidade, type Status, type Territorio, type ImpactoJbs, type NivelJbs,
  type EntradaMotorAutomatico } from '../src/domain/contracts';
import { rotuloNivel, rotuloQuantidade } from '../src/utils/format';
const statusInicial = statusVazio();

describe('Contratos da Fase 01', () => {
  it('valida os arquivos de produção sem inventar normalidade', () => {
    const status = parseStatus(statusInicial);
    expectTypeOf(status).toEqualTypeOf<Status>();
    expectTypeOf(parseTerritorio(territorioInicial)).toEqualTypeOf<Territorio>();
    expect(parseStatus(statusPublicado)).toBeDefined();
    expect(status.nivel_jbs.nivel).toBeNull();
    expect(status.situacao_oficial).toBeNull();
    expect(status.alertas_oficiais).toBeNull();
    expect(status.qualidade_monitoramento.estado).toBe('degradado');
    expect(rotuloNivel(status.nivel_jbs.nivel)).toContain('Desconhecido');
  });
  it('mantém ordem e mapeamento oficial explícitos', () => {
    expect(nivelSchema.options.map(n => severidade[n])).toEqual([0, 1, 2, 3]);
    expect(nivelPorFlag).toEqual({ Normalidade: 'normalidade', Atenção: 'atencao', Alerta: 'alerta', Emergência: 'emergencia' });
  });
  it('exclui impacto e fontes contextuais do motor automático', () => {
    expectTypeOf<Extract<ImpactoJbs['tipo'], NivelJbs>>().toEqualTypeOf<never>();
    expectTypeOf<Extract<keyof EntradaMotorAutomatico, 'chuvas' | 'barragens' | 'previsao' | 'colaboradores'>>().toEqualTypeOf<never>();
    expect(nivelSchema.safeParse('impacto_jbs').success).toBe(false);
    expect(() => parseStatus({ ...statusInicial, nivel_jbs: { nivel: 'impacto_jbs', desde: null, gatilhos: [] } })).toThrow();
  });
  it('preserva null e zero como informações distintas', () => {
    const barragem = barragemSchema.parse({ nome: 'MOCK — teste', fonte: 'MOCK', ocupacao_percentual: null,
      montante_m: null, ultima_variacao_m: null, comportas_abertas: null, comportas_fechadas: 0,
      extravasor_m: null, qualidade: 'indisponivel', medido_em: null, atualizacao_esperada_segundos: null, serie: [] });
    expect(barragem.comportas_abertas).toBeNull();
    expect(barragem.comportas_fechadas).toBe(0);
    expect(rotuloQuantidade(null)).toBe('Não informado');
    expect(rotuloQuantidade(0)).toBe('0');
  });
  it('rejeita contratos incompletos, versões inválidas e campos extras', () => {
    expect(() => parseStatus({})).toThrow();
    expect(() => parseStatus({ ...statusInicial, versao: 2 })).toThrow();
    expect(() => parseTerritorio({ ...territorioInicial, nomes: ['MOCK'] })).toThrow();
    expect(() => parseTerritorio({ ...territorioInicial, colaboradores: { total: 1, itajai: 292, outros_municipios: 88 } })).toThrow();
  });
  it('não deriva situação oficial da ausência de alertas', () => {
    const status = parseStatus({ ...statusInicial, situacao_oficial: {
      flag: 'Alerta', conteudo: 'MOCK — teste', atualizado_em: null, qualidade: 'indisponivel' } });
    expect(status.alertas_oficiais).toBeNull();
    expect(status.situacao_oficial?.flag).toBe('Alerta');
    expect(status.nivel_jbs.nivel).toBeNull();
  });
  it('não aceita relações territoriais sem validação', () => {
    expect(() => parseTerritorio({ ...territorioInicial, estacoes: { DC01: {
      codigo: 'DC01', latitude: null, longitude: null, curso: null, bairro_fisico: null,
      relacao_territorial_validada: false, areas_relacionadas: ['MOCK'],
    } } })).toThrow();
  });
  it('aceita nível e qualidade independentes', () => {
    const status = parseStatus({ ...statusInicial,
      nivel_jbs: { nivel: 'alerta', desde: null, gatilhos: [] },
      qualidade_monitoramento: { estado: 'parcialmente_degradado', problemas: ['MOCK'] } });
    expect(status.nivel_jbs.nivel).toBe('alerta');
    expect(status.qualidade_monitoramento.estado).toBe('parcialmente_degradado');
  });
});

