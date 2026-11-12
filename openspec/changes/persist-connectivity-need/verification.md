# Verification

Implementation base: `f511483816f3ade1926b94f0522527015207714f`.
Implementation commit: `e5361615cdb97abb57710c9b1170daf9cf3f50e8`.
Draft PR: https://github.com/lehater/napms-2/pull/51

## Executed checks

- Full pytest with coverage: **127 passed**, 91% coverage; one Starlette/httpx deprecation warning.
- OpenSpec `validate --all --strict`: **12 passed**.
- Web production build / TypeScript: **PASS**.
- Semantic contract: **PASS**, 16 kinds and 7 sections.
- Playwright: **37 + 5 passed**; proxy unit tests: **2 passed**.
- Blocking Ruff E4/E7/E9/F: **PASS**.
- Local advisory checks: extended Ruff 50 diagnostics, format 15 files, Pyright 32 errors (including local dependency resolution). These are not blocking gates.
- Verify for implementation commit: **SUCCESS**, https://github.com/lehater/napms-2/actions/runs/43297220465 . All five jobs ran. The application log reports advisory Ruff/format/Pyright outcomes as failure; blocking checks passed.

The final evidence-only commit receives its own Verify run; its exact SHA and CI URL are recorded in the PR handoff.

## Covered behavior

Fresh schema v3, v1/v2 upgrade, historical preservation and atomic duplicate refusal; SQLite uniqueness and concurrent creation; consistent revisions and Application roles; independent read/create/parent grants; strict DTO/pagination and safe errors; actual browser reload/backend restart; reuse across processes; replay and stale form 409; existing AccessRequest/Decision/Rule/Export and MOCK regressions.

## Remaining acceptance

Task 4.2 remains unchecked: independent review and owner manual acceptance have not occurred. No merge or archive was performed.

Source-side only; demo-business authority; no Need lifecycle/businessBasis, standalone Interaction catalogue, or AccessRequest composition.

## User smoke

Run `napms-dev run --profile local-demo`, choose Requester. Create a business process, open «Потребности», select a communication and create the Need. Reload, select Requester again, then restart using the same SQLite and repeat reading. The Need persists and its communication is no longer offered for that process. Another process can reuse it. Switching to Decider/Exporter clears protected content. Creating a Need does not create an access request or policy rule.
