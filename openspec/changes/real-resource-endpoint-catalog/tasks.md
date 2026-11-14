# Tasks

## 1. Backend Resource / Endpoint API

- [x] 1.1 Add transactional `POST /resources` with strict Resource name input and a single auto-created unresolved Endpoint. Reuse SQLite v5 and existing Resource-name data. Cover atomicity, missing/invalid name, one Endpoint per Resource, and invalid actor.
- [x] 1.2 Add `GET /resources/{id}/endpoint` and focused `PUT /resources/{id}/endpoint` to set/replace current IP address and kind without changing Endpoint/Resource IDs; validate HOST vs PREFIX with `ipaddress`, IPv4/IPv6 and canonical CIDR. Cover invalid inputs/403/404.
- [x] 1.3 Preserve current resource reads, deployment selection, admission and Rule/Export behavior. Verify `INCOMPLETE` for a new unresolved Endpoint, then `READY` with a valid address; no implicit new-Resource authority grants.

## 2. REAL Resources UI

- [x] 2.1 Add Resources Sidebar entry and `/resources` REAL collection and `/resources/new` creation, reusing the established REAL UI components and existing API patterns.
- [x] 2.2 Extend `/resources/:resourceId` with Overview / Endpoints tabs, showing the stable Endpoint and current address plus an authorized address assignment form. Link related Deployments; Resource picker in Deployment creation must show newly created Resources without manual IDs.
- [x] 2.3 Synchronize REAL navigation JSON contract, `docs/ux/real-navigation.md`, semantic checker and exact browser Sidebar assertions for **six** links / three groups; retain prototype isolation, resize, responsive checks and direct route behavior.

## 3. End-to-end acceptance and limited checks

- [x] 3.1 Focused backend tests for existing seeded Resources, Resource+Endpoint atomic creation, stable Endpoint identity and address changes, address normalization, invalid HOST/PREFIX, authority checks and negative cases.
- [x] 3.2 One focused local-demo Playwright journey from a **seeded authorized source** to a **new destination Resource + Endpoint** → Deployment → Need → AccessRequest → ALLOWED → ACTIVE PolicyRule, then JSON/CSV export with `READY` and correct endpoint/address. Check unknown address → `INCOMPLETE`, and no automatic `access.request` grant for newly created sources.
- [x] 3.3 Run only targeted backend/TypeScript/semantic/Playwright verification, `openspec validate --all --strict` and `git diff --check`. Inspect one actual desktop render. Do not launch FULL Verify. Report results, limitations and new PR SHA; do not merge without owner acceptance.
