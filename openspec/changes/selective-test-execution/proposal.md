# Proposal

## Why

NAPMS 2.0 currently classifies PR changes into documentation / Draft FAST / Ready FULL. Outside documentation-only changes, Ready PRs execute essentially all Python and browser tests, including tests unrelated to the modified behavior. Existing local `scripts/check-fast.py` selects fast checks by directory, but a directory match does not capture cross-layer API or SQLite effects.

The necessity audit in [PR #98](https://github.com/lehater/napms-2/pull/98) identifies 126 Python test functions (277 parameterized cases) and 29 Playwright declarations, many of which are candidates for *conditional* execution but are not proven redundant. PR #98 is still open at planning time; this change must be implementable without assuming that its code is already in `main`.

We need an explainable and fail-closed way to execute **the tests necessary for the changed contracts**, instead of blindly executing the full suite or skipping by directory alone.

## What Changes

- Introduce one versioned **change path → affected contract → required test-group** map for Python, Web, dev/Harness and OpenSpec.
- Extract/centralize a deterministic selector that reads the **cumulative PR merge candidate diff**, produces a verifiable test plan and defaults to FULL when classification or dependencies are uncertain.
- Support an initial small number of coarse test groups; reuse existing pytest file selection and Playwright file/tag filtering. Keep all current tests available in a complete FULL profile.
- Add selection self-tests and a shadow/compare mode which proposes selections **without suppressing current FULL checks** until cross-layer coverage is demonstrated.
- Introduce a fail-closed required-check contract. A skipped job SHALL NOT count as evidence that assigned tests ran; any transition of required contexts / GitHub Ruleset is staged separately.
- Record the change scope, selected and excluded groups, reasons, and actual check outcomes in the GitHub Actions summary.

## Capabilities

### New Capabilities
- `ci-test-selection`: Deterministic, auditable, contract-aware test selection with conservative fallback and required-check verification.

### Modified Capabilities
- None of the product API, domain, UI, SQLite or authorization contracts. This is a development/CI capability.

## Boundaries

Planning-only PR: proposal, design, testable spec and tasks. **No workflow, branch-protection, test-suite or runtime changes.** No automatic merge.

Out of scope for the first implementation: Bazel/Nx, testmon or coverage-derived dynamic selection, new CI database, general purpose test orchestration framework, deleting regression tests, adding more runners, or hiding failures by `continue-on-error` / `skip`.

## Expected Benefit / Acceptance

A known, isolated change can run a smaller justified set while maintaining the full regression path, and reviewers can answer **why each test group ran or was omitted**. Unknown, shared-contract, infrastructure and risky changes must still run FULL. Selection must be independently tested before it is allowed to determine merge eligibility.
