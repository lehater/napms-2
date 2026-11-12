# Design

## Context
See proposal.md. The accepted manual client puts a bearer in page memory. The existing Vite proxy already separates SPA navigation from API calls. PR #44 supplies the Process slice and atomic SQLite migration; the owner selected its branch as this PR's base. Existing Python runtime and tests provide private credentials, strict grants and loopback processes.

## Goals / Non-Goals
One-command local acceptance and nonsecret actor selection, with the backend trust boundary intact. No IAM/session framework, production auth, business-logic changes, new migration, infrastructure service, dependency or agent-SDLC Harness change.

## Decisions
- `napms-dev run --profile local-demo` uses a small Python standard-library supervisor. Check prerequisites/ports, call the existing initializer/migrator, validate credentials, start `serve` plus Vite, poll readiness with deadlines, and terminate both on Ctrl-C or child failure. Existing paths remain configurable; frontend/backend ports stay 5173/8000 to reuse the supported proxy. Avoid a package orchestration dependency.
- Vite mode `local-demo` plus server-only `NAPMS_LOCAL_DEMO=1` explicitly enables a Node-only plugin. Build/preview with activation flags fail closed. Its only profile endpoint returns enabled/allowed actor names, never tokens. Credentials must be a private regular nonsymlink file outside the entire web directory. Restrict Vite FS serving to web root. Do not use VITE_* or generated JS for secrets.
- No cookies or server session: each typed fetch sends `X-NAPMS-Dev: 1` plus `X-NAPMS-Demo-Actor` (requester/decider/exporter/anonymous). Proxy looks up its private immutable startup mapping and adds Authorization only when forwarding to fixed loopback FastAPI. This is explicitly an actor-selection facility for a trusted local developer, not an authentication protocol. Arbitrary local processes and same-origin malicious JS are outside this demo threat boundary.
- Guard before mapping: socket peer loopback; exact `127.0.0.1:5173` Host; custom header mandatory; reject non-same-origin fetch metadata when present; reject any supplied Origin other than `http://127.0.0.1:5173`; unsafe methods require that exact Origin. Reject OPTIONS. No CORS allowance. Requests with no browser metadata must still carry the custom header and exact Origin. GETs from the actual browser may omit Origin only with `Sec-Fetch-Site: same-origin`. This protects both reads and writes against drive-by pages and DNS rebinding. Whitelist API routes/methods, reject conflicting bearer input and unknown actors, no redirect following and safe upstream errors.
- A shared React provider/control is mounted above routes. Profile availability is a compile-time dev-only boolean and runtime profile check. Actor lives only in memory; keyed children remount on switch so data and pending actions are removed. Real Process and Request screens use the selected transport; legacy masked-token UI remains only outside the profile. Existing request display mode is still a hint, independent of the actual actor, allowing wrong-actor 403 checks. MOCK simulation role remains separate and labelled.

## Risks / Trade-offs
- Local actor choice intentionally allows any installed demo actor → explicit opt-in only, loopback + Origin/custom-header guards, existing server grant enforcement; never use for production.
- A private file might be accidentally served → refuse paths inside web, strict FS allow root, HTTP denial tests and bundle/browser/log leak checks.
- Proxy errors may leak forwarded headers → controlled error envelope and no raw request/error logging.
- Stacked PR dependency → target PR #44 branch, retarget only after its acceptance; do not duplicate its schema migration or merge it here.

## Migration Plan
No new schema. The command reuses init-demo and its migration. Restart with the same paths preserves credentials and data. Return to manual `init-demo`/`serve`/Vite commands to disable the convenience profile. Keep this PR Draft pending owner acceptance.

## Research references
- Vite dev middleware lifecycle: https://vite.dev/guide/api-plugin
- Browser CSRF context and non-simple headers: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF
- Fetch metadata semantics: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
