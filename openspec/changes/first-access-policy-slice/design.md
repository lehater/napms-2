# Design

## Context

NAPMS 2.0 `main` at `ca1b8e19e62597510b07208ba2fb00fa49d075e0` contains only bootstrap, OpenSpec and approved `docs/product.md`, `docs/domain.md`, `docs/first-slice.md`. No application code, production specs or persistence contract exist. This plan implements the approved eight-case API-first vertical slice, not the full legacy NAPMS.

## Goals / Non-Goals

**Goals:** reliable separation of request admission / permission decision / export authorization; stable domain identity; auditable immutable decisions; one canonical Rule; coherent current-state export; locally reproducible run and domain tests without a web server.

**Non-Goals:** production IAM or remote exposure, generic catalog editing, full policy lifecycle HTTP administration, historical as-of query, migration, vendor device logic, asynchronous workflow or frontend.

## Decisions

### D1 — Small three-layer Python service

Use Python 3.12+ with FastAPI/Pydantic for HTTP/OpenAPI, a small application layer for request/decision/export/inspection use cases, and pure domain functions or dataclasses for identities and invariants. SQLite repository adapters and a dev credential resolver sit at the boundary. Keep one deployable process; use a straightforward feature-based module layout (`domain.py`, `use_cases.py`, `storage.py`, `http.py`, `dev.py`) unless implementation demonstrates need to split. Domain rules are independently unit-testable.

Flow: HTTP validation → server actor resolution → use-case transaction → domain invariants/authority policy → SQLite persistence → DTO/CSV renderer. HTTP handlers cannot decide ALLOWED or derive actor grants from request bodies.

**Alternative rejected:** inherited NAPMS 1.0 Bounded Contexts, repositories per domain concept, microservices, CQRS/event sourcing.

### D2 — SQLite persistence, identity and atomic decisions

Use file-backed SQLite with foreign keys, unique keys and WAL, accessed through a minimal `sqlite3` adapter; no ORM or migrations framework for this first schema. Bootstrap creates schema with a tracked version (`PRAGMA user_version`) and fails safely on unknown versions. Open a fresh connection per use case.

Suggested compact tables: `resources`, `endpoints`, `applications`, `components`, `interaction_revisions`, `deployments`, `processes`, `needs`, `actors`, `grants`, `access_subjects`, `access_requests`, `decisions`, `policy_rules`, `rule_allowances`. Foreign keys link the immutable revisions and evidence. Static catalog records are seeded with stable IDs; newly admitted requests and decisions use UUIDs. `access_subjects` has `UNIQUE(source_deployment_id, destination_deployment_id, interaction_revision_id)`; `policy_rules.subject_id` is UNIQUE; `decisions.request_id` is UNIQUE. Store Rule `originating_decision_id`, state ACTIVE/INACTIVE, and additional ALLOWED decision IDs via `rule_allowances`.

Transaction for decision: `BEGIN IMMEDIATE` → resolve PENDING and decision grant → insert terminal decision → if ALLOWED insert-or-select canonical Rule under uniqueness constraint and associate the decision → commit. Entire operation rolls back on failure. Repeat ALLOWED must be for a **different** pending request, not a second decision on an already terminal request. Existing INACTIVE Rule is never automatically reactivated; test-only fixture can change operational state.

**Alternative rejected:** in-memory dictionaries (lose identity/evidence/restart consistency); PostgreSQL (no first-slice scaling requirement). No production migration claim.

### D3 — Trusted local dev boundary

Provide an explicitly invoked, idempotent `init-demo` maintenance command (not an end-user request CLI) to create schema, stable demo entities, and server-owned grants; it never grants permission/creates Rule. Generate cryptographically random bearer tokens of at least 256 bits for distinct requester/decider/exporter roles and write them to a Git-ignored local `var/dev-credentials.json` with mode 0600. No real secret or reusable demo bearer token goes into Git, examples, Swagger schema or logs; reinitialization preserves credentials unless explicit destructive reset. The server resolves token → actor → grants; clients cannot set actor/grants. Seeded actors are demonstrative, and access to the local secret file confers impersonation power: this is **not** production authentication.

Only supported startup path is a local launcher that enforces `127.0.0.1` or `::1` binding and refuses a non-loopback host; set Swagger UI at `/docs`. Explicitly document that a direct `uvicorn ... --host 0.0.0.0` launch, container port publishing, reverse proxies, tunnels, or WSL/host port forwarding bypass this launcher boundary and can expose demo bearer credentials and policy data. These uses are unsupported: neither Swagger UI nor dev bearer tokens provide production network security. Turn off dev profile outside explicit local mode; do not expose a token issuance, role switch, or seed reset HTTP endpoint. Missing/invalid bearer → 401; authenticated insufficient grants → 403; unknown body fields → 422.

