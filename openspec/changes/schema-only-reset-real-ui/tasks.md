## Implementation
- [x] Separate schema-only reset from test fixture initialization
- [x] Prevent local launcher from seeding business/catalog data
- [x] Expose explicit local authorization bootstrap and resource grant helper
- [x] Remove /prototype runtime routes, synthetic data and mock Playwright suites
- [x] Replace fixture-dependent semantic gate with REAL runtime boundary check
- [x] Update Makefile and README to document empty reset and opt-in auth

## Verification and acceptance
- [x] Add regression test for zero rows across all schema tables after reset
- [x] Add explicit auth and resource grants tests
- [x] Add REAL Playwright empty database/reset scenario
- [ ] Run FULL CI Verify for exact PR head, address failures
- [ ] Owner runs WSL smoke on disposable SQLite and visually confirms empty catalogs
- [ ] Independent review of reset safety and runtime source-of-truth boundary
