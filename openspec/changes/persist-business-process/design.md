# Design: first persistent BusinessProcess vertical slice

## Context
At `main` `bc395e27a070188a6fcc35bf489465efbb79e906`:
- `src/napms/storage.py` has `processes(id TEXT PRIMARY KEY)`, `needs(process_id REFERENCES processes(id))`, schema `user_version=1` and immutable UPDATE/DELETE triggers for processes and their dependent records.
- `src/napms/http.py` exposes real AccessRequest and policy endpoints only; `src/napms/use_cases.py` has no BusinessProcess operations.
- `web/src/prototype/Prototype.tsx` and `Views.tsx` render the seven accepted collections from `web/src/prototype/data.ts`; IDs beginning `mock-` are fictional and must not be stored or used as real API inputs.
- The existing `/access-requests` flow uses explicit loopback-only FastAPI, bearer-to-actor resolution, scoped server-held grants, a Vite proxy, and full real Playwright tests.
- `docs/domain.md` and the NAPMS 1.0 Business Connectivity model distinguish stable BusinessProcess identity, description, organizational responsibility and ConnectivityNeed; organizational responsibility does not give security authority. Existing research Draft PR #38 proposes additional request-composition read paths but has not accepted their security model.

## Goals / Non-goals
**Goal:** a testable operation through the existing UX: create a BusinessProcess, list it, open its detail, and read the same persisted facts after reload/restart; preserve all accepted existing invariants.

**Non-goals:** adding or editing ConnectivityNeed, business-process update/delete/retirement, Process-to-Need real list, catalog-wide discovery, full real request composition, generalized CRUD/data-provider framework, full IAM/visibility UX, import of NAPMS 1.0 schemas, or production authentication.

## Decision 1: single aggregate, minimal fields
Introduce a stable `processId` (server-created UUID) and `name` (required nonblank human-readable string), with nullable `description` and nullable `responsibleOrganization` as descriptive text. The organization's name is not an actor, scope, group membership, or grant. Do not add a fabricated state or a fake `ConnectivityNeed` link. Criticality and separate Organization identity are postponed until requested.

The API returns exactly these properties, including explicit nulls for absent optional fields and for pre-migration records lacking display data. Keep domain validation in application/domain code and HTTP shape/size validation in Pydantic. No client-supplied IDs or grant-related metadata. New rows are immutable in this slice, consistent with v1 triggers; mutation semantics can be specified when an actual editing scenario is accepted.

## Decision 2: transactional v1 → v2 SQLite compatibility
- Newly initialized databases start at `user_version=2` with `processes(id, name, description, responsible_organization)`; existing FK references and immutable triggers remain intact.
- Existing v1 databases gain nullable columns through an atomic migration and update `user_version` in the same committed transaction. Preserve all records, primary keys, Needs, Requests, Decisions, Rule identity, triggers and grants.
- Existing v1 Process rows had no factual names. Leave migrated display metadata NULL and render as `Название не указано`; do not backfill from fictional React fixtures. For new POST, enforce nonblank name at the application boundary.
- `Database.transaction()` accepts the current v2 schema; the existing v1 application behavior keeps working after migration. Unsupported schema versions fail closed.
- Update `init_demo` positional inserts to explicitly named columns; fresh synthetic seed may supply a clearly fictional demo Process name; repeat `init-demo` must preserve user-created processes and not overwrite any record.
- Add focused upgrade tests for v1 databases and FK/trigger integrity. No destructive reset, DB replacement or new migration framework.

