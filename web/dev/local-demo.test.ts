import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage } from 'node:http'
import { privateCredentials, trustedRequest } from './local-demo.ts'

function request(headers: Record<string, string> = {}, method = 'GET', peer = '127.0.0.1') {
  return { headers: { host: '127.0.0.1:5173', 'x-napms-dev': '1', origin: 'http://127.0.0.1:5173', ...headers }, method, socket: { remoteAddress: peer } } as IncomingMessage
}
test('request guard permits exact same-origin context and rejects origin/CSRF/rebinding attempts', () => {
  assert.equal(trustedRequest(request()), true)
  assert.equal(trustedRequest(request({}, 'POST')), true)
  assert.equal(trustedRequest(request({ origin: '', 'sec-fetch-site': 'same-origin' })), false)
  for (const headers of [{ origin: 'null' }, { origin: 'http://evil.example' }, { origin: 'http://127.0.0.1:5174' },
    { host: 'evil.example:5173' }, { 'x-napms-dev': '' }, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }]) {
    assert.equal(trustedRequest(request(headers)), false)
    assert.equal(trustedRequest(request(headers, 'POST')), false)
  }
  assert.equal(trustedRequest(request({}, 'GET', '192.0.2.1')), false)
  const get = request({ 'sec-fetch-site': 'same-origin' }); delete get.headers.origin
  assert.equal(trustedRequest(get), true)
  get.method = 'POST'; assert.equal(trustedRequest(get), false)
  delete get.headers['sec-fetch-site']; assert.equal(trustedRequest(get), false)
})
test('private credential file is validated before use and cannot be inside web', () => {
  const dir = mkdtempSync(join(tmpdir(), 'napms-proxy-unit-')), web = join(dir, 'web'), file = join(dir, 'credentials.json')
  mkdirSync(web)
  const data = JSON.stringify(Object.fromEntries(['requester', 'decider', 'exporter'].map(actor => [actor, { token: 'a'.repeat(43) }])))
  try {
    writeFileSync(file, data, { mode: 0o600 })
    assert.deepEqual(Object.keys(privateCredentials(file, web)), ['requester', 'decider', 'exporter'])
    chmodSync(file, 0o644); assert.throws(() => privateCredentials(file, web)); chmodSync(file, 0o600)
    const linked = join(dir, 'linked.json'); symlinkSync(file, linked); assert.throws(() => privateCredentials(linked, web))
    const exposed = join(web, 'credentials.json'); writeFileSync(exposed, data, { mode: 0o600 }); assert.throws(() => privateCredentials(exposed, web))
    writeFileSync(file, '{}'); assert.throws(() => privateCredentials(file, web))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
