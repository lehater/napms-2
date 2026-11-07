# Design: local access-request Web UI

## Context and constraints

Current `main` has `POST /access-requests`, `GET /access-requests/{requestId}`, and `POST /access-requests/{requestId}/decision`; it has **no** collection route. `AccessInput` contains four UUIDs (`sourceDeploymentId`, `destinationDeploymentId`, `interactionRevisionId`, `connectivityNeedId`). The create endpoint returns 201 `AccessRequest`; details return 200 `AccessRequest`; decision returns 201 `Decision`. The single-request response has `requestId`, `subjectId`, `status` (`PENDING|ALLOWED|DENIED`), `submittedAt`, `requesterActorId`, `admission`, and nullable `decision`. Decisions include outcome, decider, time, and nullable policyRuleId.

`create_app(db, credentials)` authenticates `Authorization: Bearer <token>` to a server-owned actor. `Service.request(actor,id)` permits the submitting actor (even if their original request grant later expires) or an actor with an **effective** `access.decide` grant on `demo-policy`. Unauthorized nonowners receive 403; bad/missing credentials 401; unknown IDs 404. `Service.decide` checks that grant and rejects a second decision with 409. Admission on POST checks the effective `access.request` grant on the **source** Resource. SQLite stores immutable requests/decisions and server-side grants. Response validation uses strict Pydantic models and standardized `{"error":{"code":"...","message":"..."}}` for failures.

The demo initializer writes private `var/dev-credentials.json` (mode 0600) with distinct requester, decider, and exporter tokens; `DEMO_REQUEST` contains stable public UUIDs. No login, actor-introspection, catalogue, or credential-distribution endpoint exists. The supported backend launcher binds only loopback. New UI must not weaken this boundary.

## Goals / non-goals

**Goal:** one reproducible real-browser path from request admission through independently authorized terminal decision and confirmed persistence.

**Non-goals:** generic resource framework, catalogue browsing, rich dashboard, production auth, actor-role management, workflow orchestration, database redesign, and policy export screen.

## Decision 1: one collection read model backed by existing SQLite

Add `GET /access-requests`. The collection returns the **existing** `AccessRequest` representation for each item, including nullable `decision`, rather than a second projection. The result shape is:

```json
{
  "items": [],
  "limit": 20,
  "offset": 0,
  "hasMore": false
}
```

The optional, whitelisted query parameters are `limit` (integer 1..100, default 20) and `offset` (integer >=0, default 0). Unknown/invalid query parameters yield 422 `INVALID_INPUT`, as with existing strict HTTP handling. Successful reads return 200; missing/invalid bearer returns 401. An empty visible set returns 200 with empty `items`; it does not enumerate inaccessible IDs or counts. Sort by `submitted_at DESC, id DESC` so equal timestamps are deterministic; fetch at most `limit+1` authorized rows to compute `hasMore`. Offset pages are not a frozen multi-request snapshot; concurrent inserts can move items between pages, an accepted limitation of local V1. No arbitrary filters, total count, search, or sorting parameters.

Authorization is defined by **existing** individual-read semantics, evaluated server-side within the list read transaction at one server UTC instant:
- If the authenticated actor currently has an effective `access.decide` grant for `demo-policy`, return all requests.
- Otherwise, return only requests where `access_requests.actor_id == authenticated_actor`, even if the actor's former `access.request` grant has since expired.
- An actor with neither the grant nor owned requests receives an empty list, not another actor's data.
- Never accept `actorId`, `role`, `scope`, `grants`, or ownership selectors from the client; such query parameters are 422. Credential resolution and grant checks precede data exposure.

Use a parameterized SQLite query scoped **before** LIMIT/OFFSET (not SQL pagination followed by Python filtering). Read the selected request rows and decision projections in the same read transaction, applying one time sample to the effective-grant check. A new Pydantic list envelope is sufficient; no DB migration or redefinition of `AccessRequest`. The route is registered as a static collection path alongside the existing UUID detail route, without changing either legacy route.

## Decision 2: intentionally small frontend without Refine

Use `web/` as a single Vite React/TypeScript app, React Router for stable page URLs, Tailwind CSS, and only the shadcn/ui primitives required for this slice (e.g. Button, Input, Label, Table, Badge, Card, Alert; native accessible controls when sufficient). Generated shadcn/ui source belongs to the app, not a separate design-system package. No visual-builder/MCP requirement.

A small typed `api.ts` encapsulates `fetch`, bearer header, JSON parsing, the existing `error.code` envelope, and all four endpoints; no Refine data provider is needed for one resource. Pages use explicit loading/error/empty/success states and reload from the API after writes. No mock API in the deliverable. Refine's resource registry, data-provider contract, and extra integration would increase initial surface without measurable reuse; reconsider if the next resource introduces significant duplicated CRUD/navigation/form code.