## Decision 3: smallest protected API
- `POST /business-processes` accepts `{name, description?, responsibleOrganization?}`; returns 201 with a server-assigned `processId` and stored fields.
- `GET /business-processes` returns `{items, limit, offset, hasMore}`, using whitelisted `limit=1..100` (default 20), nonnegative offset (default 0), deterministic `name ASC, id ASC`, and no total count.
- `GET /business-processes/{processId}` returns the same Process DTO; unknown IDs return 404 after authorization.
- Use the existing Pydantic strict input/error envelope, server-side `Service` with transactions and the same `Authorization: Bearer` trust boundary. No direct SQL access from FastAPI handler.
- For this **explicitly local demo** use two server-held grants `business.process.read` and `business.process.create` scoped to `demo-business`; grant these to the existing demo requester actor, not implicitly to all authenticated actors. Check the exact action/scope at read or write time **before** returning data or performing writes. `access.request`, `access.decide`, `policy.export` do not imply these grants. Caller-provided actor/role/scope selectors are rejected. The demo scope does not define production catalog visibility or authorize discovery of unrelated Resources, Need, Revision or Deployments.
- A successful read is limited to records in this single dev catalog scope; do not add unscoped catalog search or cross-resource metadata exposure. Apply `Cache-Control: no-store` to collection/detail as for protected real reads.

## Decision 4: integrate the existing UI, not a second product
- Use the existing `Shell`, Sidebar grouping, collection/detail layout, breadcrumbs, styling and typed fetch conventions. Add only the Process-specific form and typed API calls; do not pretend a persisted BusinessProcess is a `MockObject`.
- The user-facing real routes are `/business-processes`, `/business-processes/new`, `/business-processes/:processId`. Point the active `Бизнес-процессы` Sidebar entry to the real collection for local functional testing; keep the other six not-yet-integrated collections clearly marked MOCK.
- Retain existing `/prototype/processes` mock fixture route only for compatibility with the validated browser-only access scenario; mark it explicitly as a simulation and do not offer its create operation as real or mix its IDs with the persisted list. This temporary fixture is **not** a second persistent implementation; plan removal once the affected mock journeys are replaced.
- A live BusinessProcess detail can render its Overview. Its `Потребности` tab must say `Серверное чтение потребностей ещё не подключено` (or omit the tab with an equally explicit notice), **not** assert that the Process has no Needs: the v1 seed already links one. Do not invent real Need records.
- Use the existing local transient credential input with explicit mode labeling. Browser refresh clears bearer credentials; after re-entry the server-backed Process is still present. Do not store a token in URL, local/session storage or the bundle.
- Preserve loading, empty, validation and retry states. On failed POST, do not optimistically insert a Process; on success navigate by the server-returned ID. Do not silently fall back to mock data on backend errors.

## Decision 5: verification and boundaries
- pytest: positive create/read/list, required nonblank name, optional metadata, rejected unknown body/query fields, 401/403, grant expiration, no storage on failure, stable ordered pagination, restart persistence, v1-to-v2 upgrade, existing Needs FK and immutability.
- Playwright against actual loopback Vite + FastAPI + fresh private temporary SQLite: login as authorized actor → `Бизнес-процессы` → `Создать` → save → list → detail → reload/re-authenticate → verify → stop/start backend → verify. Check unauthorized login, API outage and mock isolation.
- Existing tests for real Requests, Decisions, Rules, policy export, seven mock collections, semantic contract, accessibility and URL navigation must continue passing. Run OpenSpec strict and GitHub CI.
- Rollout is local-only; no production access, no permissive CORS, no bypass of trusted server grants. PR #38's larger request-context projection and Process/Need relationship are a **later** separate slice using the resulting v2 schema.

## Risks / Trade-offs
- **P0:** catalog metadata exposed to an actor without an effective dedicated server read grant. Mitigate with check-before-read, query denial, negative tests and local-only scope.
- **P1:** v1 migration damages data, triggers or `init-demo` repeatability. Mitigate with transaction and migration regressions.
- **P1:** a live Process is displayed with fictional linked Needs or duplicate active sources. Mitigate with typed API DTO, strong REAL/MOCK labels and a single live collection entry.
- **P2:** immutable Process fields cannot yet be corrected; acceptable until an edit/deactivate business scenario is specified.
- **P2:** v1 rows have no display name; show unknown rather than manufacturing data.
