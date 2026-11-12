# ConnectivityNeeds — minimal REAL vertical slice

## Purpose
Allow an explicitly authorized local demo user to record and retrieve one persistent, source-initiated ConnectivityNeed linking a BusinessProcess to an existing reusable Interaction. No AccessRequest, Rule or permission is created.

## ADDED Requirements

### Requirement: Stable source-side Need identity and ownership
The system SHALL create a ConnectivityNeed with server-assigned ID and required references to one BusinessProcess, one reusable Interaction, and its source Component. One Process MAY own many distinct Needs; an Interaction MAY be reused by other Processes. A Need SHALL NOT identify a specific Revision or Deployment. Business justification, status and destination-initiated Needs are outside this slice.

#### Scenario: Multiple different needs for one process
- **WHEN** an authorized requester creates Needs for two different compatible Interactions under one Process
- **THEN** the server returns different Need identities with the same Process ID and their respective Interaction/source Component references

#### Scenario: Interaction reused across processes
- **WHEN** two BusinessProcesses select the same compatible Interaction and source Component
- **THEN** each Process may own its own independent Need and neither creation alters the other

### Requirement: Database-enforced uniqueness and safe migration
SQLite SHALL enforce uniqueness of each Need's `(process_id,interaction_id,component_id)` tuple. Duplicate creation SHALL return HTTP 409. A transactional schema v2-to-v3 migration SHALL preserve all historic rows and reject pre-existing duplicates without data loss. Fresh databases SHALL initialize at v3 and v1 upgrades SHALL remain supported.

#### Scenario: Repeated tuple
- **WHEN** two valid POST requests target the same Process, Interaction and source Component
- **THEN** exactly one Need persists and every duplicate request receives HTTP 409, with no duplicate rows

#### Scenario: Migration with historical duplicates
- **WHEN** an initialized v2 database has two distinct Need IDs with the same tuple
- **THEN** v3 migration fails atomically with a diagnostic and the original database remains at v2 with all records preserved

#### Scenario: Existing v1 database
- **WHEN** an initialized v1 database is upgraded and the existing Need tuples are unique
- **THEN** the system upgrades safely to v3, retains all historical identities and relationships and allows new authorized Need creation

### Requirement: Authorized compatible source-Interaction options
The authorized `GET /business-processes/{processId}/need-options` SHALL expose only compatible stored Revision selectors for source-side Need creation. All Revisions of an Interaction MUST agree on the Application and directed component pair. The server SHALL filter candidates before pagination and SHALL NOT expose unrelated or protected catalog metadata.

#### Scenario: Compatible revision
- **WHEN** an authorized actor reads options for an existing Process with consistent source/destination roles
- **THEN** the server returns only the allowed compatible options and their exact stored technical facts

#### Scenario: Ambiguous or inconsistent interaction
- **WHEN** the available Revisions with one Interaction ID disagree about Application, source or destination role
- **THEN** that Interaction is not selectable and the API does not disclose it as a usable candidate

#### Scenario: Unauthorized discovery
- **WHEN** an actor lacks the required grants
- **THEN** the API returns 401 or 403 without disclosing candidate IDs, fields, counts or Process existence

### Requirement: Protected Process-scoped Need list and creation
The server SHALL provide Process-scoped GET Needs, GET compatible options and POST Need endpoints. POST SHALL accept only `interactionRevisionId` and derive stable Interaction/source Component identifiers server-side in a write transaction. GET Need list SHALL return actual persisted DTOs with deterministic ordering and bounded pagination. Unauthorized or invalid operations SHALL NOT write data.

#### Scenario: Create and read persisted Need
- **WHEN** an authorized actor selects a compatible Revision and creates a Need under a Process
- **THEN** the server persists an immutable Need for the Revision's Interaction and source Component, returns its stable ID, and the authorized GET returns the same values after refresh and backend restart

#### Scenario: Unsupported body or query
- **WHEN** the client passes actor/grant/scope/explicit component fields, unsupported keys, invalid UUID, invalid limit or negative offset
- **THEN** the API returns 422 without unauthorized reads or writes

#### Scenario: Invalid or missing Process or Revision
- **WHEN** an authorized actor submits an unknown Process or nonexistent or inconsistent Revision
- **THEN** the server returns a safe error, inserts no Need and does not disclose unrelated protected catalog facts

### Requirement: Independent server-held authorization
Server-resolved actors SHALL hold effective scoped `business.need.read` to list Needs, or `business.need.create` to discover options/create a Need, together with `business.process.read`. No existing access-request, process-create, or UI actor label grants implicit Need authority. Authorization SHALL be rechecked at POST time; the scope is local-demo only.

#### Scenario: Revoked grant between selection and POST
- **WHEN** an actor reads a valid candidate but its required create grant expires before POST
- **THEN** POST returns 403, with no new Need persisted

#### Scenario: Unrelated authority
- **WHEN** an actor holds `access.request` or `business.process.create` but not the required Need grants
- **THEN** Need discovery or creation returns 403 and does not disclose compatible options or mutate the database

### Requirement: REAL Need experience in the existing UI
The existing BusinessProcess detail `Потребности` tab SHALL use the REAL API to list persisted Needs and create one through server-provided compatible options. The UI SHALL show truthful data and errors without using MOCK IDs, re-fetch after mutation/reload, and clear protected state when the actor changes. Server validation remains authoritative.

#### Scenario: End-to-end persistence
- **WHEN** a local-demo requester creates a BusinessProcess, opens its Needs tab, chooses a compatible option and creates a Need
- **THEN** the saved Need appears in the REAL tab after browser reload, re-authentication and backend restart using the same SQLite file, without a MOCK API route

#### Scenario: Duplicate attempt
- **WHEN** the user attempts to create the already existing Need for the same Process and Interaction
- **THEN** the UI communicates a non-destructive conflict and does not display a second Need

### Requirement: Full regressions and security acceptance
The change SHALL include real FastAPI/SQLite integration and browser tests for persistence, source-side consistency, dedicated grants, invalid inputs, duplicates, schema upgrades, restart and unchanged Request/Decision/Rule behavior. It SHALL not weaken existing security gates or require owner replay of MOCK Simulation.

#### Scenario: Existing policy regression
- **WHEN** the new Need slice is enabled alongside current real Request, Decision and PolicyRule flows
- **THEN** the accepted existing tests pass and creating Need does not itself create a Request, Decision or PolicyRule