**Alternative rejected:** client-provided `actor_id` header, actor-name dropdown with unrestricted role selection, hard-coded published tokens, external OIDC.

### D4 — Explicit grants and admission semantics

`access.request` is scoped to the source Resource, checked at admission and persisted as `RequestAuthorityEvidence` (actor, source scope, matched grant, checkedAt). No destination grant for submission. `access.decide` is separate and scoped to one fixed `demo-policy` scope for the sole demo policy; only the demo decider gets it. `policy.export` is checked on BOTH the source and destination Resource scopes for the selected Rule, including its details endpoint. All grants have validity window capability (`valid_from`/`valid_until` nullable) evaluated at operation time. Business Need and ownership metadata are never authority.

**Explicit first-slice assumption:** decision authority is policy-wide for this single demo scope, not a source/destination resource grant. This keeps decisions separate from request and export authority and will require a new spec if approval scopes expand.

### D5 — Domain mapping and invariants

Seed: `Resource A/Endpoint A → source Deployment (Component sender)`, `Resource B/Endpoint B → destination Deployment (Component receiver)`, within one `Application`, one directed immutable `InteractionRevision` with one `TrafficClause` (`TCP`, destination port 443), one `BusinessProcess` and `ConnectivityNeed` referencing the interaction. Every Resource has exactly one Endpoint in this demo; multiple Endpoint selection is deferred. Endpoint has nullable current HOST/PREFIX realization; no address enters subject, deployment or Rule identity.

On POST validate references, direction, Application membership, Need/Interaction consistency and exact revision before writing. The request and its authority evidence are historical facts; `decisions` are immutable. DENIED adds no Rule; it does not revoke an earlier ALLOWED. First ALLOWED creates ACTIVE Rule; repeated ALLOWED associates more evidence with existing Rule and never resets INACTIVE. An explicit fixture-only state change tests INACTIVE; a fixture-only address update tests current realization. No public admin CRUD endpoints solely for acceptance tests.

### D6 — Small explicit HTTP contract

All IDs are opaque UUID strings; request DTOs reject unrecognized fields; UTC timestamps use RFC 3339 `Z`. No actor/grant field in mutable input DTOs. Exact paths:

| Route | Input | Success | Authorization |
|---|---|---|---|
| `POST /access-requests` | `{sourceDeploymentId, destinationDeploymentId, interactionRevisionId, connectivityNeedId}` | 201 `{requestId,subjectId,status:"PENDING",submittedAt,requesterActorId,admission:{sourceResourceId,grantId,checkedAt}}` | `access.request` source Resource |
| `GET /access-requests/{requestId}` | path UUID | 200 `{request...,decision:null\|{decisionId,outcome,deciderActorId,decidedAt,policyRuleId?}}` | same requester or granted `access.decide` |
| `POST /access-requests/{requestId}/decision` | `{outcome:"ALLOWED"\|"DENIED"}` | 201 `{decisionId,requestId,outcome,deciderActorId,decidedAt,policyRuleId:null\|UUID}` | `access.decide` demo-policy |
| `GET /policy-rules/{ruleId}` | path UUID | 200 Rule state, subject, originating decision/Need and additional allowances | `policy.export` both Resource scopes |
| `GET /policy/export` | `ruleId=UUID&format=json\|csv` (default json) | 200 JSON `{evaluationAt,selectedRuleId,rows:[...]}` or `text/csv` | `policy.export` both Resource scopes |

JSON row keys: `ruleId,subjectId,sourceResourceId,destinationResourceId,sourceEndpointId,destinationEndpointId,sourceAddress,destinationAddress,ipProtocol,destinationPortStart,destinationPortEnd,readiness,interactionRevisionId,connectivityNeedId,requestId,requesterActorId,decisionId,deciderActorId,evaluationAt`. Also expose `requestSubmittedAt`, `decisionAt`, and `sourceAddressKind`/`destinationAddressKind` (HOST/PREFIX/null). For CSV use these same columns in a fixed documented order; JSON `null` becomes a blank CSV cell. CSV includes `X-Evaluation-At` and `X-Selected-Rule-Id` response headers even for zero data rows; JSON includes those fields in envelope. `GET /policy-rules/{ruleId}` is separate from effective export for inactive explainability.

