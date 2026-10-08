import { useEffect, useState } from 'react';
type Theme = 'light' | 'dark';
function preference(): Theme | null {
  try { const value = localStorage.getItem('jbs-theme'); return value === 'dark' || value === 'light' ? value : null; } catch { return null; }
}
function systemTheme(): Theme { return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
export function ThemeToggle() {
  const [selected, setSelected] = useState<Theme | null>(preference);
  const [system, setSystem] = useState(systemTheme);
  const theme = selected ?? system;
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);
  useEffect(() => { const media = window.matchMedia?.('(prefers-color-scheme: dark)'); const update = () => setSystem(systemTheme()); media?.addEventListener('change', update); return () => media?.removeEventListener('change', update); }, []);
  return <button className="theme-toggle" aria-pressed={theme === 'dark'} aria-label={`Ativar tema ${theme === 'dark' ? 'claro' : 'escuro'}`} title={`Tema ${theme === 'dark' ? 'escuro' : 'claro'}`} onClick={() => {
    const next = theme === 'dark' ? 'light' : 'dark'; setSelected(next); try { localStorage.setItem('jbs-theme', next); } catch { /* Preferência continua nesta aba. */ }
  }}><span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span><span className="sr-only">Alternar tema</span></button>;
}
