# Proposal

## Why

The accepted first product slice provides a real FastAPI/SQLite request-to-decision workflow, but users can operate it only through Swagger UI. Its HTTP API lacks request listing. A narrow browser interface is needed to validate the real user journey before expanding administrative features.

## What Changes

- Add authenticated `GET /access-requests` with server-enforced visibility matching the existing single-request authorization rule, deterministic ordering, and minimal bounded pagination.
- Add a local React + TypeScript + Vite web client with shadcn/ui and Tailwind CSS: request list, new-request form, detail/status view, and ALLOWED/DENIED action.
- Connect the client to existing FastAPI endpoints through a same-origin local development proxy; use real SQLite persistence and existing demo actor credentials.
- Cover a full browser E2E scenario plus negative authorization and API failure paths with Playwright and backend tests.
- Preserve the current backend HTTP contracts, immutable decisions, authority evidence, and local-only trust boundary.

**Out of scope:** catalogue CRUD/discovery APIs, Dashboard/Devices/Racks/IPAM, policy export UI, IAM/OIDC, credential issuance or refresh, production deployment, Tauri, Storybook, MCP server, custom component library, generic workflow, or changes to the SDLC Harness.

## Capabilities

### New Capabilities

- `access-requests-web-ui`: browser-based local request creation, listing, inspection, decision, and error handling.

### Modified Capabilities

- `access-requests`: an authenticated, visibility-scoped collection endpoint.
- `local-dev-runtime`: a loopback browser client and manual, in-memory demo credential switching.

Existing `access-decisions` contracts and rules remain unchanged.

## Impact

- **Backend (implementation stage only):** `src/napms/http.py`, `src/napms/use_cases.py`, and HTTP/security tests. No schema migration is expected; existing `access_requests`, `decisions`, and `grants` tables suffice.
- **Frontend (implementation stage only):** a small `web/` Vite application, generated shadcn/ui components, a typed REST adapter, and Playwright E2E tests.
- **Dependencies:** React, TypeScript, Vite, React Router, Tailwind CSS, selected shadcn/ui components, Playwright for E2E. Refine is deliberately deferred: three pages for one resource do not yet demonstrate a benefit that offsets its data-provider/resource abstraction. Reevaluate after a second distinct resource or material CRUD duplication.
- **Acceptance:** local browser can create a PENDING request, show it in a scoped list, open it, switch to an authorized decider, commit ALLOWED or DENIED, and see the persisted terminal state after reload. No mocks in the final test.
- **Baseline:** GitHub `main` commit `41606c8824bc1b8cf346fc5f86db516a731da682`; accepted capabilities under `openspec/specs/`, existing `AGENTS.md` and `docs/first-slice.md`.

This change contains planning artifacts only. Product implementation, merge, and archive require separate authorization.
