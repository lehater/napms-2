# Implementation verification

Implementation stays on `spec/persist-business-process-20261110`, PR #44 (Draft).
Accepted base: `bc395e27a070188a6fcc35bf489465efbb79e906`.

## Local results — 2026-11-12

- `.venv/bin/python -m pytest -q`: **113 passed**, 1 existing Starlette/httpx deprecation warning (9.62s). Run outside the restricted sandbox for TestClient/loopback.
- `npm run build` in `web`: **passed**, TypeScript and Vite production build.
- `npm run test:semantic` in `web`: **passed**, 16 kinds, seven collections, routes, provenance and two validator sentinels.
- `LD_LIBRARY_PATH=/tmp/napms-browser-libs/usr/lib/x86_64-linux-gnu npm run test:e2e` in `web`: **35 passed** (38.9s). The library path supplies this machine's existing Chromium system libraries; CI uses Playwright's standard dependency installation.
- `openspec validate --all --strict`: **9 passed**, zero failed.
- `.venv/bin/python -m ruff check --select E4,E7,E9,F src tests`: **passed**.
- `git diff --check`: **passed**.

Browser tests use actual loopback FastAPI and private temporary SQLite/credentials, without API interception. They verify creation, list, detail, re-authentication after refresh, stopping/starting the actual backend, rejected read/write, failed POST, API outage/retry, and absence of mock IDs in real data. Expected ECONNREFUSED diagnostics occur during the deliberate outage. Existing real Request/Decision/Policy and mock journeys pass.

The historical v1 SQL fixture was exported from this repository's accepted main `bc395e2` and contains synthetic IDs only. Migration tests preserve all rows, FK integrity, trigger SQL, grants, historical allowed decision/rule evidence and unknown Process metadata. An injected second-ALTER failure proves first-ALTER and version rollback. Repeat init and reopened database retain the new Process.

## Independent coordinator review

A separate agent reviewed migration, authorization and REAL/MOCK separation. No remaining P0–P3 defects were found after rechecking the final tree. Its initial P3 observation about the overview's mock wording was fixed; its recommendation for a migration rollback regression was implemented. This is an independent agent review, not owner acceptance.

Accepted limitations from the design remain: immutable Processes have no edit/delete flow; historical names may be unknown; real Needs reading is not implemented; authentication/catalog scope is explicitly local demo. These are scope boundaries, not newly accepted exceptions.

Manual owner acceptance is documented in `tasks.md` and README. PR remains Draft; no merge is authorized. Commit SHA and GitHub CI results will be recorded after publication.
