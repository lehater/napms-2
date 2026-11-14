# Design

## Context

The SQLite v5 schema already has Applications, Components, InteractionRevisions, Deployments, Resources, and display-name tables. An Interaction is represented by the `interaction_id` shared by its revisions; there is no Interaction table. The service owns transactional validation, while `http.py` defines strict DTOs and routes. The REAL web shell has CollectionView, DetailView, and EntityTable, but no application or deployment routes. See proposal.md for motivation and the capability specs for observable behavior.

## Goals / Non-Goals

**Goals:**
- Provide focused transactional create/list/detail use cases and strict HTTP contracts for the catalog entities.
- Keep existing request composition and PolicyRule behavior as the path that consumes new catalog records.
- Keep the change within SQLite v5 and the existing REAL UI component patterns.

**Non-Goals:**
- Add an Interaction table, Resource/Endpoint authoring, edits/deletes, a generic CRUD layer, or a new global identity/visibility model.
- Change AccessRequest admission, decision authority, or canonical PolicyRule behavior.

## Decisions

1. **Use the current records and derive Interaction identity from `interaction_id`.** Creating a directed Interaction inserts one generated interaction ID and its first revision row, after validating that both roles belong to one Application and validating the protocol/port range. The same logical Component may fill both roles; separate ComponentDeployments identify concrete placements later in request composition. Component and Application display names stay in their existing name tables. This preserves the current schema and keeps revisions immutable; a separate Interaction table would duplicate identity without serving the acceptance flow.

2. **Add catalog-specific authorization through the existing grants table.** Mutating catalog routes require `catalog.create` on `demo-catalog`; the local demo seed grants this to its requester actor. Catalog reads use a separate `catalog.read` action outside shared-read local-demo mode. In local-demo shared-read mode, any authenticated actor can read catalogs, but that visibility does not grant catalog creation, `access.request`, or `access.decide`. This avoids borrowing submit/decide grants and adds no IAM schema.

3. **Keep collections bounded and make relationships discoverable.** Use the established `limit`/`offset`/`hasMore` shape and deterministic ordering. Application detail owns Components and Interactions tabs, with revisions shown in their Interaction context. Deployment detail links to its Component, Application, and Resource. Provide only the read endpoints needed to select existing Resources and resolve the linked Resource detail; do not add Resource authoring or a standalone Resource collection screen.

4. **Expose the flows through focused REAL routes and API methods.** Add `/applications` and `/deployments` collection routes with create forms and details. Use the existing Sidebar group ordering and shared CollectionView, DetailView, EntityTable, Button, and Badge components. The API wrappers call real FastAPI endpoints; no fixtures or mock data enter these screens. New rows naturally become available to existing need-options and request-options queries.

5. **Verify the complete flow with one local-demo browser scenario.** On a fresh initialized database, create the profile, Components, Interaction/revision, and two deployments; create a process and Need, submit as requester, decide as decider, then confirm the one ACTIVE Rule and its provenance. Include incompatible relation checks and confirm existing seeded records remain visible. Keep the focused test on supported loopback processes and temporary SQLite, following current Playwright harness conventions.

## Risks / Trade-offs

- **[A new permission action needs provisioning outside local-demo] →** Keep the action and scope explicit (`catalog.create` / `demo-catalog`), seed only the local-demo requester grant, and test a caller without that grant is rejected.
- **[A Resource relation has no existing REAL detail screen] →** Add only a read-only Resource detail target backed by the existing catalog data; do not expand into Resource or Endpoint management.
- **[Concurrent duplicate Component names may race] →** Preserve the existing database uniqueness trigger and translate its integrity failure into a stable client error.
- **[Catalog records may not appear in every Need's options] →** Retain the existing compatibility and direction checks; test the created directed pair through the actual option and request paths.

## Migration Plan

No schema migration is planned. Existing SQLite v5 tables and triggers are sufficient. The implementation adds API/UI code and a local-demo grant seed. Rollback is code rollback; persisted records remain valid under the current schema.
