import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { basePages, validarAmbientePublico } from './scripts/automation/pages-config';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  validarAmbientePublico(env, process.env.REQUIRE_PUBLIC_CONFIG === 'true');
  return { plugins: [react()], base: mode === 'pages' ? basePages() : './', build: { manifest: true } };
});
