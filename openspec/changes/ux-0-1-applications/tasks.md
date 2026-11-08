# Tasks

## 1. Presentation and walkthrough

- [x] 1.1 Implement application hierarchy, semantic properties and compact navigation/tables using existing fixture identities; update walkthrough and browser tests for hierarchy, parent/direct/back links, narrow reflow and mock isolation; verify full E2E passes and capture credential-free review screenshots if browser is available.

## 2. Integration

- [x] 2.1 Run typecheck, build, full real-flow E2E, strict OpenSpec validation and diff check; record results for review.

Local evidence: typecheck/build PASS; E2E 10/10 (5 prototype + 5 unchanged real FastAPI/SQLite checks, no API interception); OpenSpec strict 7/7; diff check PASS. WSL2 Chromium uses existing `/tmp/napms-browser-libs/usr/lib/x86_64-linux-gnu` via LD_LIBRARY_PATH. Credential-free screenshots are in `docs/research/assets/ux-0-1/`; final HEAD and CI are reported in the Draft PR.

## Workflow follow-up

- Continue existing Draft PR #27 on its feature branch, attach review artifacts and wait for successful CI on final HEAD. Do not create another PR or merge.

## 3. UX-0.2 UI Baseline v0.1

- [x] 3.1 Implement fluid shell and accessible persistent sidebar resizing; preserve eight sections and real API boundary.
- [x] 3.2 Implement Resources collection and tabbed detail with shared nested tables, fixture filtering/pagination and URL/Back context; preserve domain invariants.
- [x] 3.3 Verify desktop geometry, pointer/keyboard persistence, mobile navigation, tab/direct/back flow, isolation and unchanged real requests; capture and inspect four browser screenshots against reference.html; update research evidence.
- [ ] 3.4 Run typecheck, build, full E2E, strict OpenSpec validation and diff check; commit/push existing PR branch and verify GitHub CI on final HEAD without merge.
