import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Development: `npm run dev` serves http://localhost:5173 and forwards /api to the backend on port 5000.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: 'http://127.0.0.1:5000', changeOrigin: false } } },
  build: { outDir: 'dist', sourcemap: false },
});
