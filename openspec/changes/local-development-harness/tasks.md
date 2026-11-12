# Tasks

## 1. Local runtime and proxy boundary
- [x] 1.1 Implement one-command supervisor reusing init/migration and private credentials; verify safe startup, readiness, busy-port failure and cleanup with runtime tests; document launch/stop.
- [x] 1.2 Implement explicit dev-only actor proxy with fixed upstream, strict request guards and private-file protection; verify actor validation, CSRF/Host/Origin denial and build/preview rejection with executable tests; document the trust boundary.

## 2. Shared actor UI
- [x] 2.1 Add shared volatile actor selector and typed proxy transport across real Process/Request screens, preserving manual mode and mock separation; verify actual-backend actor switching, reset and 401/403 with Playwright.
- [x] 2.2 Verify browser/static/bundle/log credential exclusion and persistence across restart through the one-command runtime; add regression tests and manual acceptance steps.

## 3. Delivery
- [x] 3.1 Run full pytest, TypeScript build, semantic contract, proxy security checks, full Playwright and OpenSpec strict; record commands/results in verification.md.
- [x] 3.2 Commit/push to a separate branch and create a dependent Draft PR targeting PR #44's branch; verify GitHub CI and record SHA/results without merging.
