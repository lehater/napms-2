# Proposal

## Why

The REAL request flow currently depends on the demo fixture for Applications, Components, Interactions, and Deployments. Operators need to create these records through the product so a new local-demo database can carry a business need through an authorized request and decision to its PolicyRule.

## What Changes

- Add REAL Application and deployed Component catalogs with create, list, and detail flows; records remain append-only.
- Add directed Interactions and their first immutable TCP/UDP port revision inside an Application detail.
- Add a read-only Resource selector and REAL Deployment catalog with create, list, and detail flows.
- Expose the created records to existing need and access-request option endpoints without requiring users to copy identifiers.
- Keep catalog reads visible in local-demo while protecting catalog mutations with server-side authorization; preserve existing submit and decision checks.
- Reuse SQLite v5 tables and established REAL UI patterns; do not add editing, deletion, Endpoint management, or a general CRUD framework.

## Capabilities

### New Capabilities
- `application-catalog`: Create and read Applications, their Components, and directed Interaction revisions.
- `deployment-catalog`: Create and read ComponentDeployments against existing Resources.

### Modified Capabilities
- None. Existing access-request and decision contracts remain unchanged; newly created records become available through their existing option flows.

## Impact

Affected areas include `src/napms/storage.py`, `src/napms/use_cases.py`, `src/napms/http.py`, `src/napms/dev.py`, the REAL React routes/navigation/API, and focused backend and Playwright coverage. The current grant table can protect catalog reads and creation without a database migration; the local demo profile will need an explicit catalog-create grant. Existing `applications`, `application_names`, `components`, `component_names`, `interaction_revisions`, and `deployments` tables are reused.
