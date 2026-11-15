# Design — Selective Test Execution

## 1. Existing state

- `.github/workflows/verify.yml`: `changes` classifies cumulative merge diff; four required contexts are `application`, `web`, `validate`, `semantic-contract`. Ready PR runs FULL for all non-documentation changes. Draft FAST deliberately blocks required FULL contexts.
- `scripts/check-fast.py`: local Python/Web/docs coarse routing. Its test-file-only shortcut does **not** prove application-impact coverage.
- Python: pytest suite `tests/` including domain, HTTP security, SQLite migrations and concurrency, launcher and OpenCode role contract.
- Browser: `web/e2e/` (manual bearer + REAL FastAPI/SQLite) and `web/e2e-harness/` (local-demo proxy), shared ports 8000/5173 and sometimes shared mutable databases; do not increase `workers` as part of selection.
- [PR #98](https://github.com/lehater/napms-2/pull/98) is separate and may add a preliminary OpenCode-only exclusion. Rebase/reconcile before implementing; avoid two conflicting classifiers.

## 2. Responsibility and contracts

**Diff reader**
- Input: GitHub merge candidate, base/head SHA and NUL-delimited changed-file statuses (including both paths for rename).
- Output: canonical set of modified, added, deleted and renamed paths plus provenance.
- Responsibility: process the **whole cumulative PR diff**, not just latest commit; do not interpolate PR-controlled strings into shell commands.
- Unknown/invalid diff, missing base, no trustworthy merge commit, unsupported operation or incomplete file list → FULL.

**Impact resolver**
- Input: normalized paths and a versioned dependency map.
- Output: union of affected contracts and reasons; ambiguity → FULL.
- Responsibility: include downstream consumers; e.g., `http.py` may affect React via API. Never infer “Python-only implies no Web tests.”

**Test selector**
- Input: affected contracts and registered test groups.
- Output: deterministic, sorted plan `mode` (`FULL` / `SELECTED`), `checks`, `pytest` targets, `playwright` targets and `reasons` for every included/excluded group.
- Responsibility: ensure that every mapped contract has at least one existing test owner; missing/renamed/empty target → FULL. Unions must never cancel a required group.

**Executor and required gate**
- Input: approved plan plus results/evidence from jobs.
- Output: clear pass/fail result for the merge candidate SHA.
- Responsibility: execute *all* selected targets and validate their terminal outcomes. A missing or skipped required test result is failure, except when an explicitly approved, verifiable empty selection is recorded. Until required-context migration, retain the four existing required check names and their non-green Draft behavior.

## 3. Initial impact matrix (proposal; confirm against source/test owners)

The initial matrix is deliberately coarse. `FULL` means all applicable app + browser tests, not “skip because mapping is hard.”

| Modified paths / condition | Affected contracts | First safe selection |
|---|---|---|
| `docs/**`, `README.md`, `openspec/changes/**` and `openspec/specs/**` text only | Docs / OpenSpec | `validate` + `semantic-contract`; existing documentation-only allowlist continues |
| `web/src/navigation.ts` | REAL navigation, semantic boundaries | TS build + semantic contract + local-demo navigation E2E; include other shared Shell tests if coupled |
| `web/src/BusinessProcesses.tsx` | BusinessProcess UI, Needs creation, API retry states | TS build + REAL process E2E + relevant local-demo flow; confirm test owners before activation |
| `web/src/Catalogs.tsx`, `web/src/InteractionScreens.tsx` | Catalog, interaction/revisions, request composition | TS build + catalog journey and resource/interaction E2E; broad Web fallback until independent cases identified |
| `web/src/PolicyRule.tsx`, `web/src/PolicyRules.tsx` | Rule detail/list, current export, downloads | TS build + local-demo policy/rule E2E group |
| `opencode.jsonc`, `tests/test_opencode_role_catalog.py` | OpenCode provider and role-permission safety | OpenCode 7 tests; other checks as required by current bootstrap, reconcile PR #98 |
| `src/napms/traffic_clauses.py` | Protocol/port validation, interaction revisions, requests and export | Python acceptance/revisions/source-ports + downstream integration; **FULL until dependency proof** |
| `src/napms/storage.py`, `src/napms/http.py`, `src/napms/use_cases.py`, `src/napms/domain.py`, `src/napms/dev.py`, `src/napms/harness.py` | Shared API, storage, policy, process or harness cross-layer behavior | **FULL** |
| `web/src/api.ts`, `web/src/App.tsx`, `web/src/Shell.tsx`, `web/src/Frame.tsx`, `web/vite.config.ts`, `web/src/components/real/**` | Shared frontend routing, transport or UI shell | FULL Web + impacted API coverage; default FULL initially |
| `tests/conftest.py`, `web/playwright*.ts`, `web/e2e/**`, `web/e2e-harness/**` | Shared test fixtures, runner setup, browser tests | FULL or changed suite PLUS affected dependencies once proven |
| `.github/**`, `scripts/**`, `pyproject.toml`, `web/package*.json`, `openspec/config.yaml`, map/selector files | CI, tool versions, selector correctness | **FULL** |
| Unmatched/renamed/deleted paths, conflicting paths, inability to compare or modified classifier | Unknown | **FULL** |

Rules: multi-area changes use **set union** of impacts, except where any rule requires FULL. Path matching uses normalized repo-relative paths and explicit precedence (high-risk overrides narrow rules). Treat `README`/docs-only narrowly; any executable script in docs is high-risk. New source paths without registered owners are unknown, not silently ignored.

This is a **design hypothesis**, not an authorized test skip list. The first implementation SHALL ship report-only; each selective row is enabled only after evidence from the corresponding acceptance cases.

## 4. Test grouping and representation

Begin with a compact, reviewable test-group manifest (e.g., `ci/test-impact-map.yaml` or a minimal Python data structure):
- `group_id`, `contract_ids`, `pytest_paths` OR `playwright_paths/tags`, `owner` (source path and optional requirement), `risk`, `mandatory`.
- Prefer file-level pytest targets and Playwright file selection for the first MVP. Use registered `pytest.mark` and Playwright `@tag` only where a single large file contains independent capabilities and splitting is justified.
- Test or fixture file modifications MUST select that test's group; shared `conftest.py` and browser runner changes are FULL.
- Validate selection targets against collection/listing on the same commit (e.g., pytest `--collect-only`, Playwright `--list`). A valid-looking command selecting zero tests is a **failure**, not success.
- Avoid duplicate mappings between `scripts/check-fast.py` and workflow inline logic: one selector for local dry-run and CI.

## 5. Required-check strategy

**Phase A — shadow:** do not change required GitHub job names or skip actual FULL. Print `SELECTED (proposed)` and `FULL (executed)` with reasons; verify planned coverage against all collected tests. A selector failure is visible and causes shadow mode to choose FULL.

**Phase B — activation:** when impact cases pass, use the same selector in CI. Existing required jobs must verify and summarize intentional no-op scopes, not silently disappear as `skipped` (GitHub can mark skipped required jobs successful). All planned tests must be observed complete. Preserve Draft FAST/full boundary.

**Phase C — optional required-gate migration:** introduce one `ci-required` job that always evaluates `needs` and the signed-by-workflow plan/result manifest; initially informational, then switch Ruleset to require it only after tested in real PRs. Do not remove current required contexts or change Ruleset in the same PR that introduces the new job. A failed dependency, missing plan, selector crash, cancelled run, or unperformed required test must never result in a green gate.

GitHub docs: [required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/merging-a-pull-request/troubleshooting-required-status-checks), [workflow path filters](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow), [pytest markers](https://docs.pytest.org/en/stable/how-to/mark.html), [Playwright tags](https://playwright.dev/docs/test-annotations).

## 6. Verification matrix and rollout

Before any selective skip becomes merge-relevant, exercise these fixtures in selector unit tests and preferably real PRs:

1. docs-only → docs/contract checks; no misleading green result from a skipped required workflow.
2. isolated navigation/BusinessProcess UI → mapped Web checks, not unrelated Python cases.
3. isolated OpenCode config → role tests despite unrelated app/UI scope (see PR #98).
4. shared `http.py` / `storage.py` → FULL including both API and browser integration.
5. two separate frontend areas → union of both suites.
6. test file change → includes its test group even if product files unchanged.
7. shared test fixture/config/CI change → FULL.
8. rename, deletion, path with spaces/non-ASCII, missing base, empty/corrupt diff → FULL.
9. path outside map or missing target group → FULL.
10. planned test target collects zero tests or fails → required gate fails.
11. cancel / failed dependency / skipped required group → never green.
12. branch base advances → plan recomputed for the actual candidate; stale results cannot attest new merge candidate.

On identical merge-candidate SHAs compare shadow plans with current FULL coverage; document all skipped contracts and why each is safe. Start with one isolated group (OpenCode after PR #98), then one narrow UI group. Do not add `pytest-testmon`, Nx, parallel workers or dynamic coverage dependencies until a simpler deterministic approach has demonstrated benefit.

## 7. Decision log / risks

- Static file paths are **not enough** for shared backend modules. Explicit `FULL` fallback is a feature, not a design failure.
- A test's name or its overlap in business terms does not prove redundancy. Test responsibility is the unit of selection.
- Browser E2E currently uses shared ports and mutable fixtures; scope selection must not increase concurrency.
- Changes to the selector or dependency map themselves are high-risk and trigger FULL.
- Automation should measure selected groups/false negatives first; runner time is secondary to preserving regression confidence.
