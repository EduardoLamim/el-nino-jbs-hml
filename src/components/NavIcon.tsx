import type { Pagina } from '../pages/Placeholder';
const paths: Record<Pagina, string> = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  monitoramento: 'M3 19h18 M4 14l5-6 5 4 6-8 M4 19v-2 M9 19v-6 M14 19v-3 M20 19V9',
  mapa: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16',
  'plano-de-acao': 'M8 3h8v4H8z M8 5H5v16h14V5h-3 M8 12h8 M8 16h6',
};
export function NavIcon({ page }: { page: Pagina }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d={paths[page]} /></svg>;
}
