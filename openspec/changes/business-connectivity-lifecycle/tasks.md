# Tasks

## 1. Agree and capture the contract

- [x] 1.1 Record the owner's Process/Need state transitions, restoration, and no-physical-delete decisions in `design.md`; verify each choice is stated as a normative behavior in the relevant delta spec.
- [x] 1.2 Record the owner's required nonblank basis for new Needs and historical `NULL` migration exception; verify the create, read, update, and migration behavior is consistent across design and spec.
- [x] 1.3 Define authorization, HTTP outcomes, history preservation, UI states, and request-admission gates; verify every normative requirement has a WHEN/THEN scenario.

## 2. Prepare executor boundaries

- [x] 2.1 Define the sequential v8 → v9 → v10 migration boundary and shared-file ownership in `design.md`; verify the sequence matches the current schema version 8 and the overlapping implementation modules.
- [x] 2.2 Prepare separate #110 and #108 file lists, focused test targets, dependency order, and REAL SQLite smoke scenarios below; verify the handoff excludes implementation from this contract task.

## 3. Validate the OpenSpec contract

- [x] 3.1 Run `openspec validate --all --strict` and resolve any errors or warnings; verify the change's proposal, design, all three delta specs, and this task list are valid.

## Workflow follow-up

The following are execution inputs for #110 and #108. They are not tasks to execute in this contract change. Start #110 first; start #108 only after #110 is merged and schema v9 is accepted.

- **#110 — BusinessProcess.** Own v8 → v9 in `src/napms/storage.py`; targeted Process update trigger; `src/napms/use_cases.py`, `src/napms/http.py`, and `src/napms/dev.py` for edit/lifecycle, independent grants, and archived-parent gates; `web/src/BusinessProcesses.tsx` and `web/src/api.ts` for REAL edit/archive/restore; focused tests in `tests/test_business_processes.py`, `tests/test_connectivity_needs.py`, and `tests/test_acceptance.py`; one REAL browser scenario in `web/e2e/business-processes.spec.ts`.
- **#108 — ConnectivityNeed.** Depend on #110; own v9 → v10 in `src/napms/storage.py`; targeted Need update trigger; `src/napms/use_cases.py`, `src/napms/http.py`, and `src/napms/dev.py` for required basis, detail/update/lifecycle, grants, and retired-Need request gate; `web/src/Needs.tsx`, `web/src/BusinessProcesses.tsx`, `web/src/main.tsx`, and `web/src/api.ts` for Need deep links, detail, and request navigation; focused tests in `tests/test_connectivity_needs.py`, `tests/test_request_composition.py`, and `tests/test_acceptance.py`; extend the REAL browser scenario in `web/e2e/business-processes.spec.ts`.
- **#110 smoke:** with REAL loopback API/WebUI and SQLite, create a Process and Need, edit all Process description fields, archive the Process, verify IDs/Need/history remain and new Need/request attempts return 409, restore it, reload/restart the backend, and verify the same IDs and values.
- **#108 smoke:** create a Need with a required basis, open its direct URL, edit the basis, create and retain a Request, retire the Need, verify a new Request returns 409 while old Request/Decision/Rule links remain, restore the same Need ID, reload/restart, and verify the unique tuple still blocks duplicate creation with 409.
