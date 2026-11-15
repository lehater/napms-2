# Design

## Context

See `proposal.md` for the motivation and capability scope. Current SQLite schema is version 8. `processes` and `needs` have immutable UPDATE/DELETE triggers; `needs` has a unique index on `(process_id, interaction_id, component_id)`. `access_requests.need_id` and policy provenance refer to stable Need rows. Existing local-demo grants are scoped to `demo-business`; shared-read mode permits reads only.

## Goals / Non-Goals

**Goals:**
- Keep Process and Need IDs and all existing references stable during edits and lifecycle transitions.
- Make state changes explicit, independently authorized operations.
- Prevent new Needs and AccessRequests from using archived/retired business context while preserving existing history and Rules.
- Sequence the two execution slices so database versions and shared files have one owner at a time.

**Non-Goals:**
- Physical deletion, cascading changes, automatic Rule withdrawal, production IAM, or new organization/security semantics.
- Rewriting historical Requests, Decisions, Rules, or provenance when business context changes state.

## Decisions

### Process fields and lifecycle

- Keep `processId` immutable. `name`, `description`, and `responsibleOrganization` are editable; `name` remains nonblank. `responsibleOrganization` is descriptive and grants no authority.
- Add `status: ACTIVE | ARCHIVED`, initially `ACTIVE`. Archiving does not change child Need states or historical records. Restoring an archived Process makes it eligible for new Needs and requests again, subject to each Need's own state.
- An archived Process remains readable and appears with its status in collection and detail views.

### Need identity, basis, and lifecycle

- Keep `connectivityNeedId`, `processId`, `interactionId`, and source `componentId` immutable. Changing Interaction or participant means creating a distinct Need.
- Add editable `businessBasis` (1–10,000 characters). New Needs require a nonblank basis; existing rows migrate to `NULL` because no factual basis is available to backfill. Historical `NULL` remains valid until corrected, but users cannot clear a basis once supplied.
- Add `status: ACTIVE | RETIRED`, initially `ACTIVE`. Retiring a Need preserves its unique tuple. Reusing the same tuple requires an explicit transition of that same Need back to `ACTIVE`; creating a second row for the tuple returns 409, including while the original is retired.
- A Need may be restored only while its parent Process is `ACTIVE`. A retired Need and an archived Process both block new AccessRequests. Archiving a Process does not automatically retire its Needs.

### Deletion and history

- Do not expose physical DELETE for Process or Need and do not add delete grants. Archive/retire are the supported lifecycle operations.
- Existing Requests, Decisions, Rules, justifications, and provenance retain their IDs and references. Lifecycle transitions never rewrite or automatically withdraw a Rule. A client must be told that existing access remains governed by its current Rule lifecycle.

### HTTP and authorization

- Keep read and create grants independent. Add scoped `business.process.update`, `business.process.lifecycle`, `business.need.update`, and `business.need.lifecycle` actions; each operation also requires the corresponding Process/Need read authority as applicable. No write authority follows from shared-read mode or `responsibleOrganization`.
- Use `PATCH /business-processes/{processId}` for descriptive Process fields and `PATCH /business-processes/{processId}/lifecycle` with `{status}` for state. Use nested `GET` and `PATCH /business-processes/{processId}/needs/{connectivityNeedId}` for Need detail and basis, plus nested `PATCH .../lifecycle` for state.
- State endpoints accept only the lifecycle status; repeating the current status is an idempotent success. A Need lifecycle operation checks that the Need belongs to the URL Process. Unknown or mismatched IDs return 404.
- Preserve the existing error envelope: 401 unauthenticated, 403 insufficient authority, 404 unknown/mismatched resource, 409 lifecycle/unique-tuple conflict, and 422 invalid or unsupported input. A lifecycle conflict does not mutate storage.
- Request submission continues to require source-resource `access.request`. After authorization and reference resolution, it rejects an archived Process or retired Need with 409 before inserting a request. Existing requests remain retrievable under their existing visibility rules.

### WebUI

- Process collection and detail show status; detail offers edit and lifecycle controls with explicit confirmation and a clear explanation that existing Needs and access history remain.
- Need rows link to a stable deep-link detail view containing its Process, Interaction, participant, basis, status, and related Requests. Request composition starts from Need detail. Retired Needs and archived Processes cannot start a new request.
- Forms keep loading, validation, 401/403/404/409, retry, and save states. After a successful mutation, reload from the REAL API; never fall back to MOCK data.

### Shared-file and migration boundary

Implement #110 first, then #108, with each change merged before starting the next:

1. #110 owns schema migration v8 → v9 for Process status and the Process API/UI lifecycle. It also gates Need creation and new request submission on Process status. Existing Processes migrate to `ACTIVE`.
2. #108 depends on #110 and owns schema migration v9 → v10 for Need basis/status, Need detail/update/lifecycle, and the Need-specific request gate. Existing Needs migrate to `business_basis = NULL`, `status = ACTIVE`.

This lets both changes edit shared storage/service/HTTP/client modules sequentially without overlapping migrations or incompatible schema assumptions. Each migration is transactional, preserves IDs/FKs/unique index/history, and installs only targeted triggers allowing the specified columns to change; all identity columns and unrelated records remain immutable. Rollback is by restoring a database backup, not by a destructive reverse migration.

### Alternatives considered

- **Delete only unused rows:** rejected because the contract would need to define “used” across evolving provenance relations and still creates two deletion semantics; lifecycle states preserve stable links uniformly.
- **Recreate retired Need:** rejected because the persisted unique triple prevents it and changing IDs would fragment historical references; explicit restoration keeps one auditable identity.
- **Implement both slices in parallel:** rejected because schema versions, request admission, shared Python modules, typed client, and Process/Need UI overlap.

## Risks / Trade-offs

- [Archived Process with active Needs may look contradictory] → Preserve Need status as its own fact, display the parent status on Need detail, and block new requests using the parent gate.
- [Restoring a Need may surprise users because old requests still point to it] → Use an explicit confirmation and show related request history before restoring.
- [No physical deletion may retain mistaken records] → Permit corrections to descriptive fields and lifecycle status while preserving provenance.
- [The sequential dependency delays #108 until #110 is integrated] → Keep #110's migration and API changes minimal and publish the dependency in the execution issue.

## Migration Plan

1. Capture the accepted requirements in the delta specs and validate them strictly.
2. Implement and integrate #110 against schema v8, upgrading existing databases atomically to v9 and defaulting Process status to `ACTIVE`.
3. After #110 is merged, implement #108 against v9, upgrading to v10 and defaulting Need status to `ACTIVE` and basis to `NULL`.
4. Verify fresh database initialization and upgrades from v8 through v9/v10, preserving all business IDs, unique Need tuples, FK integrity, request history, and Rules.

## Open Questions

None for the lifecycle contract. `businessBasis` is required for new Needs; only pre-migration records may retain `NULL`. Input validation follows the existing strict and bounded-text conventions.
