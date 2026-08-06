import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev: serve index.html for /api/event so the React SPA can handle it
const spaFallbackForApiEvent = {
  name: 'spa-fallback-for-api-event',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && req.url.startsWith('/api/event')) {
        req.url = '/index.html';
      }
      next();
    });
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaFallbackForApiEvent],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true
  }
})
