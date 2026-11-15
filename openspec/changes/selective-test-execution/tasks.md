# Tasks

## 1. Verify baseline and test ownership

- [ ] 1.1 Reconcile main with [PR #98](https://github.com/lehater/napms-2/pull/98) and its test-necessity register; confirm actual required checks and state of OpenCode conditional routing before code changes.
- [ ] 1.2 Validate the initial changed-path/contract/test-owner matrix against current modules, pytest discovery and Playwright test listing. Mark uncertain/shared owners FULL rather than inventing dependencies.
- [ ] 1.3 Record acceptance fixture inputs and expected outputs for the 12 selector/merge-gate scenarios in `design.md`.

## 2. Minimal selector (no CI skips)

- [ ] 2.1 Add one deterministic, importable selector with NUL-safe cumulative-diff parsing and conservative FULL fallback; provide `--dry-run` and machine-readable output (mode, SHA, group IDs, exact test targets, reason).
- [ ] 2.2 Reuse the selector from `scripts/check-fast.py` and workflow planning; remove duplicated classification only once parity is demonstrated. Keep existing FULL runner intact.
- [ ] 2.3 Add deterministic tests for unions, unknown paths, renames/deletions, unusual paths, empty/missing data, changed tests, changed mapping and missing targets.
- [ ] 2.4 Add report-only GitHub Actions summary (selected and excluded groups, reasons) while continuing to run FULL before Ready merge. Do not change required check names or Ruleset in this step.

## 3. Validate selection without weakening merge

- [ ] 3.1 Compare selector plans against FULL coverage for backend-only, UI-only, cross-layer, multiple-area, OpenCode-only and unknown changes; report any omitted required contract.
- [ ] 3.2 Validate collection of every selected pytest/Playwright target; zero selected cases or unexpected skips must block activation.
- [ ] 3.3 Demonstrate unchanged Draft FAST blocking and Ready FULL safety on actual GitHub PR merge candidates; rerun after base changes and inspect job summaries.
- [ ] 3.4 Run `openspec validate --all --strict`, selector unit tests, `git diff --check` and relevant focused smoke tests; attach reproducible evidence with commit SHA.

## 4. Activate one narrow group

- [ ] 4.1 Enable conditional routing for one independently verified group (prefer OpenCode role contract if PR #98 does not already cover it); keep unrelated groups FULL.
- [ ] 4.2 Enable the first isolated Web group only after mapping its shared dependencies and browser test fixtures; do not parallelize the existing shared-port E2E.
- [ ] 4.3 Report both selected and actually executed groups, with reasons. Unmapped changes or mismatch between planned/actual coverage must fail closed to FULL or block merge.

## 5. Required gate and rollout decision

- [ ] 5.1 Prove the current four required statuses cannot be green when selected tests are missing; if insufficient, implement a stable `ci-required` aggregation job in a separate change without removing the old checks.
- [ ] 5.2 Exercise the new required job on real PRs, then request explicit review of the GitHub Ruleset migration before changing required contexts.
- [ ] 5.3 Document rollback: revert selector routing to unconditional FULL; keep all original tests and manual FULL command. Audit failures before broader activation.

## Completion

- No skipped relevant contract for validated scenarios.
- A deterministic per-PR selection summary with target names and reasons.
- Unknown/unsafe paths always choose FULL; missing test results never count as PASS.
- Tests remain available for complete FULL and current `main` protection is unchanged until separately verified.
