# Tasks

## 1. Local runtime and durable data

- [x] 1.1 From `design.md D1`, create minimal Python packaging, FastAPI entrypoint, Pydantic DTO boundary and pytest setup; verify service imports and `/openapi.json` exposes planned routes without application decisions in handlers.
- [x] 1.2 From D2/D5, implement SQLite schema, foreign keys, UNIQUE constraints, schema version and per-operation transactions; verify isolated-database tests reject duplicate exact subjects, duplicate Rule subjects and duplicate terminal decisions.
- [x] 1.3 From D3, implement explicit idempotent demo initialization with stable catalog/deployment/Need IDs, no permitted Rule and local 0600 randomly generated credentials; verify fresh and repeat seed tests and no credentials in Git/traces.
- [x] 1.4 From D3, implement server-side bearer resolution, protected operation guard and loopback-only launcher; verify invalid token 401, spoofed grants rejected, `0.0.0.0` launch fails and `/docs` works locally.

## 2. Request admission and immutable subject

- [x] 2.1 From D5 and `access-requests` spec, implement pure domain validation for directed deployments, immutable InteractionRevision and Need consistency; verify invalid role/revision/Need tests and IP-independent subject equality (AC-07).
- [x] 2.2 From D4, implement effective source-only `access.request` admission with recorded grant evidence; verify AC-05 accepts source-only and denies missing source before persistence.
- [x] 2.3 Implement `POST /access-requests` and restricted `GET /access-requests/{requestId}`, storing distinct PENDING requests; verify 201/200 schemas, repeated request distinctness, 403 unrelated reader and absent Rule.

## 3. Permission decisions and canonical Rule

- [x] 3.1 Implement `access.decide` guarded `POST /access-requests/{requestId}/decision` and immutable terminal decision persistence; verify requester cannot decide, DENIED yields no new Rule (AC-03) and repeat decision returns 409.
- [x] 3.2 Implement atomic ALLOWED → canonical ACTIVE Rule creation/reuse and allowance evidence under D2 uniqueness/transaction constraints; verify AC-04 and concurrent requests result in one Rule, with original and subsequent decisions retained.
- [x] 3.3 Implement protected `GET /policy-rules/{ruleId}` and independent Rule ACTIVE/INACTIVE state inspection; verify provenance is readable with both export grants and unchanged through later DENIED or ALLOWED.

## 4. Authorized current-policy materialization

- [x] 4.1 Implement scoped `policy.export` checking for BOTH Rule Resources within the export read transaction; verify AC-06 denies either missing grant without returning policy data.
- [x] 4.2 Implement snapshot-based effective selection and dynamic Endpoint address realization, including INACTIVE exclusion and INCOMPLETE null-address rows; verify AC-02, AC-07, AC-08 via fixture-only address/state changes.
- [x] 4.3 Implement `GET /policy/export` JSON/CSV rendering with fixed schema, provenance, evaluationAt and CSV metadata headers; verify AC-01 READY row, CSV/JSON parity, empty CSV header and null-address CSV cells.
- [x] 4.4 Add concurrent transaction test changing grants, IP and Rule state during export; verify no mixed snapshot or grant/data time-of-check-time-of-use inconsistency under D7. Verify grant validity boundaries use the same evaluationAt (inclusive valid_from, exclusive valid_until), and document that revocations committed after snapshot pinning apply to later exports.

## 5. End-to-end handoff

- [x] 5.1 Run isolated FastAPI TestClient acceptance matrix AC-01..AC-08 from `docs/first-slice.md`, including authorization and forged-input negatives; verify 8/8 cases green, with no preapproved Rule.
- [x] 5.2 Document demo init, loopback launch, bearer entry into Swagger, stable demo IDs, exact API examples and dev-only threat boundary. Warn explicitly against direct public-interface Uvicorn start, Docker port publishing, tunnels and WSL/host forwarding. Verify a fresh clone can reproduce request → ALLOWED → READY export and a separate DENIED.
- [x] 5.3 Add application test job to existing GitHub Actions `Verify` (keep existing strict OpenSpec validation) and run pytest/OpenSpec CI; verify all jobs pass before submitting the stage 3B implementation PR.

## Workflow follow-up

- After stage 3B implementation and owner review, archive this OpenSpec change through the installed archive Skill; do not archive or merge in stage 3A.
