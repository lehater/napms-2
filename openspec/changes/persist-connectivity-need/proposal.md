# Proposal

## Why
Users can create persistent BusinessProcesses, but the REAL `Потребности` tab has no data-backed operation. The application cannot associate a new Process with a user-created ConnectivityNeed. The approved research in [PR #38](https://github.com/lehater/napms-2/pull/38) identifies the smallest next slice.

## What Changes
- Create and list REAL ConnectivityNeeds for a persisted BusinessProcess, choosing an existing Interaction through a server-provided, valid InteractionRevision option. The participant is the **source Component**.
- Preserve Need identity as `(processId, interactionId, sourceComponentId)` independent of Revision and Deployment. One Interaction is reusable across different Processes. Enforce a unique triple in SQLite; duplicate creation returns 409.
- Upgrade SQLite v2→v3 without losing existing records. Retain immutability, FK relations and compatibility with earlier initialized databases.
- Revalidate cross-context source/destination roles and Application consistency in the backend transaction; the UI shows only authorized compatible choices.
- Provide a REAL Needs list and create interaction within the existing BusinessProcess detail tab, with one full browser→FastAPI→SQLite E2E and negative tests.

## Capabilities
### New Capabilities
- `connectivity-needs`: minimal persisted BusinessProcess-scoped read, option discovery and create.

### Modified Capabilities
None. Existing BusinessProcess, Request/Decision/Rule, policy export, UI and local-demo security requirements remain unchanged.

## Impact
`src/napms/{storage,domain,use_cases,http,dev}.py`, the existing BusinessProcess React UI and typed API, focused pytest/Playwright, SQLite schema v3.

No new Interaction table, separate services, application-wide catalog API, request composition, Need CRUD lifecycle, `businessBasis`, `ACTIVE/RETIRED`, generalized visibility UX, mock replacement or production IAM.

## Success
A requester creates a REAL Process, selects a compatible source-side communication, creates a Need, and sees the same persisted Need after browser reload and backend restart. A second identical Need is rejected by the database-backed invariant; the same Interaction can serve another Process. Unauthorized, ambiguous or inconsistent requests do not disclose protected candidates or create partial records.
