# Web UI audit and cleanup before owner acceptance

Audit baseline: PR #55, head `f7b4945cdcd0fdad8615557f6751c1b92c85ecf7`, independently verified through GitHub Connector. Same feature branch and Draft PR; owner acceptance and task 4.3 remain pending.

## Confirmed findings and bounded plan

| Priority | Finding / classification | Resolution (implemented unless deferred) |
| --- | --- | --- |
| P0 | None found in the inspected UI/API paths | Preserve existing domain and authorization regression coverage |
| P1 | Main navigation offers five fictional catalogues alongside two real collections, including a MOCK Need collection and PolicyRule list despite working REAL detail flows — product navigation defect | Only BusinessProcess and AccessRequest collections in the main Sidebar; Need through Process, Rule through ALLOWED Request |
| P1 | Main Shell imports fixture sections and reads Simulation state; SimulationProvider wraps every route — UI state isolation debt exposed in acceptance | Share presentation/resize only; mount Simulation and its navigation exclusively under a lazy `/prototype/*` branch |
| P2 | BusinessProcess footer and Sidebar link users into Simulation; topbar/labels advertise the historical UI baseline and duplicate REAL/MOCK metadata — stale UI | Remove main Simulation links and redundant implementation labels; keep one actual demo actor control |
| P2 | Rule Detail has no breadcrumb or return to the working collection — navigation dead end | Add real breadcrumbs and return to AccessRequests, including error/unauthorized states |
| P2 | Selected Need remains open when its list page/refresh changes, and selected row is not identified — selection UX defect | Clear composition with list context changes and expose selected row state |
| P2 | Seven-item expectations apply to the shared main Sidebar — outdated UI/IA contract and tests | Scope seven items to research; explicitly enforce the two-item main navigation and isolation |
| P2 | Rule download actions follow a long raw provenance block and are pushed below the initial viewport — action hierarchy defect | Place both download actions immediately after Rule identity/state and verify visibility at all three desktop sizes |
| P3 | Technical UUID labels and raw Rule provenance JSON are verbose — presentation debt | Retain truthful data; defer a broader visual redesign |
| Planned | Resource/Application/Deployment catalog CRUD and general Rule list are unimplemented features, not empty collections | Hide absent collections; do not build new APIs or invent data |

## Actual functionality and dependencies

BusinessProcess list/create/detail, Process-scoped Need list/create/options, Need composition, Request list/detail/decision and selected Rule detail/export use the typed API client → existing FastAPI → SQLite. Actor selection is a local proxy credential selector, not a domain permission. REAL operations never fall back to fixture data.

`prototype/{data,simulation,Prototype,Resources,Views,NeedCommunication,SimulationActions}` implement browser-only research flows with synthetic IDs and semantic-contract tests. They remain necessary for historical deep-link and simulation regression coverage. Their original Sidebar links for Process/Request crossed into REAL pages; the replacement research Sidebar keeps those links within `/prototype/*`.

The bounded cleanup separates navigation and state, reuses the existing geometry/resize styles, and retains historical assets and documents. Backend, schema, proxy, IAM, dependencies and CI/Harness code are unchanged.

## Verification and handoff

Local final checks:

| Check | Command | Result |
| --- | --- | --- |
| Backend | `.venv/bin/python -m pytest -q --cov=napms --cov-report=term-missing` | 165 passed, 93% total coverage |
| Blocking Ruff | `.venv/bin/python -m ruff check --select E4,E7,E9,F src tests` | Passed |
| Web | `npm run build --prefix web` | Typecheck and production build passed; research is a separate lazy chunk |
| OpenSpec | `openspec validate --all --strict` | 13/13 passed |
| Semantic contract | `npm run test:semantic --prefix web` | 16 historical kinds / 7 research sections / 2 REAL collections passed |
| Complete browser | `NAPMS_PYTHON=/home/alex/projects/napms-2/.venv/bin/python LD_LIBRARY_PATH=/tmp/napms-browser-libs/usr/lib/x86_64-linux-gnu npm run test:e2e --prefix web` | Proxy 2/2, ordinary 37/37, local-demo 11/11 passed |
| Extended Ruff | `.venv/bin/python -m ruff check src tests` | Advisory: 55 findings |
| Format | `.venv/bin/python -m ruff format --check src tests` | Advisory: 16 files |
| Pyright | `.venv/bin/python -m pyright` | Advisory: 34 local errors, including unresolved environment imports; CI outcomes recorded in PR |

A pre-existing local-demo initially occupied 8000/5173; the owner freed the ports and full pytest then passed. After lazy isolation, research tests now wait for loaded screens and the active tab before measuring/reading tables. The all-relations test navigates tabs in the loaded app rather than reloading the document for every tab; all object deep links and relation assertions remain covered. No timeout, Harness or CI gate was relaxed.

The full REAL E2E still creates Process/Need, selects/validates the complete summary, persists PENDING through reload and actual backend restart, independently confirms ALLOWED, follows the server Rule URL, switches to Exporter and saves/verifies JSON/CSV. It also checks Rule breadcrumbs/return and that export actions are in the viewport at 1440×900, 1920×1080 and 2560×1440. Existing negative authorization, DENIED/INACTIVE/INCOMPLETE, stale async, manual credentials and security coverage are retained.

