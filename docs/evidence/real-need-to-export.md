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

Local final checks (2026-11-13):

| Command | Result |
| --- | --- |
| `openspec validate --all --strict` | 13/13 passed |
| `.venv/bin/python -m pytest -q --cov=napms --cov-report=term-missing` | 165 passed, 93% total; HTTP 100%, use cases 99% |
| `.venv/bin/python -m ruff check --select E4,E7,E9,F src tests` | Passed |
| `npm run build --prefix web` | Typecheck and Vite build passed |
| `npm run test:semantic --prefix web` | Passed: 16 kinds, 7 sections, 2 sentinels |
| `NAPMS_PYTHON=/home/alex/projects/napms-2/.venv/bin/python LD_LIBRARY_PATH=/tmp/napms-browser-libs/usr/lib/x86_64-linux-gnu npm run test:e2e --prefix web` | Proxy 2/2, ordinary Playwright 37/37, local-demo Playwright 9/9 |
| `.venv/bin/python -m ruff check src tests` | Advisory: 55 findings |
| `.venv/bin/python -m ruff format --check src tests` | Advisory: 16 files would be reformatted |
| `.venv/bin/python -m pyright` | Advisory: 34 errors, including unresolved local environment imports and dynamic FastAPI Actor annotations; final CI advisory outcomes recorded in PR |

An initial concurrent pytest/Playwright invocation conflicted on port 5173 in an existing harness unit test. Sequential full pytest passed; no Harness or CI gate was changed. The new options route alone was added to the local-demo proxy allowlist; existing export routes and backend export remain unchanged. Normal Vite gained forwarding for the existing Rule/export APIs to preserve manual-token use.

One local-demo test creates Process/Need via UI, selects Revision and both placements, confirms PENDING, compares the saved Request before/after reload and actual service stop/start against the same DB, verifies zero Decisions/Rules before ALLOWED, then confirms ALLOWED as Decider, checks exactly one Rule, follows the REAL link and switches to Exporter. Both downloads are saved with `download.saveAs`; JSON and CSV fields are compared with persisted Request/Rule facts and each other (evaluation time is evaluated independently per API call). No credentials are recorded.

Additional real browser tests cover independent authorization and both missing export scopes, DENIED, INACTIVE empty/header-only downloads, missing-address INCOMPLETE retention, stale reads/downloads, dependent reset, revoked source authority, empty discovery, delayed options/POST during actor changes, double click and lost POST response without auto retry.

Exact final head and matching Verify run are recorded in Draft PR #55 to avoid self-referential commit hashes here. Tasks 1.1–3.6 and 4.1–4.2 are complete. Task 4.3 remains open because owner acceptance has not been provided; automated success is not owner acceptance. No merge performed.

## Actual downloaded artifacts

The following are raw browser-downloaded files from the synthetic temporary local-demo run, preserved without rewriting fields. They contain only seeded documentation addresses and synthetic IDs, no credentials or confidential infrastructure. INACTIVE/INCOMPLETE variations are separately checked by the automated browser suite.


- [policy-rule-643c503b-ec0f-4b7d-a302-593ce8198f92.json](real-need-to-export-files/policy-rule-643c503b-ec0f-4b7d-a302-593ce8198f92.json), SHA-256 `2ee2346a9005b70a974e5ad1ebd228b7dfe07055ea9c5e9b09fd4d76a97e1384`.

- [policy-rule-643c503b-ec0f-4b7d-a302-593ce8198f92.csv](real-need-to-export-files/policy-rule-643c503b-ec0f-4b7d-a302-593ce8198f92.csv), SHA-256 `2914204daef6b6ea660ae4fc6067a902755a6950de6c50cb9e7926a28903dd3d`.

## Remaining limits

Local demo credentials/scopes are not production IAM or tenant isolation. Catalog CRUD, aggregate export and network application remain out of scope. Offsets are live pages; POST revalidates references transactionally. An uncertain POST may have persisted and requires checking the list. Manual credentials remain memory-only per route; after switching between Process/Request/Rule surfaces, re-enter the appropriate credential if prompted. Existing extended Ruff/format/Pyright findings remain advisory. Owner smoke and acceptance are pending in PR #55.
