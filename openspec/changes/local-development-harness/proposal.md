# Proposal

## Why
Manual bearer copying and separate service commands slow local acceptance and risk exposing private credentials. Add one explicit local demo profile that selects existing actors through a trusted loopback proxy while preserving FastAPI authentication and grants.

## What Changes
- One command initializes/upgrades the existing SQLite safely, starts FastAPI/Vite, checks readiness and stops both on exit.
- An explicit dev-only proxy translates a nonsecret actor selector to an existing private bearer credential. No credential issuance or browser token delivery.
- Shared React actor selection resets protected data and pending actions; anonymous selection exercises real backend 401, wrong actor exercises real 403.
- Exact Host/Origin, custom-header and fetch-metadata checks guard credential substitution. Build/preview cannot enable it.
- Existing manual-bearer development profile and regressions remain available.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `local-dev-runtime`: opt-in one-command launch and private proxy credential handling, with loopback/CSRF/production boundaries.
- `access-requests-web-ui`: shared actor selection as an alternative to the unchanged manual credential workflow.

## Impact
Vite Node-only plugin, a small standard-library Python supervisor, shared React context/control and existing typed client; no IAM, dependency or infrastructure service. This separate Draft PR is based on PR #44 at `46265906bd66ad9187a8cb7c7ff7d728bd4f0521` by explicit owner choice; it reuses that branch's schema migration rather than duplicating it. No SDLC agent Harness, roadmap or CI framework is changed.
