import { paginas, type Pagina } from '../pages/Placeholder';
export function Navegacao({ atual }: { atual: Pagina | null }) {
  return <nav aria-label="Navegação principal">{(Object.keys(paginas) as Pagina[]).map(pagina =>
    <a key={pagina} href={`#/${pagina}`} aria-current={atual === pagina ? 'page' : undefined}>
      {paginas[pagina].titulo}</a>)}</nav>;
}
