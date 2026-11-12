// Node-only Vite plugin. Never import this module from src/.
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { resolve, relative, isAbsolute } from 'node:path'
import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

export const actors = ['anonymous', 'requester', 'decider', 'exporter'] as const
const origin = 'http://127.0.0.1:5173'
const uuid = '[0-9a-fA-F-]{36}'
const paths = [
  { pattern: new RegExp(`^/business-processes/${uuid}/needs/${uuid}/access-request-options$`), methods: ['GET'] },
  { pattern: new RegExp(`^/business-processes/${uuid}/needs$`), methods: ['GET', 'POST'] },
  { pattern: new RegExp(`^/business-processes/${uuid}/need-options$`), methods: ['GET'] },
  { pattern: new RegExp(`^/business-processes(?:/${uuid})?$`), methods: ['GET', 'POST'] },
  { pattern: /^\/access-requests$/, methods: ['GET', 'POST'] },
  { pattern: new RegExp(`^/access-requests/${uuid}$`), methods: ['GET'] },
  { pattern: new RegExp(`^/access-requests/${uuid}/decision$`), methods: ['POST'] },
  { pattern: new RegExp(`^/policy-rules/${uuid}$`), methods: ['GET'] },
  { pattern: /^\/policy\/export$/, methods: ['GET'] },
]
export function privateCredentials(path: string, web: string): Record<string, { token: string }> {
  const file = lstatSync(path)
  const rel = relative(realpathSync(web), realpathSync(path))
  if (!file.isFile() || file.isSymbolicLink() || (file.mode & 0o077) || (!rel.startsWith('..' + '/') && !isAbsolute(rel))) {
    throw new Error('Use a private regular credentials file (0600) outside web')
  }
  const data = JSON.parse(readFileSync(path, 'utf8'))
  for (const actor of actors.slice(1)) {
    if (typeof data[actor]?.token !== 'string' || !/^[A-Za-z0-9_-]{32,}$/.test(data[actor].token)) throw new Error('Invalid demo credentials')
  }
  return data
}
export function trustedRequest(req: IncomingMessage): boolean {
  const h = req.headers
  const peer = req.socket.remoteAddress
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer ?? '') || h.host !== '127.0.0.1:5173' || h['x-napms-dev'] !== '1') return false
  if (h['sec-fetch-site'] && h['sec-fetch-site'] !== 'same-origin') return false
  if (h.origin !== undefined && h.origin !== origin) return false
  if (req.method !== 'GET' || !h['sec-fetch-site']) return h.origin === origin
  return h['sec-fetch-site'] === 'same-origin'
}
function fail(res: ServerResponse, status: number, code: string) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify({ error: { code, message: 'Local demo proxy rejected or could not complete the request' } }))
}
export function localDemoPlugin(): Plugin {
  let tokens: Record<string, { token: string }>
  return {
    name: 'napms-local-demo',
    configResolved(config) {
      if (config.command !== 'serve' || config.mode !== 'local-demo' || process.env.NAPMS_LOCAL_DEMO !== '1') throw new Error('Local demo is available only in the explicit development server profile')
      try { tokens = privateCredentials(resolve(process.env.NAPMS_CREDENTIALS_FILE ?? '../var/dev-credentials.json'), config.root) }
      catch { throw new Error('Cannot load local demo credentials: use a private regular file (0600) outside web') }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        const devPath = path.startsWith('/__napms_dev')
        const apiPath = /^\/(business-processes|access-requests|policy-rules|policy)(\/|$)/.test(path)
        if (!devPath && !apiPath) return next()
        // SPA documents are never credential-substituted.
        if (!devPath && req.method === 'GET' && req.headers.accept?.includes('text/html')) return next()
        if (!trustedRequest(req) || req.method === 'OPTIONS') return fail(res, 403, 'DEV_ORIGIN_REJECTED')
        if (devPath) {
          if (path !== '/__napms_dev/profile' || req.method !== 'GET' || req.url?.includes('?')) return fail(res, 404, 'NOT_FOUND')
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          return res.end(JSON.stringify({ enabled: true, actors }))
        }
        if (!paths.some(p => p.pattern.test(path) && p.methods.includes(req.method ?? ''))) return fail(res, 404, 'NOT_FOUND')
        const actor = req.headers['x-napms-demo-actor']
        if (typeof actor !== 'string' || !actors.includes(actor as typeof actors[number]) || req.headers.authorization) return fail(res, 422, 'INVALID_DEMO_ACTOR')
        // Reconstruct headers; client selector, Origin and cookies never reach FastAPI.
        const headers: Record<string, string> = { Accept: 'application/json' }
        if (actor !== 'anonymous') headers.Authorization = `Bearer ${tokens[actor].token}`
        if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']
        const upstream = httpRequest({ hostname: '127.0.0.1', port: 8000, path: req.url, method: req.method, headers, timeout: 5000 }, incoming => {
          const responseHeaders: Record<string, string> = { 'Cache-Control': 'no-store' }
          for (const key of ['content-type', 'www-authenticate']) {
            const value = incoming.headers[key]; if (typeof value === 'string') responseHeaders[key] = value
          }
          res.writeHead(incoming.statusCode ?? 502, responseHeaders)
          incoming.pipe(res)
          incoming.on('error', () => res.destroy())
        })
        upstream.on('timeout', () => upstream.destroy())
        upstream.on('error', () => { if (!res.headersSent) fail(res, 502, 'DEV_API_UNAVAILABLE'); else res.destroy() })
        req.on('aborted', () => upstream.destroy())
        req.pipe(upstream)
      })
    },
  }
}
