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

### Accepted UX baseline follow-up in Draft PR #40

- Synced the existing branch with accepted main `1779cb662f0b551838b9f979219a50c3421de103` (PR #41); no merge conflicts. Read `docs/ux/access-request/README.md`, `scenario.md` and all eight PNG references.
- Need submission now lives on its Communication tab. Reproducible S02-A/B/C distinguish the new `dep-order-1 → dep-ledger-2 / rev-1` subject from historical P1. Added a synthetic ledger-api-02 Resource/Endpoint/Deployment; backend fixtures are unchanged.
- Decision mode now starts with neither outcome selected; selecting an outcome only opens its confirmation. Separate confirmation finalizes exactly once. Synchronous latest-state validation rejects repeated/competing decisions without altering prior provenance.
- Full Playwright: 33 passed, including all existing real FastAPI/SQLite UI cases. New coverage includes S02 states, explicit confirmation/cancel, Q3 → P2 → Requester, reset, invalid combinations, canonical reuse/INACTIVE preservation, terminal decisions and 390px use. Existing relation tests also check the inline Need links and pagination over the expanded synthetic catalogue.
- TypeScript/Vite build, semantic contract (16 kinds, seven collections) and OpenSpec strict (8 items): PASS. Control screenshots of all eight states were inspected at 1920×1120; no browser page errors or horizontal overflow at 1920/390px.
- Remaining visual P2/P3: generic collection pagination and detail/header composition, vertical density/scrolling, typography, icon/badge/date formatting. The three specified P1 fixes pass; no claim of pixel-perfect equivalence or real authorization/network access. Current-head CI results are recorded in PR #40.
