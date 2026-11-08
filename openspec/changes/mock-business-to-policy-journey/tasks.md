# Tasks

## 1. Simulation state
- [x] 1.1 Add immutable fixture overlay and validated subject/decision transitions; verify typecheck and semantic contract.

## 2. Existing UI journey
- [x] 2.1 Integrate named participant submission, explicit decision mode and linked results in existing collection/detail views; add and pass browser journey, invalid selection, denial and reuse tests, and document browser entry/reset behavior.

## 3. Integration delivery
- [x] 3.1 Run TypeScript/build, semantic contract, full Playwright and OpenSpec strict; prepare one Draft PR and verify GitHub CI.

## Verification evidence

- TypeScript and Vite production build: PASS.
- Semantic contract: PASS (16 kinds, seven collections, routes and denied provenance).
- Full Playwright: 28 passed, including two new mock journey scenarios and existing real UI tests.
- `openspec validate --all --strict`: 8 passed.
- Draft PR: https://github.com/lehater/napms-2/pull/40
- GitHub CI for implementation/test commit `5a0d2137003b4edcb9f234f36e550650794ac8fd`: application, validate, semantic-contract, web all successful: https://github.com/lehater/napms-2/actions/runs/42537149754
