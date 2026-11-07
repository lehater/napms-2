# Implementation tasks

Planning only: all tasks remain unchecked in this change.

## 1. Backend: one authorized collection endpoint

- [ ] 1.1 Add focused pytest cases with temporary SQLite: owner-only listing (including second requester), all-visible effective decider, exporter empty collection, historical owner with revoked request grant, revoked/expired decider fallback, no credentials -> 401, no data leakage.
- [ ] 1.2 Implement `Service.list_requests(actor, limit, offset)` using a single SQLite read transaction, server-resolved effective `access.decide` on `demo-policy`, SQL WHERE before paging, `submitted_at DESC,id DESC`, and `limit+1` to determine `hasMore`; reuse `request_view`.
- [ ] 1.3 Add FastAPI `GET /access-requests` with typed strict limit(1..100)/offset(>=0), 200 `{items,limit,offset,hasMore}`, `Cache-Control: no-store`; preserve `POST /access-requests` and UUID detail route. Test default/next/empty/tie ordering and invalid/forged queries -> 422.
- [ ] 1.4 Run existing backend acceptance/security/transaction/runtime pytest to confirm unchanged POST/GET/decision contracts and immutable domain behavior.

## 2. Web: minimal real API user journey

- [ ] 2.1 Scaffold `web/` React + TypeScript + Vite with React Router, Tailwind CSS and only needed shadcn/ui components. Add TypeScript build scripts and documented supported loopback-only Vite startup plus `/access-requests` proxy to the loopback API; no Refine, custom UI library, or extra runtime services.
- [ ] 2.2 Implement typed `fetch` adapter for existing POST, GET-by-ID, POST-decision and new GET-list contracts; include bearer header, `cache: "no-store"`, `error.code` handling, and no token/request logging.
- [ ] 2.3 Implement masked manual token entry, requester/decider display labels, volatile React credential state, and mandatory clearing of token/protected UI data on switch or refresh. Verify no token is present in frontend build, Vite env, persistent browser storage, URL, or tracked files.
- [ ] 2.4 Implement common navigation and request list with loading/empty/error states, status display, detail links, and prev/next pagination against server-filtered results.
- [ ] 2.5 Implement four-UUID creation form (documented public seed example allowed) and detail/status view with nullable decision evidence; POST success navigates to persisted detail; API validation/authority failures do not imply success.
- [ ] 2.6 Add a guarded PENDING-only decision panel with explicit ALLOWED/DENIED confirmation, disabled duplicate submission, POST decision, detail reload after success or 409, and safe 401/403/network error handling.

## 3. Verification, local safety and handoff

- [ ] 3.1 Implement Playwright against real FastAPI, isolated temporary SQLite/demo credentials and Vite on loopback: requester create/list/detail -> decider ALLOWED -> requester sees ALLOWED after reload; second request -> decider DENIED -> requester sees DENIED/null policyRuleId; verify unauthorized requester decision and unrelated list filtering. No intercepted/mock API.
- [ ] 3.2 Add concise README commands for backend/Vite/Playwright, safe manual token entry/switch, and the demo-only loopback boundary; ensure token/redaction policy in logs, screenshots and test output.
- [ ] 3.3 Run frontend typecheck/build, `python -m pytest -q`, Playwright E2E, and `openspec validate --all --strict`; retain the existing CI quality gates and add only the essential frontend/E2E checks. Record reproducible verification evidence in the implementation PR.
