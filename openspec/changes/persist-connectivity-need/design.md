# Design: minimal persistent ConnectivityNeed slice

## Context and accepted decisions
Domain baseline: `main@362f79fc5ca638edaf8da613ea19ae0635cc79db` (PR #38); current `main` incorporates CI-only PR #48 (`71598f2db50c3e122e059093f714df98e9787417`). SQLite v2 has `needs(id,process_id,interaction_id,component_id)`, with FKs to Process and Component but no FK to Interaction and no UNIQUE triple. `interaction_revisions` contains `interaction_id`, `application_id`, source/destination components and protocol/ports; there is no persisted Interaction table. The real Process detail has a Needs placeholder.

Owner-approved scope:
- One Need belongs to one Process; a Process can have many distinct Needs.
- Interaction identity is reusable by Needs of multiple Processes.
- The participant is the **source Component** only for this slice.
- `(process_id,interaction_id,component_id)` is unique.
- `businessBasis`, `ACTIVE/RETIRED`, destination-initiated Needs and Need editing are postponed.

## Decision 1: thin API, no standalone Interaction CRUD
- `GET /business-processes/{processId}/needs?limit=20&offset=0`: authorized stable list `{items,limit,offset,hasMore}` with items `{connectivityNeedId,processId,interactionId,componentId}`, deterministic by Need ID.
- `GET /business-processes/{processId}/need-options?limit=20&offset=0`: authorized, filtered compatible Revision selectors, with **already-covered `(Process,Interaction,source Component)` combinations excluded**. Use `{items,limit,offset,hasMore}`; each item may expose only `interactionRevisionId,interactionId,applicationId,sourceComponentId,destinationComponentId,ipProtocol,destinationPortStart,destinationPortEnd`. Sort deterministically by `(interactionId,interactionRevisionId)` after consistency, authorization and duplicate filtering, **before** pagination; no unrelated Resource/Deployment/addresses, global totals or inferred display labels. The UI may group consistent revisions of one Interaction for readability but MUST not imply each Revision is a separately creatable Need.
- `POST /business-processes/{processId}/needs`: strict `{interactionRevisionId: UUID}`, no client-supplied Need ID, actor, grants, Interaction or Component; 201 with minimal persisted Need DTO.
- UUID input is strictly validated. GET paging: limit 1..100, offset >=0. Reject extra query/body fields. Auth first, process lookup after; never leak unknown vs unauthorized details.
- The chosen Revision resolves the stable Interaction and source Component but is **not persisted** on Need; traffic/ports are Revision facts, not Need facts. Do not create an AccessRequest.

## Decision 2: DB guarantees local uniqueness, domain validates cross-context consistency
- Add `UNIQUE INDEX` on `needs(process_id, interaction_id, component_id)` and bump `user_version` to 3. Fresh DBs include the index; existing v2 DBs migrate inside a transaction, failing atomically with a clear diagnostic if historical duplicates exist. Never silently delete/alter old Needs.
- Preserve existing FKs, immutable records, grants, Requests/Decisions/Rules, and repeated `init-demo`. Verify v1→v2→v3 and fresh v3 paths. Code accessing initialized DB must accept only supported current schema.
- In one server write transaction: resolve and authorize actor; authorize parent Process; verify Revision and source/destination Component presence, their shared Application, Revision's Application, and consistent source/destination/Application for **all** revisions with the same Interaction ID; then INSERT with server UUID. Fail closed for nonexistent, incompatible or ambiguous choices, without partial insert.
- Map SQLite UNIQUE violation on this specific index to HTTP 409, including concurrent repeated POST and selecting another Revision of the same Interaction. Even if option discovery hides used combinations, POST must reject stale selections and direct/replayed calls. Do not conflate unrelated DB integrity failures with 409.
- `needs.component_id` already references `components` across domain boundaries in the monolith. Do not add a new FK to a nonexistent Interaction table or cross-context SQL triggers: use explicit domain/application validation over the existing single SQLite snapshot. The unique triple belongs to the Business Connectivity aggregate.

## Decision 3: narrow local-demo authority and disclosure
- Proposed explicit server-held actions: `business.need.read` (list), `business.need.create` (option read + create), both scope `demo-business`; require existing `business.process.read` on associated operations. Grant only the necessary existing demo requester actor.
- Retrieve trusted actor from existing bearer/local-demo proxy, never from a field. Evaluate grants and input compatibility in the backend; authorized GET filters choices **before** pagination and sends no protected global counts. No user-controlled visibility selector.
- Existing `business.process.create/read`, `access.request`, `access.decide`, `policy.export` never imply the new actions. Local-demo scope is not production catalog-read policy.
- Checks for unauthorized/expired credentials, invalid process and revision, inconsistent components, and extra fields must prevent disclosure/INSERT. Use existing error envelope and no-store protected GET.

## Decision 4: existing REAL UI, no MOCK involvement
- Use the existing BusinessProcess detail `Потребности` tab, shared Shell, typed client, actor switch and status handling.
- Read and display only persisted Need DTOs; fetch only server-authorized compatible **unused** options for create. Already-created Need remains in the read list and is not offered for a second creation. Never create Need with synthetic `mock-*` IDs. User sees source/destination technical roles and actual protocol/port range only as selection hints; no fabricated Interaction labels or Need status.
- POST then re-fetch list; reloading page or restarting backend re-fetches persisted state. On actor switch clear protected content. For 409 show a clear duplicate message; errors never fall back to MOCK.
- Keep independent existing mock simulation only as regression reference, not mandatory manual acceptance.

## Verification and trade-offs
- pytest: v2→v3 duplicate preflight and atomic rollback, old-record preservation, v1 migration, fresh v3, triggers and seed idempotency; valid and invalid domain associations; duplicate/concurrent POST, permission expiry and distinct action grants; 401/403/404/409/422, safe query disclosure.
- Playwright: create Process → select a real compatible Revision → create Need → already-used Interaction is no longer an option for this Process → reload → backend restart → same Need; separate Process reuses same Interaction; wrong actor fails. Test duplicate 409 through a stale/replayed API call or controlled concurrent requests, not by requiring the UI to present an invalid option. No mocked API.
- Existing Request/Decision/Policy and UI suites pass unchanged.
- Known limitation: without `businessBasis` and lifecycle, Need is a stable link rather than complete logical ERD entity; source-only authorization/selection is deliberate. Production read visibility needs its own later contract.
