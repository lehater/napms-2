# ConnectivityNeeds — minimal REAL vertical slice

## Purpose
Allow an explicitly authorized local demo user to record and retrieve one persistent, source-initiated ConnectivityNeed linking a BusinessProcess to an existing reusable Interaction. No AccessRequest, Rule or permission is created.

## ADDED Requirements

### Requirement: Stable source-side Need identity and ownership
The system SHALL create each ConnectivityNeed with a server-generated stable `connectivityNeedId`, an existing `processId`, a reusable `interactionId` and the Interaction's **source** `componentId`. Each Need SHALL belong to exactly one BusinessProcess. One BusinessProcess MAY own multiple distinct Needs; different BusinessProcesses MAY reference the same Interaction. Need SHALL NOT store an InteractionRevision ID, Deployment ID or address. The first slice SHALL NOT implement `businessBasis`, `ACTIVE/RETIRED`, editing, retirement or destination-initiated Needs.

#### Scenario: Multiple different needs for one process
- **WHEN** an authorized requester creates Needs for two different compatible Interactions under one Process
- **THEN** the server returns different Need identities with the same Process ID and their respective Interaction/source Component references

#### Scenario: Interaction reused across processes
- **WHEN** two BusinessProcesses select the same compatible Interaction and source Component
- **THEN** each Process may own its own independent Need and neither creation alters the other

### Requirement: Database-enforced uniqueness and safe migration
SQLite SHALL enforce a unique tuple `(process_id,interaction_id,component_id)` for ConnectivityNeed. A duplicate SHALL fail without creating a second Need, even when the selected InteractionRevision differs or requests race. The system SHALL atomically migrate initialized SQLite schema v2 to v3, preserving all existing records, immutable triggers, FKs and the previously accepted v1 migration. Existing duplicate tuples SHALL cause safe migration failure without silently deleting or modifying historical rows. Fresh databases SHALL initialize at v3. Existing valid requests, decisions and rules SHALL remain usable.

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
The server SHALL provide a narrowly scoped `GET /business-processes/{processId}/need-options` that returns only authorized and internally consistent existing InteractionRevision options suitable for a **source-side** Need. The response SHALL use actual stored Revision identities, Interaction IDs, Application and Component IDs and protocol/port ranges; it SHALL NOT invent display facts, include unrelated deployments/resources or leak hidden global totals. The service SHALL verify that each candidate Revision's source and destination Components belong to its Application and that all known Revisions of the same Interaction agree on Application and directed component pair. Filtering SHALL occur before bounded pagination.

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
The server SHALL provide `GET /business-processes/{processId}/needs` and `POST /business-processes/{processId}/needs`. GET SHALL return `{items,limit,offset,hasMore}` with actual Need DTO `{connectivityNeedId,processId,interactionId,componentId}`, ordered by stable Need ID. GETs SHALL use `limit` 1..100, nonnegative `offset`, a bounded default and no global total; protected responses SHALL set `Cache-Control: no-store`. POST SHALL accept only `{interactionRevisionId: UUID}` and return 201 with the persisted DTO. The server SHALL derive Interaction and source Component from the selected Revision, re-checking all consistency in the same write transaction before insertion. Unauthorized and invalid requests SHALL NOT create any records.

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
The server SHALL resolve actor identity from the trusted existing bearer/local-demo proxy. The local demo SHALL require dedicated effective `business.need.read` for Need list and `business.need.create` for candidate discovery and creation, both scoped to `demo-business`, together with `business.process.read` for associated Process access. Grants SHALL be evaluated server-side at operation time, including validity windows and changes between option read and POST. Existing BusinessProcess create/read, `access.request`, `access.decide`, `policy.export`, UI actor labels or Process responsibility SHALL NOT implicitly authorize a Need operation. This local-demo policy SHALL NOT define production catalog visibility.

#### Scenario: Revoked grant between selection and POST
- **WHEN** an actor reads a valid candidate but its required create grant expires before POST
- **THEN** POST returns 403, with no new Need persisted

#### Scenario: Unrelated authority
- **WHEN** an actor holds `access.request` or `business.process.create` but not the required Need grants
- **THEN** Need discovery or creation returns 403 and does not disclose compatible options or mutate the database

### Requirement: REAL Need experience in the existing UI
The React BusinessProcess detail SHALL display the actual Process-scoped Needs and provide a minimal create workflow on its existing `Потребности` tab. It SHALL offer only server-authorized compatible communication choices, show truthful source/destination and traffic hints, re-fetch persisted data after mutation, and distinguish loading, empty, unauthorized, conflict and failure states. Client-side filtering SHALL NOT substitute server-side verification. MOCK fixtures SHALL NOT be submitted as REAL IDs. Actor switch SHALL discard protected state.

#### Scenario: End-to-end persistence
- **WHEN** a local-demo requester creates a BusinessProcess, opens its Needs tab, chooses a compatible option and creates a Need
- **THEN** the saved Need appears in the REAL tab after browser reload, re-authentication and backend restart using the same SQLite file, without a MOCK API route

#### Scenario: Duplicate attempt
- **WHEN** the user attempts to create the already existing Need for the same Process and Interaction
- **THEN** the UI communicates a non-destructive conflict and does not display a second Need

### Requirement: Full regressions and security acceptance
Automated tests SHALL cover successful creation, separate Process/Need authorization, invalid or expired grants, incompatible or ambiguous revisions, missing records, strict request validation, concurrent duplicates, migration and data preservation, restart, actor switch and existing Request/Decision/Rule functionality. The full real browser path SHALL use FastAPI and SQLite, not mocked responses. This change SHALL NOT weaken any existing server security gates or require manual replay of the retired MOCK Simulation for owner acceptance.

#### Scenario: Existing policy regression
- **WHEN** the new Need slice is enabled alongside current real Request, Decision and PolicyRule flows
- **THEN** the accepted existing tests pass and creating Need does not itself create a Request, Decision or PolicyRule
