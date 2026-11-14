# Proposal

## Why

After PR #65 the REAL UI can create Applications, Components, Interactions and Deployments, but Resource records and their network addresses still come only from the local-demo seed. Operators cannot create a network Resource from the product, complete its endpoint, and use it as a new deployment destination. The Resource detail currently shows only an ID.

A crucial existing constraint shapes the minimal slice: SQLite v5 has `endpoints.resource_id UNIQUE` (at most one Endpoint per Resource) and the current policy export expects an Endpoint row for each Resource used by a rule. Resource identity must remain independent of its address.

## What Changes

- Add **Ресурсы** to the REAL Sidebar's **Каталоги** group, before **Профили приложений** and **Развёрнутые компоненты**; implement Resource Collection → Create → Detail with Overview / Endpoints tabs and real related links.
- Add a transactional Resource-create API that persists a name and allocates one stable, initially unresolved Endpoint (null address/kind). Expose the current Endpoint as a read model in Resource detail.
- Provide a narrowly scoped operation to assign or replace the Endpoint's current HOST/PREFIX address **without changing Endpoint identity**. Validate canonical IPv4/IPv6 host or prefix input server-side.
- Keep the existing Resource selector in Deployment creation, and make newly created Resources selectable without manual IDs. Existing AccessRequest/PolicyRule identities remain unchanged; current-address export stays a computed projection.
- Reuse `catalog.create` for Resource/Endpoint mutation and `catalog.read` or local-demo shared-read for reads. Do not implicitly grant `access.request` on a new Resource.
- Add one focused local-demo end-to-end check: existing requester-authorized source Resource → **new destination Resource/Endpoint** → Deployment → Need → ALLOWED → ACTIVE PolicyRule → JSON/CSV export with the new destination address.

## Capabilities

### New Capabilities
- `resource-catalog`: Create and browse Resources, resolve the current address of their stable Endpoint, and navigate related REAL records.

### Modified Capabilities
- None of the existing request/decision/Rule contracts. Resource authoring augments existing read-only Resource discovery without changing Deployment identity or authorization.

## Impact / Boundaries

Likely areas: `src/napms/use_cases.py`, `src/napms/http.py`, Resource UI/routes/API, `web/src/navigation.ts`, normative REAL navigation contract and documentation, Vite local-demo allowlist, and focused tests. SQLite v5 already supports a nullable Endpoint address and one Endpoint per Resource, so **no migration is needed for the proposed one-Endpoint slice**.

Out of scope: multiple Endpoints per Resource, Resource deletion/renaming, generic CRUD, Endpoint deletion, inventory imports, discovery of live network state, a new IAM system, or automatic authority grants. An independently created Resource used as **source** without `access.request` remains unauthorized until an explicit future grant-management step. This is intentional; the focused E2E uses an already authorized source and a newly created destination.