New coverage checks exactly two main groups/links, no mock links/labels or false catalogue groups, active navigation, keyboard/pointer resize and persistence, no overflow, no research module requests from REAL pages, direct isolated research navigation, and selected Need reset on refresh. Existing 390px real and research regressions pass.

Screenshots use actual temporary SQLite test records (synthetic acceptance data). Visual inspection of 1440px main and Rule, 1920px Rule and 2560px main confirms the two-item dark Sidebar, compact header, readable breadcrumbs, active state and export actions. All six viewport screenshots are attached below. They are functional layout evidence, not owner acceptance.

Final exact head and matching CI results are recorded in PR #55. OpenSpec remains 16/17; task 4.3 stays open until owner acceptance. No merge performed.

## Removed and isolated UI tails

- Removed the global SimulationProvider, fixture-based main Sidebar, REAL/MOCK navigation markers, historical baseline header text and real-to-Simulation shortcuts/footer.
- Split the old mixed Shell into main `Shell`, shared presentation/resize `Frame` and research-only `prototype/Shell`. Moved the shared stylesheet from `prototype/baseline.css` to `baseline.css`; retained the width preference key for compatibility.
- Isolated `ResearchApp`, SimulationProvider, fixture and all research views behind lazy `/prototype/*`. Existing research components remain used and covered; no historical materials were destroyed.
- Reused one common Not Found component. Removed the unused exported width-key API; the key remains internal to Frame.

## Remaining debt and planned functionality

- P2: options selection materializes candidates and per-deployment grants for local-demo scale; backend performance for larger catalogues is unclaimed and unchanged.
- P2: manual credentials remain memory-only per surface and may require re-entry after navigation; no new IAM/session infrastructure is introduced.
- P3: raw Rule provenance and technical UUID labels remain verbose. Shared CSS still contains research classes used by the isolated prototype; no broad visual/CSS rewrite was attempted.
- Planned, not a UI defect: Resource/Application/Deployment CRUD and a general Rule collection. Their navigation entries remain absent until real functionality exists.
- No outstanding P0/P1 identified in the bounded cleanup. Actual owner smoke/acceptance remains outstanding.

## Owner smoke

1. Explicitly initialize existing v3 demo data as documented, then run `napms-dev run --profile local-demo` and open `/`.
2. Verify only Бизнес-контекст → Бизнес-процессы and Управление доступом → Заявки на доступ. No Каталоги, MOCK, separate Need or Rule list. Resize with pointer/keyboard and reload at 1440×900, 1920×1080 and 2560×1440.
3. As Requester create a Process, open Потребности, create/select a Need and verify selected state. Choose Revision and both Deployments, inspect the self-contained summary and confirm PENDING.
4. Reload and actually restart backend on the same DB; reopen the Request and verify the same Need/exact Subject.
5. As Decider confirm ALLOWED, follow Открыть правило политики. Verify breadcrumbs/return exist even during 403; switch to Exporter on that Rule URL.
6. Inspect actual state/subject/provenance; download JSON/CSV using the visible actions and inspect Rule ID, protocol/ports, provenance, evaluationAt and READY/INCOMPLETE. Return to Requests via breadcrumbs/return link.
7. Optionally open `/prototype` directly and confirm the explicit research context; no primary navigation path leads there. Record owner acceptance in PR #55. Automation does not complete task 4.3.

## Captured artifacts


- [real-navigation-1920.png](real-ui-cleanup/real-navigation-1920.png), SHA-256 `e4db407614bd2047a7b90e30077c696f05477b1cf83dd8eb2d850edab0bff0f2`.

- [real-navigation-2560.png](real-ui-cleanup/real-navigation-2560.png), SHA-256 `b1241edbfded45e9e24273dbf55b85e758103667f618b0a93dd9c383ef7a6642`.

- [real-navigation-1440.png](real-ui-cleanup/real-navigation-1440.png), SHA-256 `1aa329bb5e968d4ec5c80e51377b8448c7a482547a3978f43dbd3e49c5104f6e`.

- [real-rule-2560.png](real-ui-cleanup/real-rule-2560.png), SHA-256 `3bdd8e53b067133905cda84a1e3d2b663b08ade4a75192df4efce67ef8a2188a`.

- [real-rule-1440.png](real-ui-cleanup/real-rule-1440.png), SHA-256 `6ddebe40af25c23eb183be2246d77a74ab148a76e6cbe5231db14857ccbc6238`.

- [real-rule-1920.png](real-ui-cleanup/real-rule-1920.png), SHA-256 `3881fcdca416b244036915392354fa6b59710bed5946543ac76c710618a45a27`.

- [policy-rule-9395711a-4f84-44d6-b4ba-dc1584e0bd2f.json](real-ui-cleanup/policy-rule-9395711a-4f84-44d6-b4ba-dc1584e0bd2f.json), SHA-256 `5ae707571ff1b004c31da3459ff119e26f87a29d7f47ba5480e2a513d22104ab`.

- [policy-rule-9395711a-4f84-44d6-b4ba-dc1584e0bd2f.csv](real-ui-cleanup/policy-rule-9395711a-4f84-44d6-b4ba-dc1584e0bd2f.csv), SHA-256 `3b5758d673b80f336b34b06a2601f274a94dc366715ae0d739b93be7061a506c`.
