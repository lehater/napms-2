# Proposal

## Why

Issue #23 authorizes a bounded UX-0 prototype to test the research IA before backend expansion. Users need to follow the same fictional communication through catalogues, business justification and network comparison.

## What Changes

- Add eight compact read-only prototype views with grouped navigation, URL-based details, breadcrumbs and filtering.
- Provide one deterministic linked fixture, visible MOCK labels, Drift and Unknown/Uncomparable evidence.
- Align the fixture with the research ERD from PRs #25/#26: Need references stable Interaction; requests select its immutable revision. Distinguish persistent logical facts (including TAE set/entry) from computed navigation results; clarify RC history and source-only admission authority.
- Preserve existing real access-request routes and authorization without mock API interception.
- Specify only prototype behavior; research capabilities, network lifecycle and final IA remain unaccepted hypotheses.

## Capabilities

### New Capabilities

- `ux-research-prototype`: Isolated, navigable fictional research views and their evidence boundaries.

### Modified Capabilities

None. Existing domain invariants and real request contracts remain unchanged.

## Impact

Frontend routes, local TypeScript fixture, shared display components, browser tests and documentation. No backend, SQLite, credentials, dependency or Harness changes.
