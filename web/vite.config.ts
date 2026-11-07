import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// Check resolved configuration so CLI --host cannot override the boundary.
const loopbackOnly: Plugin = {
  name: 'loopback-only',
  configResolved(config) {
    for (const server of [config.server, config.preview]) {
      if (server.host !== '127.0.0.1' && server.host !== '::1') {
        throw new Error('Only 127.0.0.1 or ::1 is supported')
      }
    }
  },
}
export default defineConfig({
  plugins: [react(), tailwindcss(), loopbackOnly],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: {
      '/access-requests': {
        target: 'http://127.0.0.1:8000',
        // Browser navigation must reach the SPA; fetch requests reach FastAPI.
        bypass(req) { if (req.headers.accept?.includes('text/html')) return '/index.html' },
      },
    },
  },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
})
