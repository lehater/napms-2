import { defineConfig, type Plugin } from 'vite'
import { localDemoPlugin } from './dev/local-demo'
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
export default defineConfig(({ command, mode, isPreview }) => {
  const requested = mode === 'local-demo' || process.env.NAPMS_LOCAL_DEMO === '1'
  const demo = command === 'serve' && !isPreview && mode === 'local-demo' && process.env.NAPMS_LOCAL_DEMO === '1'
  if (requested && !demo) throw new Error('Local demo requires explicit dev profile; build and preview cannot activate it')
  return {
    plugins: [react(), tailwindcss(), loopbackOnly, ...(demo ? [localDemoPlugin()] : [])],
    define: { __NAPMS_LOCAL_DEMO__: JSON.stringify(demo) },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: '127.0.0.1', port: 5173, strictPort: true,
      cors: demo ? false : undefined,
      fs: { strict: true, allow: [fileURLToPath(new URL('.', import.meta.url))] },
      proxy: {
        '/applications': { target: 'http://127.0.0.1:8000', bypass(req) { if (req.headers.accept?.includes('text/html')) return '/index.html' } },
        '/deployments': { target: 'http://127.0.0.1:8000', bypass(req) { if (req.headers.accept?.includes('text/html')) return '/index.html' } },
        '/resources': { target: 'http://127.0.0.1:8000', bypass(req) { if (req.headers.accept?.includes('text/html')) return '/index.html' } },
        '/business-processes': {
          target: 'http://127.0.0.1:8000',
          bypass(req) { if (req.headers.accept?.includes('text/html')) return '/index.html' },
        },
        '/policy-rules': { target: 'http://127.0.0.1:8000', bypass(req) { if (req.headers.accept?.includes('text/html')) return '/index.html' } },
        '/policy/export': { target: 'http://127.0.0.1:8000' },
        '/access-requests': {
          target: 'http://127.0.0.1:8000',
          // Browser navigation must reach the SPA; fetch requests reach FastAPI.
          bypass(req) { if (req.headers.accept?.includes('text/html')) return '/index.html' },
        },
      },
    },
    preview: { host: '127.0.0.1', port: 5173, strictPort: true },
  }
})
