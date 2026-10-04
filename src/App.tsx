import { lazy, Suspense, useEffect, useState } from 'react';
import { Navegacao } from './components/Navegacao';
import { paginas, type Pagina } from './pages/Placeholder';
import { useDados } from './hooks/useDados';
import { PainelOperacional } from './components/Operational';
import { Dashboard } from './pages/Dashboard';
import { Monitoramento, secoes, type SecaoMonitoramento } from './pages/Monitoramento';
import { CompactOperational } from './components/CompactOperational';
import { ActionPlan } from './pages/ActionPlan';
const TerritoryMapPage = lazy(() => import('./pages/TerritoryMap').then(m => ({ default: m.TerritoryMapPage })));
import type { EstadoImpacto } from './domain/impact';
import logo from './assets/jbs-terminais-branco.png';

function rotaAtual() {
  const [pagina = 'dashboard', secao, ...resto] = (window.location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
  const valida = Object.hasOwn(paginas, pagina) && resto.length === 0 && (!secao || (pagina === 'monitoramento' && Object.hasOwn(secoes, secao)));
  return { pagina: valida ? pagina as Pagina : null, secao: (secao ?? 'rios') as SecaoMonitoramento };
}
export default function App() {
  const [rota, setRota] = useState(rotaAtual);
  const dados = useDados();
  const [impacto, setImpacto] = useState<EstadoImpacto>({ dado: null, qualidade: 'desconhecido', confirmado_em: null, realtime: 'reconectando' });
  useEffect(() => {
    const atualizar = () => setRota(rotaAtual());
    window.addEventListener('hashchange', atualizar);
    return () => window.removeEventListener('hashchange', atualizar);
  }, []);
  const carregado = dados.estado === 'carregado' ? dados.dados : null;
  return <>
    <a className="skip-link" href="#conteudo" onClick={e => { e.preventDefault(); document.getElementById('conteudo')?.focus(); }}>Ir para o conteúdo</a>
    <header className="app-header"><div className="brand"><img className="brand-logo" src={logo} alt="JBS Terminais" width="120" height="69" /><div><p className="eyebrow">Itajaí · Santa Catarina</p><h1>Monitoramento El Niño</h1></div></div><Navegacao atual={rota.pagina} /></header>
    <main id="conteudo" tabIndex={-1}>
      {rota.pagina && rota.pagina !== 'dashboard' && <CompactOperational status={carregado?.status} impacto={impacto} />}
      <p className="snapshot-note">Retrato da última coleta disponível. Consulte os horários e a qualidade das fontes.</p>
      {dados.estado === 'carregando' && <p role="status">Carregando dados…</p>}
      {dados.estado === 'erro' && <p className="card" role="alert">{dados.mensagem}</p>}
      {/* Mantém a mesma assinatura/instância de Impacto JBS ao navegar. */}
      <div hidden={rota.pagina !== 'dashboard'}><PainelOperacional status={carregado?.status} onEstado={setImpacto} />
        {carregado && <Dashboard status={carregado.status} territorio={carregado.territorio} />}</div>
      {rota.pagina === 'monitoramento' && carregado && <Monitoramento status={carregado.status} secao={rota.secao} />}
      {rota.pagina === 'mapa' && carregado && <Suspense fallback={<p role="status">Carregando mapa…</p>}><TerritoryMapPage status={carregado.status} territorio={carregado.territorio} /></Suspense>}
      {rota.pagina === 'plano-de-acao' && <ActionPlan status={carregado?.status} territorio={carregado?.territorio} impacto={impacto} />}
      {!rota.pagina && <section className="card"><h2>Página não encontrada</h2><a href="#/dashboard">Voltar ao Dashboard</a></section>}
    </main><footer>JBS Terminais · Apoio à decisão do Comitê El Niño <span>Horários de Brasília</span></footer>
  </>;
}
