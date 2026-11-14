# Design

## Current model and dependencies

- `resources(id)`, `resource_names(resource_id, name)`, and `endpoints(id, resource_id UNIQUE, address NULL, kind NULL)` already exist in SQLite v5.
- `ResourceEndpoint` has a stable ID, while `address` and `kind` describe its *current* network presence. The physical schema has one Endpoint per Resource; broadening this would also require reworking `_export_rows`.
- `Service._export_rows` assumes source and destination Endpoint rows exist, then reports `READY` only if both addresses are populated; otherwise `INCOMPLETE`. It uses current addresses while the AccessSubject continues to identify Deployments and an exact InteractionRevision.
- PR #65 already provides `GET /resources`, `GET /resources/{resourceId}`, `catalog.read/create` grants, Resource detail, and a Deployment creation selector.

## Decisions

### D1 — Resource creation and stable Endpoint identity

`POST /resources` receives a nonblank Resource name (1–300 characters). In a **single SQLite write transaction**, create: (1) Resource UUID, (2) ResourceName, (3) Endpoint UUID with `address=NULL, kind=NULL`. Return Resource ID and name. A new Resource therefore always owns exactly one stable logical Endpoint, even before a network address is known; this preserves existing export assumptions and supports `INCOMPLETE` without a schema migration.

Existing seeded Resources/Endpoints remain unchanged. Do not introduce a second Endpoint row per Resource or remove `UNIQUE(resource_id)`.

### D2 — Endpoint address as mutable current data

Expose `GET /resources/{resourceId}/endpoint` and `PUT /resources/{resourceId}/endpoint` (body: `{ kind: "HOST" | "PREFIX", address: string }`). The PUT sets/replaces **only** `kind` and `address` in the existing Endpoint row, never its ID or Resource FK. No generic Endpoint update/delete operations. This is a deliberate narrow exception to append-only *identity*: address is a current attribute, not identity.

Validate with standard-library `ipaddress`: `HOST` is one IPv4/IPv6 host address (no subnet suffix); `PREFIX` is a canonical IPv4/IPv6 network prefix (reject host bits set, require explicit CIDR). Reject invalid, empty, mismatched and unsupported inputs with stable API errors. Persist canonical textual values. Do not infer an address from a name and do not treat a DNS hostname as IP input.

`GET /resources/{resourceId}` can be enhanced additively to show Endpoint state, or Resource detail can call the separate endpoint route. Preserve existing `resourceId/name` fields and Resource selector compatibility.

### D3 — Authority and admission remain separate

Resource/Endpoint reads require `catalog.read`, except authenticated `local-demo` shared-read. Resource creation and setting its Endpoint address require `catalog.create` on the existing `demo-catalog` scope, regardless of shared-read. Keep the established request submission check: `access.request` must be valid for the **source** Resource at submission time.

**No automatic new-Resource `access.request`, `policy.export`, or decide grants.** The E2E uses the seeded source Resource already authorized for Requester and a newly created destination Resource. In local-demo shared-read, authorized actors can inspect resulting rules/export; production grant provisioning is a separate task. A newly created source Resource without an explicit grant produces 403, as intended.

### D4 — REAL navigation and UI

Add `/resources` Collection and `/resources/new` creation route. Extend existing `/resources/:resourceId` detail with `Overview` and `Endpoints` tabs; the Endpoints tab displays one stable Endpoint and its current HOST/PREFIX address (or “Адрес не задан”), and includes an authorized form to set/replace it.

Retain `CollectionView`, `DetailView`, `EntityTable`, `Button` and existing UX classes. Link Resource ↔ Deployment as needed; do not load MOCK fixture. Keep Resource selector in Deployment creation connected to the same REAL API and ensure newly created resources appear.

Update `docs/contracts/ux-0-semantic-boundaries.json` `realNavigation.entries`, `docs/ux/real-navigation.md`, semantic checker assertions and old E2E exact Sidebar assertions together. The resulting order is: Business Processes; Resources; Application Profiles; Deployed Components; Access Requests; Policy Rules.

### D5 — Verification and scope discipline

One focused browser scenario on a fresh SQLite DB:
1. Create destination Resource and assign e.g. `198.51.100.20` as HOST; confirm current Endpoint ID is stable.
2. Create or select a compatible Component and deploy it on the new Resource; use the seeded requester-authorized Resource for the source Deployment.
3. Create Need, submit Request, decide ALLOWED, and verify one ACTIVE Rule with the expected source/destination Deployments.
4. Export JSON and CSV: source address remains seeded, destination is `198.51.100.20`, both Endpoint IDs are present, and readiness is `READY`. Verify that address replacement changes the *computed export* but not the Rule/Subject IDs.
5. Negative checks: invalid HOST/PREFIX, unauthorized Endpoint mutation, missing Resource, second Endpoint attempt (not supported), and newly created *source* Resource without request grant → 403 with no Request/Rule.

Use fast backend tests, `npm run test:semantic`, TypeScript typecheck, and the targeted local-demo browser scenario. Do **not** run FULL Verify automatically.

## Risks / Trade-offs

- **One Endpoint per Resource:** a deliberate SQLite v5 limit. Multiple endpoints require a distinct future change with explicit policy-export cardinality rules and a migration.
- **Current address changes after a decision:** this is expected from a computed export; it does not prove actual network reachability, nor rewrite immutable authorization provenance.
- **Missing endpoint in historical/corrupted data:** maintain current assumptions for valid initialized databases and add a focused defensive test for incomplete Resource state; do not widen the scope into general data repair.
- **New Resource cannot automatically be request source:** grant provisioning must remain explicit; do not use Resource creation as an authorization shortcut.

## Rollout / rollback

Planning stage only. When applied, no schema-version increment or data migration is required. Existing seeded Resources and profiles remain intact. Rolling back UI/API leaves newly inserted Resource/Endpoint rows valid in SQLite v5. No existing PolicyRule is deleted or regenerated.
