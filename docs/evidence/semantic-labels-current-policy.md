# Semantic labels and current authorized policy — PR #55

Accepted specification: PR #56, main `f66c23ff1cdf6d59ccbf63bcca2a16da9e0ddd7c`.
Implementation stays on `feat/real-need-to-policy-export`; owner acceptance is pending.

## Technical plan and stage results

1. `storage.py`, `dev.py`: explicit transactional v3→v4 adds three owning-entity name tables. Immutable catalog rows/triggers remain intact; absent historical metadata stays absent. Demo initialization inserts only known synthetic names and never overwrites metadata/credentials/grants. Test migration preservation, rollback, repeat init, FK/immutability and Application-scoped Component uniqueness.
2. `domain.py`, `use_cases.py`, `http.py`: one typed TCP/UDP formatter, authorized semantic projections. Need has no revision traffic, Rule uses exact Subject. Test confidentiality after grants expire and unchanged source-only admission.
3. `api.ts`, `Needs.tsx`, `ComposeRequest.tsx`, `App.tsx`, `PolicyRule.tsx`: readable primary text plus technical IDs; keep exact confirmation, paging, actor/session guards. Build and browser checks.
4. `use_cases.py`, `http.py`, `navigation.ts`, `Shell.tsx`, `PolicyRules.tsx`, `dev/local-demo.ts`: canonical ACTIVE/INACTIVE Rule collection, both export grants before pagination; test stable pages, deduplication and hidden data.
5. Same evaluator and CSV columns serve selected Rule and current policy. One pinned snapshot/time, ACTIVE and both grants, explicit authorized scope, READY/INCOMPLETE retained. Test concurrent changes, empty export, JSON/CSV parity and actual downloads.
6. Extend real browser restart/ALLOWED scenario through Rule list and four files; test three desktop sizes, confidentiality and session changes. Run existing full local/CI gates and report advisory outcomes separately.

No general catalog CRUD, ICMP/multi-clause model, production IAM or global completeness claim is introduced. Metadata is operator input; labels never identify or authorize domain entities. Current model supports one TCP/UDP interval. Historical names display “Название не задано”; protected names display “Название недоступно”.

## Migration and disclosure boundary

Explicit `napms-dev init-demo` upgrades v1/v2/v3 to schema v4, preserving existing catalog rows and structural triggers, requests, decisions, rules, allowances, grants and credentials. The v3→v4 operation only creates `resource_names`, `application_names`, `component_names` and two metadata uniqueness triggers. Transactional DDL and `user_version` commit together; migration does not backfill arbitrary historical names. Repeating initialization never overwrites a metadata row. If an operator already uses a synthetic Component name elsewhere in the Application, seed leaves the conflicting missing metadata absent.

Catalog names are descriptive metadata, never identity or authority. Component names are unique within Application context. BusinessProcess keeps its validated existing input; there is no new catalog CRUD. Existing immutable metadata on Process remains protected.

Request/Decision projections resolve catalog names only under effective independent Decider authority, both Resource export grants, or the full Requester discovery grants (both business reads and both Resource options reads). A historical author can still read Request identity/evidence after discovery revocation, with a redacted label. POST still only requires source `access.request`; label redaction never rejects a valid POST. Need labels use Process and directed Components without revision traffic. Canonical Rule labels never depend on a particular Need.

## API and export contract

- `GET /policy-rules?limit=20&offset=0`: canonical Rule ID order, ACTIVE/INACTIVE, subject, server label, typed traffic, originating Decision and allowance references. Both Resource grants are evaluated in one pinned snapshot/time before pagination; no global total.
- `GET /policy/export/current?format=json|csv`: all authorized ACTIVE Rules across collection pages. JSON `{scope:"authorized",evaluationAt,rows}` has no `selectedRuleId`. Both formats send `X-Policy-Scope: authorized` and `X-Evaluation-At`; CSV uses the existing columns, including row evaluation time. Empty CSV has only its header. The UI and filenames explicitly identify authorized scope even when CSV has no rows.
- Existing `GET /policy/export?ruleId=...` retains selected-rule envelope, row schema, grant rules and CSV metadata. Both endpoints use the same evaluator inside their owning read transaction, never per-Rule HTTP calls.
- The existing demo proxy allowlist adds only GET for the two new endpoints and forwards evaluation/scope headers. Origin/CSRF/actor/credential/method restrictions remain in force; ordinary Vite uses its existing API prefix proxy.
- Protected policy responses/errors are `Cache-Control: no-store`. Actor/credential changes discard late collection/read/download results; files are actual backend bytes.

## Reproducible owner smoke (acceptance pending)

