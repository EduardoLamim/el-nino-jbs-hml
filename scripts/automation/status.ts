import { parseStatus, codigoHidrologicoSchema, severidade, type NivelJbs } from '../../src/domain/contracts';
import { urls } from '../collectors/sources';

/** Gate de publicação; não classifica medições nem modifica o resultado do motor. */
export function validarStatusPublicavel(value: unknown) {
  const s = parseStatus(value);
  if (!s.atualizado_em || !s.motor || s.motor.avaliado_em !== s.atualizado_em) throw new Error('Geração/memória do motor ausente ou inconsistente.');
  if (Date.parse(s.atualizado_em) > Date.now()) throw new Error('Geração no futuro.');
  const gerado = Date.parse(s.atualizado_em);
  if (Object.keys(s.fontes).sort().join() !== Object.keys(urls).sort().join()) throw new Error('Inventário de fontes incompleto.');
  for (const [id, url] of Object.entries(urls)) {
    const f = s.fontes[id]!;
    if (f.url !== url || !f.resultado || !f.coletado_em || !f.requisicoes?.length
      || Date.parse(f.coletado_em) > gerado
      || f.requisicoes.some(r => Date.parse(r.coletado_em) > gerado)) throw new Error(`Proveniência inconsistente: ${id}`);
    if (f.resultado === 'falha' && (f.qualidade !== 'indisponivel' || !f.motivo)) throw new Error(`Falha sem diagnóstico: ${id}`);
  }
  if (codigoHidrologicoSchema.options.some(c => !s.motor!.rios[c])) throw new Error('Memória DC01–DC11 incompleta.');
  const niveis = [s.motor.situacao_oficial.nivel, ...Object.values(s.motor.rios).map(r => r?.nivel ?? null)];
  const max = niveis.reduce<NivelJbs | null>((a, n) => n !== null && (a === null || severidade[n] > severidade[a]) ? n : a, null);
  if (s.nivel_jbs.nivel !== max) throw new Error('Nível público diverge da memória do motor.');
  if (Object.values(s.fontes).some(f => f.resultado === 'falha') && s.qualidade_monitoramento.estado === 'atualizado') throw new Error('Falha apresentada como qualidade atualizada.');
  return s;
}
