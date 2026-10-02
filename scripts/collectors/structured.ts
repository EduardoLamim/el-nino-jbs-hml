import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { z } from 'zod';

// Apenas a árvore HTML e JSON embutido; nenhum script é executado.
export function extrairPagina(html: string, secao: string): unknown[] {
  const encontrados: string[] = [];
  function visitar(node: DefaultTreeAdapterMap['node']) {
    if ('attrs' in node && node.attrs.some(a => a.name === 'id' && a.value === 'app')) {
      const atributo = node.attrs.find(a => a.name === 'data-page');
      if (atributo) encontrados.push(atributo.value);
    }
    if ('childNodes' in node) node.childNodes.forEach(visitar);
  }
  visitar(parse(html));
  if (encontrados.length !== 1) throw new Error('Esperado um único #app[data-page].');
  const pagina = z.object({ component: z.literal('Monitoramento'), props: z.object({
    secao: z.literal(secao), municipioId: z.literal(1), estacoes: z.array(z.unknown()).min(1),
  }) }).parse(JSON.parse(encontrados[0]!));
  return pagina.props.estacoes;
}
