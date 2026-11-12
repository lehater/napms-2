# Tasks — implementation handoff

## 1. Unify the application layout and routes
- [x] 1.1 Refactor the existing Shell as the one shared layout across real Process, real Request and explicitly MOCK prototype routes. Avoid nested shells and duplicate navigation structures.
- [x] 1.2 Define root redirect, seven-item Sidebar route mapping, active state, breadcrumbs, unknown-path handling and preservation of `/prototype/*` deep links.

## 2. Integrate actor and page composition
- [x] 2.1 Move local-demo real Demo actor selection into the common topbar; suppress redundant real Request Demo mode. Preserve distinct, clearly labelled MOCK role and manual bearer compatibility.
- [x] 2.2 Ensure actor changes synchronously clear prior protected data, forms and pending actions, including in-flight reads; keep server grants and proxy unchanged.
- [x] 2.3 Bring real BusinessProcess collection/detail and AccessRequest collection/detail/decision into the baseline composition with consistent controls, tabs, error/empty/loading states and Russian UI labels on touched screens.

## 3. Acceptance/regression
- [x] 3.1 Add one real end-to-end scenario root → Process → Request → Decision → reload/return, with actual FastAPI/SQLite and one real actor selector.
- [x] 3.2 Preserve NID-first MOCK scenario, seven-collection semantic contract, existing security/authorization checks and direct URLs. Cover baseline desktop sizes and narrow viewport without horizontal overflow.
- [x] 3.3 Run Python pytest, TypeScript/build, semantic gate, complete Playwright/proxy/harness tests, OpenSpec strict and GitHub CI. Record exact results and any P0–P3 issues.

## 4. Delivery and owner acceptance
- [x] 4.1 Update README and local-dev start URL so `/` is the unambiguous supported app entrypoint; record source-truth differences between REAL and MOCK.
- [x] 4.2 Push implementation to this branch, keep Draft, provide commit SHA, CI link and owner-visible acceptance script. Do not merge this or dependent PRs.

## Manual acceptance
1. Run `.venv/bin/python -m napms.dev run --profile local-demo` and open `http://127.0.0.1:5173/`.
2. Confirm one fluid UI with three groups and seven collections; Process and Request are REAL, other five MOCK. Confirm no alternative Request sidebar/header.
3. Select Requester once in the common topbar. Create a Process; open its card, `Обзор` and `Потребности` tabs. The Needs tab must explicitly say reading is unavailable, not empty.
4. Use `Заявки на доступ` from the same Sidebar. Create a real Request; switch to Decider in the same topbar and confirm ALLOWED; verify server status.
5. Return to Process, refresh, select Requester and verify it persists; use direct URL for previously created Request.
6. Enter the explicit MOCK Simulation and complete Need → Request → Decision → Rule; make sure no mock IDs appear in real collections.
7. Use Anonymous (401) and an insufficiently granted actor (403), then Ctrl-C; both local services stop. No duplicate real Demo mode.


## Implementation verification — 2026-11-12

- `python -m pytest -q --cov=napms --cov-report=term-missing`: **117 passed**, **90% total coverage**, one existing Starlette/httpx deprecation warning. The initial sandbox coverage invocation stalled without output and was interrupted; the unrestricted repeat completed in 11.62 s.
- `npm run build --prefix web`: TypeScript and production build **PASS**.
- `npm run test:semantic --prefix web`: **PASS**, 16 kinds, 7 collections, routes, DENIED provenance and 2 validator sentinels.
- `npm run test:e2e --prefix web` (loopback services/Chromium outside the restricted sandbox): **2 proxy + 37 browser + 5 harness tests passed**. Earlier integration failures were corrected before this complete passing run.
- The uninterrupted REAL acceptance test uses actual FastAPI/SQLite: root → Process create/detail/tabs → Request create → actor switch/cancel confirmation → ALLOWED → reload and backend restart → persisted Process and Request. This is navigation between independent real collections, not a fabricated Process→Need association.
- Additional regressions cover delayed real Process/Request responses, a delayed old manual-session 401, server pagination through detail/tabs/breadcrumb/reload, independent remembered REAL actor and MOCK role, unknown paths, browser bearer absence and production/profile security.
- Loaded REAL collection/detail/create views have no horizontal document overflow at **1920×1080, 1440×900, 2560×1440 and 390×844**. Existing Sidebar width/resize and NID-first MOCK suites pass. Local visual captures of both real collections/details were inspected; capture data were temporary and contained no browser credentials.
- `python -m ruff check --select E4,E7,E9,F src tests`: **PASS**.
- `openspec validate --all --strict`: **11 passed, 0 failed**. `git diff --check`: **PASS**.
- GitHub CI for implementation commit `e0521c223ee584bbeae70ed79060591a4aaf3a18`: **all four jobs passed** (`application`, `validate`, `semantic-contract`, `web`), [Verify #146](https://github.com/lehater/napms-2/actions/runs/43220360168). Advisory outcomes remain nonblocking: Ruff extended **45 diagnostics**, formatting **14 files**, Pyright **12 errors**; these counts match [base PR #45 Verify #144](https://github.com/lehater/napms-2/actions/runs/43213926534).

### P0–P3 review

- **P0:** no findings in the reviewed change. FastAPI grants, proxy authentication, SQLite schema and domain operations are unchanged. Browser/proxy/security regressions pass.
- **P1:** no outstanding findings. One mounted Shell; seven canonical collections; historical mock links, direct real URLs, actor/form/confirmation clearing and persistence covered.
- **P2:** no integration defect found. Needs server read and general Rule catalog remain intentionally unavailable; the UI explicitly labels these boundaries. Real request references still use the existing public demo fixture, not newly invented process/need relations.
- **P3:** existing nonblocking quality baseline (45 Ruff diagnostics, 14 formatting files, 12 Pyright errors) and Starlette/httpx deprecation warning remain; dependency cleanup and typography micro-tuning are outside this change. Manual owner visual/functional acceptance is still required.

PRs #44, #45 and #46 must remain Draft and unmerged until owner confirmation. This change is not archived or synced into accepted main specifications.

Delivery: implementation pushed to `spec/ui-integration-baseline-20261112`; PR #46 description includes the implementation SHA, checks, boundaries and seven-step owner acceptance. PR #44/#45/#46 verified open, Draft and unmerged. This final evidence/checklist update changes no application code; its own HEAD CI is verified again after push.
