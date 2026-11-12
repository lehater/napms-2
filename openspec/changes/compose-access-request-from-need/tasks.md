# Tasks

All checkboxes describe **future implementation**, not work performed by this specification PR. Start only after coordinator/owner approval of the proposed contract and a separate implementation instruction. Design contains the API shapes, error precedence and disclosure decision; no general discovery task remains.

## 1. Scoped read options and disclosure

- [ ] 1.1 Append the two Requester `access.options.read` Resource grants in `src/napms/dev.py`; document explicit initialization of existing local v3 data. Verify repeat initialization preserves IDs, credentials, expired grants, existing records and schema v3, and grants nothing new to Decider/Exporter.
- [ ] 1.2 Add the narrow Service options operation using existing business grants and communication consistency checks, with Resource-scoped filtering and one snapshot/time. Add integration tests for multiple Revisions/Deployments, wrong roles/Application, conflicting Interaction revisions, no complete pair and IP-independent eligibility.
- [ ] 1.3 Expose the single strict `access-request-options` route and typed response variants in `http.py`; verify all three kinds, conditional Revision parameter, duplicate/unknown query rejection, UUIDs, limit/offset bounds, huge offsets, stable ordering, filtered `hasMore`, no-store and absence of hidden fields/counts. Update the OpenAPI assertion to the specified additional route.
- [ ] 1.4 Add negative GET tests for unauthenticated and wrong/expired/not-yet-valid grants, real/random Process/Need IDs, wrong-parent Need, hidden destination and stale Revision query. Verify indistinguishable errors/empty pages and snapshot behavior during concurrent grant mutation; document the local-only scope boundary alongside the API.

## 2. Existing POST and persisted Request facts

- [ ] 2.1 Preserve `Service.submit` source-only `access.request` admission with trusted server actor, neutral error precedence, Process derivation and all-revision consistency inside its existing write transaction. Verify a valid direct POST succeeds without any business/disclosure/destination grants, with no prior GET or alternative save endpoint.
- [ ] 2.2 Add paired absent/unauthorized source probes before other lookups, neutral missing destination/Need/Revision probes, source-request revocation GET→POST rejection and read-grant revocation GET restriction with valid POST success tests, unrelated Revision, reversed Deployments, mismatched Application/Need participant and forged-extra-field tests. Verify grant windows, generic error bodies and zero changes to Subject/Request/Decision/Rule/allowance counts after each rejection and after an injected mid-write failure.
- [ ] 2.3 Extend the common Request projection and HTTP DTO with persisted Need/subject; harden unknown/inaccessible Request GET to identical 403 and add no-store to affected responses/errors. Verify POST/list/detail/nested Rule representations agree, old saved rows require no migration, and historical author/Decider reads survive composition-grant expiry without revealing catalog metadata.
- [ ] 2.4 Keep direct submitter fixtures source-only; add read grants only to discovery fixtures and update only specified compatibility assertions (missing source, unknown Request, seed grant count). Preserve and run repeated-request/different-Need same-Subject, ALLOWED reuse, DENIED non-revocation, INACTIVE non-reactivation, concurrent decision and export-authority regressions. Document neutral error changes and residual known-UUID existence/compatibility inference without claiming full concealment or adding POST read prerequisites.

## 3. Existing React composition

- [ ] 3.1 Extend `api.ts` with discriminated options responses and the new Request fields; add selected-Need composition to `Needs.tsx` within the existing Process tab, with three paged selectors, truthful facts, inline summary and explicit confirmation. Verify the typed build and a real browser selection/POST path without UUID inputs or MOCK requests.
- [ ] 3.2 Make `/access-requests/new` a stable entry to REAL Process/Need selection, and render persisted Need/exact subject in existing Request Detail. Verify list/detail navigation, manual credential fallback, unchanged Demo actor/Shell and that Rule IDs do not link into MOCK UI; adapt old UUID-form browser scenarios without dropping their outcome/authorization coverage.
- [ ] 3.3 Add browser checks for empty/loading/error pages, dependent-selection reset, grant-change rejection, double clicks, uncertain POST without auto-retry and actor/context changes during delayed responses. Verify no old protected data, stale confirmation, late navigation or previous-session 401 crosses actor/context boundaries; document the user flow and safe retry behavior.

## 4. Full slice acceptance and evidence

- [ ] 4.1 Add one REAL browser E2E using existing temporary backend/local-demo infrastructure: create Process → create Need → select Revision/source/destination → review/confirm → saved PENDING → reload → actual backend stop/start on the same DB → reopen same Need/subject → switch Demo actor to Decider → ALLOWED. Verify canonical Rule/subject/origin through existing Rule API as Exporter and exactly one Rule in test storage; assert no Decision/Rule before ALLOWED, no mock API, UUID entry or recorded credentials.
- [ ] 4.2 Run `openspec validate --all --strict`, full pytest/coverage, blocking Ruff, web build, semantic contract, proxy and complete Playwright suites; record exact commands and results in implementation evidence. Run/report existing advisory Ruff/format/Pyright separately; do not alter CI or Harness to make checks pass.
- [ ] 4.3 Publish implementation handoff with exact final head SHA and matching Verify run, blocking/advisory outcomes, OpenSpec task status, residual limitations and smoke evidence. Obtain and record owner acceptance of the real smoke in that PR before a separately authorized squash merge; recheck CI after substantive fixes.

## Reproducible owner smoke for the future implementation

1. Start the existing local demo with `napms-dev run --profile local-demo` against the same explicitly initialized local database. Choose **Requester**. Create a new BusinessProcess and open **Потребности**.
2. Create a Need using an available real communication; select that saved Need. Choose a Revision, source Deployment and destination Deployment from the returned options, without entering IDs.
3. Check Need, exact Revision, direction, Deployment/Resource IDs and protocol/ports in the summary. Confirm **Запросить доступ**. The existing Request Detail opens with PENDING and the selected Need/tuple.
4. Record the Request URL, reload and reselect actor if prompted. Stop/restart the backend/local demo against the same database; reopen that URL. Confirm the same PENDING Request, Need, tuple and admission evidence.
5. Switch **Demo actor → Decider**. Open the Request from the existing REAL list and confirm ALLOWED. Check persisted decision and Rule ID. The automated acceptance verifies Rule details through the existing Exporter-authorized backend; no new Rule UI is required.
6. Confirm that ALLOWED is shown as a recorded permission, without claiming working network connectivity. Record owner acceptance and remaining limitations in the implementation PR.

## Workflow follow-up

- This specification-only Draft PR must remain unmerged in this execution. Implementation, acceptance, merge and eventual OpenSpec archive require their own authorized work; no existing change is archived here.
