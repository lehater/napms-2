# Tasks

## 1. Presentation and walkthrough

- [x] 1.1 Implement application hierarchy, semantic properties and compact navigation/tables using existing fixture identities; update walkthrough and browser tests for hierarchy, parent/direct/back links, narrow reflow and mock isolation; verify full E2E passes and capture credential-free review screenshots if browser is available.

## 2. Integration

- [x] 2.1 Run typecheck, build, full real-flow E2E, strict OpenSpec validation and diff check; record results for review.

Local evidence: typecheck/build PASS; E2E 10/10 (5 prototype + 5 unchanged real FastAPI/SQLite checks, no API interception); OpenSpec strict 7/7; diff check PASS. WSL2 Chromium uses existing `/tmp/napms-browser-libs/usr/lib/x86_64-linux-gnu` via LD_LIBRARY_PATH. Credential-free screenshots are in `docs/research/assets/ux-0-1/`; final HEAD and CI are reported in the Draft PR.

## Workflow follow-up

- Create one Draft PR from the feature branch, attach or link review artifacts and wait for successful CI on final HEAD. Do not merge.
