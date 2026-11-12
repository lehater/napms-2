# Tasks

## 1. Persistence and domain
- [x] 1.1 Implement minimal SQLite v3 UNIQUE triple and safe atomic v2→v3 migration; preserve v1 upgrade, historical data, immutable triggers, grants and idempotent demo initialization.
- [x] 1.2 Verify historical duplicate handling fails without partial migration; test concurrency and exact unique-index enforcement.
- [x] 1.3 Add a focused service for resolving compatible source-side Interaction options from stored revisions, rejecting conflicting participants/Application and excluding already-used Process/Interaction/source combinations before deterministic pagination.

## 2. REAL API and authority
- [x] 2.1 Implement Process-scoped Need list, compatible option discovery and Need creation with strict typed DTO, bounded paging, safe errors and no-store protected GET.
- [x] 2.2 Enforce separate server-held `business.need.read/create` grants plus parent `business.process.read`, including authorized filtering before paging and validation before INSERT. Re-check all facts in one write transaction.
- [x] 2.3 Cover 401/403/404/409/422, invalid/inconsistent revisions, expired grants, mismatched participant, concurrent duplicate POST and no partial writes.

## 3. Browser vertical slice
- [x] 3.1 Replace the existing BusinessProcess `Потребности` placeholder with a REAL list and minimal create form using typed API options; reuse accepted Shell and actor switch.
- [x] 3.2 Add a real browser E2E create Process → create Need → option disappears for that Process → reload → backend restart. Verify Interaction reuse across Process and direct/replayed duplicate POST returns 409; preserve MOCK isolation.

## 4. Verification and owner acceptance
- [ ] 4.1 Run OpenSpec strict, pytest, web build, full E2E, semantic-contract and CI. Record evidence.
- [ ] 4.2 Independent review of migration, authorization, domain consistency, UI and REAL/MOCK separation. Owner manually accepts the real flow before squash merge.

## Manual acceptance
Start existing one-command local demo, select requester. Create a BusinessProcess. On its `Потребности` tab, select a server-provided source communication and create a Need. Reload and restart backend against the same SQLite to confirm persistence. Confirm that the already-used Interaction is absent from the current Process's creation options; submit a duplicate via an API replay/stale request (including a different Revision if available) and confirm 409. Then create a Need for another Process using the same Interaction. Verify no AccessRequest or Rule appears.
