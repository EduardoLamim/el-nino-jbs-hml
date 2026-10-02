import { useEffect, useState } from 'react';
import { Navegacao } from './components/Navegacao';
import { Placeholder, paginas, type Pagina } from './pages/Placeholder';
import { useDados } from './hooks/useDados';
import { rotuloNivel } from './utils/format';
import { ImpactoJbs } from './components/ImpactoJbs';

function paginaAtual(): Pagina | null {
  const rota = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
  return Object.hasOwn(paginas, rota) ? rota as Pagina : null;
}
export default function App() {
  const [pagina, setPagina] = useState(paginaAtual);
  const dados = useDados();
  useEffect(() => {
    const atualizar = () => setPagina(paginaAtual());
    window.addEventListener('hashchange', atualizar);
    return () => window.removeEventListener('hashchange', atualizar);
  }, []);
  return <>
    <header><h1>Monitoramento El Niño — JBS Terminais</h1>
      <p>Fase 05 · Validação funcional de Impacto JBS · Itajaí/SC</p>
      <p>Retrato da última coleta. Consulte os horários e a qualidade das fontes.</p>
      <Navegacao atual={pagina} /></header>
    <main>
      <ImpactoJbs />
      <aside aria-label="Disponibilidade dos dados" aria-live="polite">
        {dados.estado === 'carregando' && <p>Carregando contratos locais…</p>}
        {dados.estado === 'erro' && <p role="alert">{dados.mensagem}</p>}
        {dados.estado === 'carregado' && <>
          <p>Condição ambiental automática: <strong>{rotuloNivel(dados.dados.status.nivel_jbs.nivel)}</strong></p>
          <p>Qualidade: {dados.dados.status.qualidade_monitoramento.estado.replaceAll('_', ' ')}</p>
          <p>Coleta: {dados.dados.status.atualizado_em ?? 'Não disponível'} · Desde: {dados.dados.status.nivel_jbs.desde ?? 'Não reconstruível'}</p>
          <h2>Gatilhos ativos</h2>
          {dados.dados.status.nivel_jbs.gatilhos.length === 0 && <p>Nenhum gatilho de risco conhecido nesta coleta.</p>}
          <ul>{dados.dados.status.nivel_jbs.gatilhos.map(g => <li key={`${g.tipo}-${g.origem}`}>
            {g.descricao} {g.stale && <strong>Última condição conhecida — fonte degradada.</strong>}
            {g.tipo === 'estacao_hidrologica' && <span> Nível: {g.nivel_observado_m ?? '—'} m;
              limite: {g.limite_responsavel_m ?? '—'} m; tendência: {g.tendencia};
              normalização: {g.normalizacao?.leituras_abaixo ?? 0}/3.</span>}
            <span> Horário da fonte: {g.atualizado_em ?? 'Não informado'}. {g.motivo}</span>
          </li>)}</ul>
          <h2>Qualidade do monitoramento</h2>
          <ul>{dados.dados.status.qualidade_monitoramento.problemas.map((problema, i) => <li key={i}>{problema}</li>)}</ul>
        </>}
      </aside>
      {pagina ? <Placeholder pagina={pagina} /> : <section><h2>Página não encontrada</h2><a href="#/dashboard">Voltar ao Dashboard</a></section>}
    </main>
  </>;
}
