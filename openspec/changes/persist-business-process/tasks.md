# Tasks

## 1. Prepare safe BusinessProcess persistence
- [x] 1.1 Implement schema v2 and atomic v1 → v2 migration for descriptive Process metadata; preserve FKs, immutable triggers and all historical rows.
- [x] 1.2 Update named-column demo inserts, explicit dedicated read/create grants and repeat-init behavior without changing or recreating existing demo IDs.

## 2. Domain/application/API
- [x] 2.1 Add narrowly scoped Process create/list/get service operations and nonblank-name validation; no generic repository/CRUD framework.
- [x] 2.2 Add strict Pydantic DTOs and protected POST/list/detail routes, bounded deterministic paging and safe errors; do not change existing request/decision/export APIs.
- [x] 2.3 Add pytest for happy path, 401/403/404/422, independent read/create grants, historical v1 upgrade, restart, invalid input and no unintended writes.

## 3. Integrate the accepted interface
- [x] 3.1 Reuse the existing seven-collection shell and view style to expose a single **REAL** BusinessProcess collection, creation form and detail via a typed API client. Keep transient credential handling and mark unrelated collections/mock scenario truthfully.
- [x] 3.2 Preserve the mock Need → Request → Rule fixture workflow in its explicit demonstration context without mixing IDs or claiming the real Process has no Needs.
- [x] 3.3 Add Playwright against actual FastAPI/SQLite for create → list → detail → refresh/re-authentication → backend restart, negative authorization and API failure; ensure existing browser tests remain green.

## 4. Delivery gates
- [ ] 4.1 Run Python suite, TypeScript build, semantic-contract checks, full Playwright, OpenSpec strict and GitHub CI; record exact command results and commit SHA.
- [x] 4.2 Independent coordinator review of migration, authorization and REAL/MOCK source separation; provide manual UI acceptance steps. Keep PR Draft; merge only after owner's explicit acceptance.

## Acceptance script for the owner
1. Start the documented local dev profile with the current SQLite file and authenticate with the server-issued demo requester credential.
2. Open `Бизнес-процессы` → `Создать бизнес-процесс`; provide a name, description and responsible organization; save.
3. Return to `Бизнес-процессы`; locate the Process by name and open its detail.
4. Refresh the browser; re-enter the local credential if needed; verify the same values.
5. Restart FastAPI without resetting or recreating SQLite, refresh/re-authenticate and verify the Process is still present.
6. Verify the `Потребности` area does not claim an empty real relationship while no real Needs read path exists.
