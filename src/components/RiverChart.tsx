import type { EstacaoHidrologica } from '../domain/contracts';
import { horario, medida } from '../utils/presentation';

export function RiverChart({ estacao }: { estacao: EstacaoHidrologica }) {
  const datadas = estacao.serie_12h.filter(p => p.medido_em !== null).sort((a, b) => Date.parse(a.medido_em!) - Date.parse(b.medido_em!));
  const fim = datadas.length ? Date.parse(datadas.at(-1)!.medido_em!) : 0;
  const serie = datadas.filter(p => Date.parse(p.medido_em!) >= fim - 12 * 3600000);
  const validas = serie.filter(p => p.nivel_m !== null && p.qualidade !== 'indisponivel');
  if (!validas.length) return <p>Série de níveis indisponível.</p>;
  const inicio = Date.parse(serie[0]!.medido_em!);
  const min = Math.min(...validas.map(p => p.nivel_m!));
  const max = Math.max(...validas.map(p => p.nivel_m!));
  const amplitude = max - min || 0.2;
  const y = (n: number) => 160 - (n - min) / amplitude * 120;
  const x = (t: string) => 58 + (Date.parse(t) - inicio) / (fim - inicio || 1) * 580;
  let continuar = false;
  const caminho = serie.map(p => {
    if (p.nivel_m === null || p.qualidade === 'indisponivel') { continuar = false; return ''; }
    const d = `${continuar ? 'L' : 'M'} ${x(p.medido_em!)} ${y(p.nivel_m)}`; continuar = true; return d;
  }).join(' ');
  return <figure className="river-chart"><figcaption>Nível do rio · série disponível de até 12 horas</figcaption>
    <p className="meta">Mínimo {medida(min, 'm')} · Máximo {medida(max, 'm')}</p>
    <svg viewBox="0 0 680 190" role="img" aria-label={`Série de nível ${estacao.codigo}, de ${horario(serie[0]!.medido_em)} a ${horario(serie.at(-1)!.medido_em)}; mínimo ${medida(min, 'm')}, máximo ${medida(max, 'm')}`}>
      <line x1="58" y1="180" x2="638" y2="180" stroke="currentColor" opacity=".2" />
      <line x1="58" y1="35" x2="58" y2="180" stroke="currentColor" opacity=".2" />
      <text x="5" y="45">{medida(max)}</text><text x="5" y="164">{medida(min)}</text>
      <path d={caminho} fill="none" stroke="#236b87" strokeWidth="2.5" />
      {validas.map((p, i) => <circle key={i} cx={x(p.medido_em!)} cy={y(p.nivel_m!)} r="2" fill="#236b87"><title>{horario(p.medido_em)} · {medida(p.nivel_m, 'm')}</title></circle>)}
    </svg><p className="chart-period meta"><span>De {horario(serie[0]!.medido_em)}</span><span>Até {horario(serie.at(-1)!.medido_em)}</span></p><p className="meta">Horários de Brasília. Pontos sem nível ou indisponíveis interrompem a linha.</p>
    <details><summary>Consultar valores da série</summary><div className="table-scroll" tabIndex={0} role="region" aria-label={`Valores da série ${estacao.codigo}`}><table><thead><tr><th>Horário</th><th>Nível</th><th>Qualidade</th></tr></thead><tbody>{serie.map((p, i) => <tr key={i}><td>{horario(p.medido_em)}</td><td>{medida(p.nivel_m, 'm')}</td><td>{p.qualidade ?? 'Não informada'}</td></tr>)}</tbody></table></div></details>
  </figure>;
}
