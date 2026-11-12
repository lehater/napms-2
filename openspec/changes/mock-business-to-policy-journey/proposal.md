# Proposal

## Why
The prototype has static connected objects but cannot demonstrate a user creating a request and obtaining a policy rule without a backend.

## What Changes
- Add a browser-only simulation journey using the existing fixture and seven collections.
- Select exact deployments and revision, validate compatibility, submit PENDING and finalize ALLOWED or DENIED.
- Preserve immutable history and deduplicate rules by exact AccessSubject.

## Capabilities
### New Capabilities
- `mock-access-journey`: navigable business-to-policy simulation with isolated in-memory state.
### Modified Capabilities
None. Real server-authorized UI remains unchanged.

## Impact
React prototype, fixture selectors, Object Detail and Playwright. No API, SQLite, dependencies or network computation.