Errors: 400 for invalid semantic combinations that are well-formed but disallowed, 401 unauthenticated, 403 insufficient authority, 404 absent referenced entity/request/rule, 409 terminal-request conflict, 422 malformed payload/unknown fields/unsupported query parameters; stable `{error:{code,message}}` envelope for use-case errors. All protected operations authenticate before returning sensitive details. For invalid request refs check grant only after resolving source scope, without exposing unauthorized object details. OpenAPI/Swagger supply seed IDs in examples but no bearer tokens.

### D7 — One coherent **current-state** export

`GET /policy/export` selects exactly one `ruleId`. Use a dedicated SQLite read transaction in WAL mode. In order: `BEGIN` → immediately issue a read to pin one committed database snapshot → sample server UTC `evaluationAt` **once, immediately after the pin** → from the **same pinned snapshot** resolve the Rule, both Resource scopes, grants, operational state, Endpoint addresses, traffic and provenance → check all time-dependent grant validity (`valid_from` inclusive, `valid_until` exclusive) and effectiveness against that **single** `evaluationAt` → fully materialize the response → commit/close. Do not open a separate connection or commit between authorization and reading protected data. Use the same algorithm for JSON and CSV.

`evaluationAt` identifies the server's evaluation of the captured **current committed snapshot**, not an externally verifiable database commit time or a historical as-of version key. A write committed immediately after snapshot pinning may be absent even if it precedes the sampled wall-clock timestamp; that is normal snapshot concurrency, not an invitation to combine fresh grant data with stale policy data. An already-started read can finish using grants captured at its snapshot; revocation committed later governs subsequent exports. Never advertise instantaneous revocation or exact historical reconstruction. Do not accept a caller-supplied `evaluationAt`.

Effective = originating ALLOWED + Rule ACTIVE (no additional effective windows in this slice). Missing either Endpoint address yields INCOMPLETE with null address, never absent row. One seeded traffic clause gives one exported row. INACTIVE yields an empty JSON row list or CSV header only. Address changes between requests affect only later export, not Rule/subject/decision IDs. Grant checks and export reading use the **same** snapshot; no external address lookups during a read transaction.

**Alternatives rejected:** serializing multiple independent queries without a transaction, in-memory exports with post-read enrichment, pretending `evaluationAt` is a historical as-of time.

### D8 — Tests and local lifecycle

Unit-test the domain identity/invariants and decision state machine without HTTP. Adapter tests use isolated temporary SQLite databases and deliberate concurrent decisions/updates. FastAPI TestClient integration checks public contracts, authorization failures, zero secret leakage, JSON/CSV parity and AC-01..AC-08 with explicit fresh test fixtures; no live web server required. A documented one-command local launcher plus explicit init-demo prepare SQLite and Swagger demo. CI runs `pytest`, existing OpenSpec strict validation and smoke import/startup checks after stage 3B introduces the code.

## Risks / Trade-offs

- **[P0] Dev token access** → any local user able to read dev credentials can act as each seeded role; file permissions and loopback scope mitigate accidental exposure, never advertise production security.
- **[P0] IP mutation or authority revocation during export** → single pinned SQLite read snapshot + one `evaluationAt` for temporal checks + concurrent update tests prevent torn data/authorization reads. Revocations after snapshot pinning are visible to later exports; strict immediate revocation is not a first-slice guarantee.
- **[P0] Duplicate concurrent approval** → UNIQUE(subject_id), UNIQUE(request_id) and BEGIN IMMEDIATE; rollback on conflict.
- **[P1] Denial after prior allowance** → denial does not revoke pre-existing Rule, which is separately lifecycle-managed.
- **[P1] CSV empty output loses metadata** → send `X-Evaluation-At` and `X-Selected-Rule-Id` headers.
- **[P1] One Endpoint per Resource for demo** → explicit limited fixture, no arbitrary multi-endpoint resolution without future spec.
- **[P1] Schema evolution** → tracked `user_version`, fail on unknown versions; migrations deferred until a real change requires them.

## Migration Plan

Greenfield. Stage 3B installs Python dependencies, initializes a new local SQLite DB and explicit demo data, then starts the supported loopback launcher. Destroying a demo database is opt-in and outside normal startup. Rollback is stopping the service and using an isolated prior dev database; no legacy system migration.

## Open Questions

None blocking stage 3B. Production identity, broader decision scopes, additional Endpoint resolution and historical-as-of support are future changes rather than unspecified first-slice behavior.
