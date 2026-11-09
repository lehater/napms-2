# business-processes Specification

## Purpose
Allow an authorized user in the existing local NAPMS interface to create and retrieve a real, persistently stored BusinessProcess independently of access permission and mocked catalog data.

## ADDED Requirements

### Requirement: Stable BusinessProcess identity and descriptive fields
The system SHALL create a BusinessProcess with a server-generated stable UUID `processId`, a nonblank `name`, and optional nullable `description` and `responsibleOrganization`. Responsible organization SHALL remain descriptive metadata and SHALL NOT confer any security grant, scope, or actor privilege. A newly created Process SHALL NOT imply a ConnectivityNeed or any access permission.

#### Scenario: Valid Process
- **WHEN** an authorized actor creates a Process with a name, description and responsible organization
- **THEN** the service returns a new Process ID and the exact persisted descriptive values, with no Need, Request or Rule created

#### Scenario: Invalid input
- **WHEN** a name is empty/whitespace-only or the client submits unsupported fields such as `actorId`, `grant` or `processId`
- **THEN** the API rejects the command and persists no Process

### Requirement: Protected BusinessProcess API
The server SHALL expose `POST /business-processes` (201), `GET /business-processes` (200) and `GET /business-processes/{processId}` (200). It SHALL resolve the actor from the existing bearer credential and require an effective server-held `business.process.create` grant on `demo-business` for POST and `business.process.read` on `demo-business` for both GET routes, prior to data disclosure or mutation. Existing `access.request`, `access.decide` and `policy.export` permissions SHALL NOT substitute for these grants. This is a local development scope only.

#### Scenario: Read and create under separate grants
- **WHEN** a valid demo requester possesses both dedicated grants
- **THEN** creation, collection read and own Process detail read succeed

#### Scenario: Missing credentials or grants
- **WHEN** a caller has no valid credential, or a valid actor lacks the required action-specific effective grant
- **THEN** the API returns 401 or 403 respectively without protected Process details, mutation or role escalation

#### Scenario: Unknown Process ID
- **WHEN** an actor with a read grant requests a nonexistent Process UUID
- **THEN** the server returns 404 and does not expose other records

### Requirement: Deterministic server-backed collection and detail
The collection SHALL return `{items,limit,offset,hasMore}` of Process DTOs ordered by `name ASC, processId ASC`. It SHALL accept only optional `limit` (1..100, default 20) and `offset` (nonnegative, default 0); unsupported parameters SHALL return 422. The Process detail SHALL return exactly the stored Process values, including explicit null for missing optional fields and for metadata not present in historical v1 records. Successful protected GET responses SHALL disable caching.

#### Scenario: Create then read
- **WHEN** an authorized actor creates a Process and reloads its collection/detail
- **THEN** both GET routes return the same Process ID, name, description and responsible organization as committed in SQLite

#### Scenario: Empty or invalid page
- **WHEN** an authorized actor requests a page beyond the collection end
- **THEN** the response contains an empty `items` array with `hasMore=false`; unsupported filters, actor selectors or invalid paging yield 422

### Requirement: Non-destructive SQLite schema upgrade
The service SHALL support creating new schema-v2 SQLite databases and upgrading existing initialized v1 databases to v2 atomically. It SHALL preserve existing Process IDs, linked Needs, Requests, Decisions, Rules, authority records, foreign keys and immutable-record protections. Existing v1 Process descriptions/names SHALL remain unknown unless actually stored; the migration SHALL NOT copy names or IDs from fictional React fixtures. Repeated demo initialization SHALL not modify user-created Processes.

#### Scenario: Legacy v1 DB
- **WHEN** the dev initializer opens an existing initialized v1 DB
- **THEN** it upgrades successfully, preserves linked historical records and triggers, and subsequently accepts and reads a newly created Process

#### Scenario: Repeat initialization and restart
- **WHEN** demo initialization runs again and the API is restarted against the existing SQLite file
- **THEN** previously created Processes and associated existing domain records remain unchanged

### Requirement: Existing UI shell uses one truthful real Process source
The client SHALL expose BusinessProcess creation, list and detail through the accepted UI/IA Baseline v0.2 shell, using only the real API for that active Process collection. The UI SHALL distinguish persisted data from fictional mock fixtures, preserve the existing seven-collection navigation, and not claim the absence of associated Needs while no real Needs read endpoint exists. An unsuccessful API request SHALL display an error, not silently display mock data.

#### Scenario: User creates a Process
- **WHEN** the user opens `Бизнес-процессы`, selects `Создать бизнес-процесс`, supplies a name and saves with a valid local demo credential
- **THEN** the UI navigates to the server-generated Process detail and the Process appears in the real collection after refresh

#### Scenario: Existing mock journey and unavailable Needs
- **WHEN** a user follows the existing explicitly labeled mock request journey or opens a real Process with no implemented real Needs read path
- **THEN** the mock journey continues to use only synthetic IDs, while the real Process detail truthfully marks Needs reading as unavailable rather than fabricating an empty relationship

### Requirement: Full real-path and regression verification
The implementation SHALL validate BusinessProcess create/list/detail in an actual browser talking to the loopback FastAPI and temporary SQLite, without mocked API routes. Tests SHALL include unauthorized read/write, invalid data, upgrade preservation, refresh, backend restart and no contamination of existing mock or AccessRequest behavior.

#### Scenario: End-to-end persistence
- **WHEN** the authorized test user creates a BusinessProcess through React and the browser refreshes or the backend restarts
- **THEN** a new authenticated GET returns the same Process from SQLite and existing real Request/Decision/Policy endpoints remain operational
