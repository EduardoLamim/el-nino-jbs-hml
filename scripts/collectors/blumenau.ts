import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { blumenauSchema, blumenauUrl, nivelBlumenau, type Blumenau } from '../../src/domain/blumenau';
import { criarHttp, type Transport } from './http';
import { blumenauTransport } from './blumenau-transport';
type Node = DefaultTreeAdapterMap['node'];
function text(node: Node): string { return 'value' in node ? node.value : 'childNodes' in node ? node.childNodes.map(text).join(' ') : ''; }
function descendants(node: Node, tag: string): Node[] {
  return [...('tagName' in node && node.tagName === tag ? [node] : []), ...('childNodes' in node ? node.childNodes.flatMap(n => descendants(n, tag)) : [])];
}
const normalized = (s: string) => s.replace(/\s+/g, ' ').trim();
export function parseBlumenau(html: string, collected: string): Blumenau {
  const tables = descendants(parse(html), 'table').map(table => descendants(table, 'tr').map(row =>
    [...('childNodes' in row ? row.childNodes : [])].filter(n => 'tagName' in n && ['th', 'td'].includes(n.tagName)).map(n => normalized(text(n)))));
  const candidates = tables.filter(rows => rows.some(r => r[0] === 'Hora da Leitura' && r[1] === 'Nível (m)' && r[2] === 'Variação (m)'));
  if (candidates.length !== 1) throw new Error('Tabela oficial de leituras ausente ou ambígua.');
  const rows = candidates[0]!.filter(row => /^\d{2}\/\d{2}\/\d{4}/.test(row[0] ?? '')).map(row => {
    const match = row[0]!.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (!match || !/^-?\d+(?:,\d+)?$/.test(row[1] ?? '')) throw new Error('Leitura oficial inválida.');
    const [, d, m, y, h, min] = match;
    const date = `${y}-${m}-${d}T${h}:${min}:00-03:00`;
    const ms = Date.parse(date);
    if (!Number.isFinite(ms) || new Date(ms - 3 * 3600000).toISOString().slice(0, 16) !== `${y}-${m}-${d}T${h}:${min}`) throw new Error('Horário oficial inválido.');
    return { value: Number(row[1]!.replace(',', '.')), date, ms };
  }).sort((a, b) => b.ms - a.ms);
  const latest = rows[0];
  if (!latest || latest.ms > Date.parse(collected) + 60000 || rows.some((r, i) => i > 0 && r.ms === rows[i - 1]!.ms)) throw new Error('Série oficial vazia, futura ou duplicada.');
  const original = tables.flat().filter(r => /^Itajaí-A[çc][uú]$/i.test(r[0] ?? '')).map(r => r[1]).filter((s): s is string => !!s);
  const prior = rows[1];
  return blumenauSchema.parse({ nivel_m: latest.value, medido_em: latest.date, coletado_em: collected,
    classificacao_original: original.length === 1 ? original[0]! : null,
    nivel: nivelBlumenau(latest.value), tendencia: prior ? latest.value > prior.value ? 'subindo' : latest.value < prior.value ? 'descendo' : 'estavel' : null,
    qualidade: Date.parse(collected) - latest.ms > 2 * 3600000 ? 'atrasado' : 'atualizado', fonte: blumenauUrl, motivo: null });
}
export async function coletarBlumenau(transport?: Transport): Promise<Blumenau> {
  const collected = new Date().toISOString();
  try { return parseBlumenau(await criarHttp([], transport ?? blumenauTransport)(blumenauUrl), collected); }
  catch { return { nivel_m: null, medido_em: null, coletado_em: collected, classificacao_original: null, nivel: null, tendencia: null, qualidade: 'indisponivel', fonte: blumenauUrl, motivo: 'Fonte oficial indisponível ou estrutura não reconhecida.' }; }
}
