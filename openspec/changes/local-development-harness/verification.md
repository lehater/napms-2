# Local development harness verification

Date: 2026-11-12. Scope: local developer runtime only; no IAM, domain/grant changes, new dependencies or agent-SDLC Harness changes.

Base selected by owner: PR #44 branch `spec/persist-business-process-20261110`, commit `46265906bd66ad9187a8cb7c7ff7d728bd4f0521`. The separate Draft PR targets that branch. Its existing SQLite migration is reused, not duplicated.

## Local gates

- `.venv/bin/python -m pytest -q`: **117 passed** (9.49s), one pre-existing Starlette/httpx deprecation warning. Tests run outside the restricted sandbox for TestClient and loopback.
- `npm run build` in `web`: **passed**, TypeScript and Vite production build.
- `npm run test:semantic` in `web`: **passed**, 16 kinds/seven collections and existing route/provenance sentinels.
- `LD_LIBRARY_PATH=/tmp/napms-browser-libs/usr/lib/x86_64-linux-gnu npm run test:e2e` in `web`: **passed**: two Node proxy tests, 36 browser regressions (38.7s), three harness browser tests (4.9s). The library path supplies existing local Chromium libraries; CI uses its existing Playwright dependency setup. Suites run sequentially to avoid competing for ports 8000/5173.
- `openspec validate --all --strict`: **10 passed**, zero failed.
- `.venv/bin/python -m ruff check --select E4,E7,E9,F src tests`: **passed**.
- `git diff --check`: **passed**.

No API interception is used. The harness fixture invokes the documented Python supervisor against private temporary SQLite/credentials, performs actual stop/start and cleans up. Existing manual-bearer and mock workflows remain green. Expected ECONNREFUSED messages in the old outage test are deliberate.

## Covered behavior and security

- One-command readiness, restart persistence, explicit profile requirement, safe busy-port failure, prerequisite error and child cleanup on failure.
- Shared volatile actor choice; form/data/confirmation reset; Requester creates Process and Request; Decider gets Process 403 but can decide a Request; Requester in decider display mode gets genuine decision 403; Exporter stays independently scoped; anonymous gets genuine FastAPI 401.
- FastAPI bearer resolver and server-held grants are unchanged. No grants are supplied or fabricated by the proxy.
- Browser requests in the harness have no bearer header. Profile responses contain exactly public actor names; real DTO/static response bodies, DOM, URL, browser storage, service logs and production assets exclude test bearer values.
- Private credentials are regular, nonsymlink, private-permission files outside web; Vite FS access outside web is denied. Production assets exclude the profile probe and private configuration key.
- Wrong/null/foreign Origin, missing custom header, cross-site metadata, forged Host, OPTIONS, unknown actor and conflicting bearer are rejected. Direct FastAPI requests with only an actor selector remain 401. Build/preview reject activation flags; normal dev has no working actor-substitution endpoint.

## Findings fixed during implementation

- Port probes originally treated TIME_WAIT as a busy listener: use SO_REUSEADDR so actual stop/start works while active listeners still fail.
- Vite's default CORS answered OPTIONS before the guard: disable CORS in the explicit profile so preflight is rejected. No wildcard CORS was introduced.
- Anonymous UI originally suggested entering a bearer: profile-specific 401/403 messages now refer to actor selection.

## Limits and manual acceptance

This is intentionally trusted local Linux/WSL development, with fixed loopback ports 8000/5173. It is not production authentication and does not defend against malicious local processes or same-origin script compromise. Tokens stay in the Node proxy process; actor selection does not create security authority. No new known P0/P1 defects were found during implementation; owner review remains required.

After installing Python/web dependencies, run `.venv/bin/python -m napms.dev run --profile local-demo` from the repository root. Open the printed URL, choose Requester, create a Process, open it through the list. Choose Decider to observe Process 403; create/decide a Request using the appropriate actors. Choose anonymous for 401. Refresh and choose Requester again; restart the command with the same paths and verify persistence. Ctrl-C stops both services. Full steps and trust boundary are in README.

Implementation commit: `4ac0738ebaa335a44a85d7e327226d374229227a`.

Draft PR: https://github.com/lehater/napms-2/pull/45, targeting PR #44's branch. [Verify 43213560206](https://github.com/lehater/napms-2/actions/runs/43213560206): all four jobs **success** — `application`, `web`, `semantic-contract`, `validate`. This includes CI execution of both proxy unit tests and the real harness E2E in the existing web job.

The evidence-only follow-up commit completes task 3.2. Its final SHA/CI link is recorded in the PR conversation so the file does not attempt to embed its own commit hash. No runtime code changed after the implementation commit. Keep Draft; no merge performed.
