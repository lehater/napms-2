# REAL Need → selected policy export implementation

Base: `fd0fde956936514b638cbcde22ce5deed2619c21`, fetched from origin/main.
Change: `compose-access-request-from-need` (17 tasks).

## Implementation plan

| Stage | Components | Result | Verification |
| --- | --- | --- | --- |
| Backend | dev.py, use_cases.py, http.py | Scoped options, source-only transactional admission, persisted Request facts | Integration security, snapshot, atomicity and regression tests |
| Composition | api.ts, Needs.tsx, ComposeRequest.tsx, App.tsx | Need → exact Revision/Deployments → summary and confirmed PENDING | Typed build and real browser tests |
| Selected policy | PolicyRule.tsx, api.ts, existing proxy routes | REAL Rule inspection, authenticated raw-byte JSON/CSV downloads | Independent Exporter, saved files and negative/state checks |
| Verification | pytest, existing web suites | Restart persistence and boundary coverage | Strict OpenSpec, coverage, Ruff core, semantic, proxy, full Playwright; advisory checks separately |
| Handoff | This evidence and Draft PR | Exact head/CI, task status and owner smoke | Final Verify run; owner acceptance remains an external prerequisite to merge |

## Local upgrade and authority boundary

Run the existing explicit `napms-dev init-demo` with the existing database and private credentials paths before starting the updated client/backend. It appends two Resource-scoped Requester `access.options.read` grants. Schema remains v3; seed does not renew expired grants or replace credentials or identities. Decider and Exporter gain no grants.

The `demo-business` scope covers synthetic local data, not production tenant isolation. Options require both business read grants and Resource disclosure; source also requires `access.request`. Direct POST retains only source `access.request`, without prior GET or destination/business/disclosure prerequisites. Missing source and unauthorized source produce identical 403. Unknown and inaccessible Request GET produce identical 403. Other missing references return neutral 404 and incompatible tuples generic 400. Authorized known-UUID submission retains a residual existence/compatibility inference; this implementation does not claim complete catalog concealment.

## Owner smoke

1. Explicitly initialize existing demo data; run `napms-dev run --profile local-demo`.
2. Select Requester, create a BusinessProcess, open Потребности, create a Need and click its row.
3. Choose Revision, Source Deployment and Destination Deployment. Review traffic, Component/Resource IDs and Need/tuple, check confirmation and submit.
4. Record Request URL. Reload; select Requester and verify the same PENDING Need/subject. Restart backend against the same DB; reopen and verify again.
5. Switch to Decider, confirm ALLOWED, open PolicyRule REAL. The Decider sees 403 without export rights.
6. Switch to Exporter on the same Rule URL. Inspect ACTIVE, subject and provenance, download JSON and CSV and open the actual files. Check Rule ID, TCP/443, provenance, evaluationAt and READY/INCOMPLETE. ALLOWED does not prove network reachability.
7. Record owner acceptance in the implementation PR. No merge is authorized by this execution.

On a network-uncertain request submission the UI does not retry automatically: check the REAL request list before intentionally creating another independent request. Changing actor/context invalidates selection and confirmation.

## Verification results

Pending final verification. Exact head and matching CI are recorded in the PR handoff to avoid self-referential commit hashes in this file.
