# Tasks

## 1. Linked prototype

- [x] 1.1 Add deterministic typed fixture, eight views, shared tables/cards, grouped shell, URL navigation, filtering and mock/API boundary; verify browser chain, fixture integrity, search, Unknown/Uncomparable and zero API requests with new E2E checks; document local walkthrough and owner questions.

## 2. Integration verification

- [x] 2.1 Run typecheck, build, full browser suite including unchanged real backend regression, and strict OpenSpec validation; record outcomes in Draft PR linked to #23.

Evidence: Draft PR https://github.com/lehater/napms-2/pull/24. Typecheck/build PASS; E2E 8/8 (existing WSL2 library path workaround); OpenSpec strict 6/6. CI outcomes are reported against final HEAD in the PR/handoff.

## Workflow follow-up

- Create Draft PR and hand off HEAD and CI evidence; do not merge or archive before review.

## 3. ERD review corrections (#25/#26)

- [x] 3.1 Correct Interaction/Need/revision, add Endpoint and TAE facts with computed/persistent labels, temporal RC and separate authority evidence; update walkthrough and graph/browser assertions, verifying all links and no prototype API calls.
- [x] 3.2 Run typecheck, build, full E2E, strict OpenSpec validation and diff check; update existing Draft PR #24 and wait for successful CI on the new HEAD.

ERD correction evidence: typecheck/build PASS; full E2E 9/9 (4 prototype + 5 unchanged real-flow checks); strict OpenSpec 6/6; diff check PASS. CI [Verify #89](https://github.com/lehater/napms-2/actions/runs/42424436980) passed all three jobs for implementation `5270a84999ec31c7964722e468dc3b3f7f1ad525`. Final handoff CI, including this tracking-only update, is recorded in PR #24.

## 4. SDLC-04 semantic quality escape (#30)

- [x] 4.1 Define normative UX-0 presentation contract; keep original eight sections, object identity and mock/API boundary.
- [x] 4.2 Separate PolicyRule collection from AccessRequest and Reconciliation, make state captions entity-specific, move read-only/immutable to attributes.
- [x] 4.3 Add fast blocking CI contract check, mutation sentinels and browser-visible semantic regression tests.
- [ ] 4.4 Verify CI on the final integrated PR HEAD, capture RCA evidence and complete owner review; do not merge automatically.

Systemic RCA and acceptance: `docs/engineering/quality-escapes/ux-0-semantic-ui-2026-11-08.md`, Issue #30.

- [x] 4.5 Address independent review P1/P2: all Kind status/no-status decisions, typed UI model, data-driven browser cases, independent documentation.
- [ ] 4.6 Show negative UI mutation → failing browser check and recheck integrated PR #27 + #31 CI on same HEAD.