Routes:
- `/access-requests`: table with request ID, submission time, requester actor, status, detail link; previous/next page using backend `limit/offset/hasMore`. Show an explicit empty state.
- `/access-requests/new`: four labeled UUID inputs, optionally prefilled using the documented public demo sample; submit via `POST /access-requests`. On 201 navigate to the returned request detail. Client validation checks required UUID syntax; backend remains authoritative on domain semantics and grants.
- `/access-requests/:requestId`: show IDs, admission evidence, PENDING/ALLOWED/DENIED, decision outcome/actor/time/policyRuleId when present. Only while PENDING, show ALLOWED and DENIED actions in the **decider-selected UX mode**, with confirmation prior to irreversible POST; after 201 re-fetch GET detail and list when navigated back. Denied means decision `policyRuleId=null`; it does not revoke prior rules.
- Minimal common layout/sidebar: Requests and New request, visible selected demo mode and clear/switch control. Default route redirects to the list. Accessible labels and button disabled/loading states are mandatory.

The selected UI mode is a **local hint**, not a trusted role claim. The token's server-side actor/grants always decide access; mismatched modes must surface 403 safely. No new `/me` endpoint is required. Do not infer a user's permissions from actor IDs or public sample IDs. A previous response must not remain visible after credential change.

## Decision 3: dev-only credential boundary and same-origin API

Browser prompts the operator to choose a *label* (`requester` or `decider`) and paste the corresponding token from the pre-existing local 0600 credentials file into a masked field. Keep token **only in React in-memory state** of the current page lifetime; do not put it in source, Vite env variables (`VITE_*`), URL, localStorage, sessionStorage, cookies, telemetry, request/error logs, screenshots, or Git. Switching the selected mode or clearing credentials immediately clears token, request/decision data, pending actions, and caches. Refresh requires re-entry. The exporter role is not used in this UI slice.

Serve Vite on `127.0.0.1:5173` only; dev proxy `/access-requests` to `http://127.0.0.1:8000` (FastAPI supported launcher also loopback). Browser uses relative URLs, no API host/token in the bundle and no CORS wildcard or production-facing reverse proxy. Disallow non-loopback Vite bind settings in the documented supported command/config; document that port publishing, remote forwarding, tunnels, and other exposure are unsupported. The local proxy is a development tool, not an MCP server or production deployment pattern.

Pass `cache: "no-store"` on protected UI requests; the new GET list responds with `Cache-Control: no-store`. Do not log authorization headers or raw request bodies. Browser dev tools can expose in-memory bearer credentials to the local operator: this is a deliberate demo-only trust boundary, not production IAM.

## Decision 4: errors, reload and irreversible decision

The REST adapter handles:
- 401: clear credential/data and request re-entry without exposing token;
- 403: permission-denied message, no unauthorized data or optimistic decision;
- 400/422: human-readable validation message with no unsupported actor/grant fields;
- 404: missing/inaccessible detail message; never substitute data from list/cache;
- 409: terminal conflict message, re-fetch details, disable further decisions;
- network/5xx: retry affordance without duplicate automatic POST.
All screens render loading, empty (where applicable), and API-error states. Double-submit controls are disabled while POST is in flight; a second decision cannot override the stored decision. Status after decision always comes from server GET, not an invented client state.

## Decision 5: smallest falsifiable verification

Backend pytest uses temporary SQLite and existing `create_app` fixtures: visibility for owner/decider/exporter and two requesters, decider grant expiration/revocation, independent detail/list consistency, deterministic ties and pagination (including limit bounds/unknown query), 401/403/422, denial/allowing transitions, and persistence after reopening SQLite. Existing acceptance tests and HTTP contracts must remain green.

Playwright exercises **actual** local FastAPI + SQLite + Vite (no route mocks or network interception of API). Its setup initializes isolated temp DB/credentials using existing `napms-dev init-demo`, starts the supported backend and loopback Vite server, and reads local demo tokens for test input without checking them into the repository or printing/screenshotting them. Test requester login → create → list → detail PENDING; switch to decider → list/detail → ALLOWED → detail ALLOWED; switch requester → detail ALLOWED; create another request → decider DENIED → requester sees DENIED with no rule; refresh and check persistence; negative requester decision/unauthorized listing and error/empty states. Keep test credentials outside tracked files and ensure clean process teardown. Prefer one browser project and no separate orchestrator.

Existing CI's `application` and `validate` jobs stay intact. In the implementation stage, add only minimal frontend build/typecheck and Playwright verification necessary to establish the vertical slice; do not change Harness/SDLC experiments.

## Tradeoffs / risks

- **P0:** collection query must scope by trusted actor/grants **before** pagination; a UI-only filter exposes data.
- **P0:** token handling or non-loopback dev proxy can leak dev credentials. In-memory-only tokens and loopback-only servers are accepted local mitigations.
- **P1:** UI mode lacks server-verified capability introspection; a mislabeled token gets a safe 403, not inferred authority.
- **P1:** public seed UUIDs allow a form without additional catalog APIs but do not create a generic request editor. Deliberately defer lookup APIs.
- **P2:** offset pagination can drift under concurrent inserts. Revisit cursor pagination only when real multi-user scale justifies it.
- **P2:** Refine omission may lead to later adapter work. This is acceptable until multiple resources establish reusable needs.

## Owner decisions

No blocking product decision is necessary for this local-only slice. Before implementation, owner may explicitly override (a) deferring Refine, or (b) manual in-memory demo tokens. Either override changes scope and security assumptions and should be reviewed in the Draft PR. Production deployment/authentication remains a separate change.
