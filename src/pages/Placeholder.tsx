export const paginas = {
  dashboard: { titulo: 'Dashboard', descricao: 'Resumo de apoio à decisão reservado para uma fase futura.' },
  monitoramento: { titulo: 'Monitoramento', descricao: 'Rios, chuva, barragens e previsão serão apresentados em uma fase futura.' },
  mapa: { titulo: 'Mapa', descricao: 'Página reservada. Nenhum mapa ou serviço territorial está integrado.' },
  'plano-de-acao': { titulo: 'Plano de Ação', descricao: 'Conteúdo e responsabilidades aguardam definição do Comitê El Niño.' },
} as const;
export type Pagina = keyof typeof paginas;
export function Placeholder({ pagina }: { pagina: Pagina }) {
  return <section aria-labelledby="pagina-titulo"><h2 id="pagina-titulo">{paginas[pagina].titulo}</h2>
    <p>{paginas[pagina].descricao}</p><p>Placeholder da Fase 01.</p></section>;
}