1. Explicitly initialize an existing local database with `napms-dev init-demo`, then start `napms-dev run --profile local-demo` on that same database. This upgrade preserves previous IDs and credentials. Choose **Requester**.
2. Create a BusinessProcess, open **Потребности**, create/select the directed **Отправитель → Получатель** communication. Select **tcp(443)** Revision and named source/destination placements (**sender.demo.example**, **receiver.demo.example**); inspect readable summary and secondary exact IDs. Confirm the Request and see PENDING.
3. Save the Request URL, reload and restart backend against the same DB. Reopen the URL as Requester; verify the same Need, Subject and PENDING.
4. Switch to **Decider**, explicitly confirm ALLOWED. Follow Rule Detail; independent export authority is still required. Switch to **Exporter**, inspect ACTIVE, readable direction/traffic, exact Subject and separate provenance/allowances. Download selected Rule JSON and CSV and inspect real rows.
5. Open **Правила политики** in the main Sidebar. Find that saved canonical Rule by readable direction and `tcp(443)`, verify ACTIVE and its Detail link. Repeated ALLOWED for the same Subject must keep one Rule with multiple allowances.
6. Click **Текущая политика · JSON** and **CSV** under **Выгрузить доступную текущую политику**. Verify the authorized scope, Rule/Subject identity, TCP/443, actual addresses, provenance, `evaluationAt` and READY/INCOMPLETE. This is the actor-authorized subset, not a complete global policy. INACTIVE rules remain inspectable in the list but are excluded from current export.
7. Record explicit owner acceptance of this entire extended flow in PR #55. Until then keep this change task 5.3 and `compose-access-request-from-need` task 4.3 open; keep the PR Draft. No merge is performed by the implementer.

## Remaining limitations

The synthetic local profile is not production IAM or tenant isolation. Historical unseeded names remain missing; no general catalog editor or DNS inference is added. The current model stores one TCP/UDP destination interval, with multi-clause and ICMP notation reserved for future typed models. Export is desired policy, not evidence of network connectivity or firewall application. List filtering scans stored Rules in the existing small local SQLite model; no new scalability architecture is introduced. Manual bearer credentials remain route-local and may require re-entry after route changes. Owner manual acceptance is still required.

## Retained browser evidence

Actual backend bytes downloaded by the extended REAL browser scenario (synthetic data only). Hashes are SHA-256.

| File | SHA-256 |
| --- | --- |
| [authorized-current-policy.csv](semantic-policy-files/authorized-current-policy.csv) | `402a418f3e407f9d0567a1ed9b84791bc1413f1223be00aef91802762054a79d` |
| [authorized-current-policy.json](semantic-policy-files/authorized-current-policy.json) | `bb5582cfde4efabe425f2fd70cbb4e2d644c226c30b8c3d49b3325a33dc8d7f5` |
| [policy-rule-0f33e96e-3e33-44d3-9519-4f38ecb44914.csv](semantic-policy-files/policy-rule-0f33e96e-3e33-44d3-9519-4f38ecb44914.csv) | `0b1ac2f8d080db1418ffa12b3b1c2e32b6cc22194654632a39a24d551a335ed5` |
| [policy-rule-0f33e96e-3e33-44d3-9519-4f38ecb44914.json](semantic-policy-files/policy-rule-0f33e96e-3e33-44d3-9519-4f38ecb44914.json) | `bc0cc1483f4fd250cfdfb6f4c1f81f95078016b4f21ad0eebe5d5813489261b3` |

[Browser screenshot: real-current-policy-1440](semantic-policy-files/real-current-policy-1440.png).

[Browser screenshot: real-current-policy-1920](semantic-policy-files/real-current-policy-1920.png).

[Browser screenshot: real-current-policy-2560](semantic-policy-files/real-current-policy-2560.png).

[Browser screenshot: real-rule-1440](semantic-policy-files/real-rule-1440.png).

Current JSON snapshot: scope `authorized`, evaluationAt `2026-11-13T02:12:14.497142Z`, 1 canonical Rule row, READY. Selected Rule and current-policy CSV/JSON parity is asserted against real downloaded bytes; each download has its own server evaluation time.

## Verification commands and outcomes

- `openspec validate --all --strict`: 14/14 passed on final artifacts before handoff.
- `.venv/bin/python -m pytest -q --cov=napms --cov-report=term-missing`: full backend/security/runtime/migration checks; final counts recorded below.
- `.venv/bin/python -m ruff check --select E4,E7,E9,F src tests`: blocking gate passed.
- `npm run build --prefix web`: TypeScript and Vite production build passed.
- `npm run test:semantic --prefix web`: passed; 3 REAL collections and 7 isolated historical research sections.
- `NAPMS_PYTHON=<repo>/.venv/bin/python LD_LIBRARY_PATH=/tmp/napms-browser-libs/usr/lib/x86_64-linux-gnu npm run test:e2e --prefix web`: existing proxy, ordinary browser and local-demo suites; final counts recorded below. The temporary browser library path is local environment setup, not a repository dependency or Harness change.
- Existing Ruff extended/format/Pyright advisory checks are reported separately. Final-head GitHub Verify outcomes and exact SHA are recorded in the PR handoff comment; a skipped job is never reported as a product-test pass.

During verification, old label-based E2E selectors were updated for semantic text, and the demo proxy's missing GET allowlist entries and repeated Sidebar group were fixed. One simultaneous backend/browser run hit the existing fixed-port startup precondition; final suites run sequentially. No CI gates, dependencies or Harness orchestration were changed.

Final local verification: **227 pytest tests passed, 94% total coverage** (`storage`, `labels`, HTTP 100%, use cases 99%); **2 proxy + 37 ordinary Playwright + 15 local-demo Playwright tests passed**. The complete browser run includes real restart, named selection, repeated ALLOWED/canonical Rule reuse, collection navigation/pagination/actor reset, and actual selected/current JSON/CSV bytes. Strict OpenSpec 14/14, blocking Ruff, typed build and semantic contract passed.

Local advisory outcomes: Ruff extended **56 findings**, format **16 files**, Pyright **37 errors** (including unresolved local imports and dynamic FastAPI dependency annotations). These are advisory, not successful blocking checks. CI outcomes are reported separately for the exact final head. No advisory gate was relaxed.
