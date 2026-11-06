# Proposal

## Why

NAPMS 2.0 needs to demonstrate its core value: a network access request becomes an explicitly authorized decision and an explainable vendor-neutral policy, independently of current IP addresses. The new repository has approved domain boundaries but no executable product behavior.

## What Changes

- Provide a local HTTP API and Swagger UI for an exact AccessSubject request, a separately authorized ALLOWED/DENIED decision, and selected JSON/CSV policy export.
- Persist immutable traffic semantics, stable Resource/Endpoint identity, requests, authority evidence, decisions and one canonical PolicyRule per exact subject.
- Preserve rules with missing addresses as INCOMPLETE export rows; exclude INACTIVE rules from effective export; support a consistent per-export evaluation.
- Provide explicit, repeatable demo data and server-issued local dev credentials without any initially approved rule.
- Verify the eight approved acceptance cases AC-01..AC-08 in `docs/first-slice.md`.

**Exclusions:** production authentication/OIDC, full catalog CRUD/UI, generic approval workflows, vendor-specific rendering, firewall apply/reconcile, multi-tenancy, topology/NAT, historical as-of export, and migration from NAPMS 1.0. No CLI request-submission interface.

## Capabilities

### New Capabilities

- `local-dev-runtime`: local-only API trust boundary, repeatable demo data and server-controlled test identities.
- `access-requests`: validation and admission of requests for an immutable, deployment-based AccessSubject.
- `access-decisions`: independently authorized terminal ALLOWED/DENIED decisions and canonical PolicyRule lifecycle/provenance.
- `policy-export`: authorization, current effective-policy evaluation and vendor-neutral JSON/CSV projection.

### Modified Capabilities

None; `openspec/specs/` has no existing product capabilities.

## Impact

- New Python/FastAPI service, local SQLite database, HTTP/OpenAPI contracts and pytest suite will be implemented in stage 3B.
- Planning artifacts only in this stage; no application code or source NAPMS 1.0 changes.
- Source of accepted semantics: `docs/product.md`, `docs/domain.md`, `docs/first-slice.md` on NAPMS 2.0 `main` at `ca1b8e19e62597510b07208ba2fb00fa49d075e0`.
- **Success:** local Swagger-accessible request → explicitly authorized decision → READY/INCOMPLETE export, AC-01..AC-08 passing, authority separation preserved, no seeded approval.
