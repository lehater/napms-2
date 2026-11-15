# Spec Delta

## Purpose

Defines the detail, editable business basis, and lifecycle of persisted ConnectivityNeeds without changing their identity or rewriting access history.

## ADDED Requirements

### Requirement: Stable Need identity and editable basis
The system SHALL preserve `connectivityNeedId`, `processId`, `interactionId`, and source `componentId`. An authorized user MAY set a nonblank `businessBasis`; historical rows MAY retain `NULL` until corrected. Changing Interaction or participant requires a distinct Need.

#### Scenario: Edit business basis
- **WHEN** an authorized user sets a nonblank business basis on a Need
- **THEN** the same Need ID and identity tuple remain, and the basis persists after reload

#### Scenario: Preserve missing historical basis
- **WHEN** an existing Need has no factual business basis in the database
- **THEN** it remains readable with `businessBasis = NULL` until an authorized user supplies a nonblank basis

#### Scenario: Change Need identity
- **WHEN** a caller attempts to change the Process, Interaction, or participant of an existing Need
- **THEN** the API rejects the update with 422 and leaves the Need unchanged

### Requirement: Stable Need detail and history navigation
Each Need SHALL have an authorized detail resource and a stable REAL deep link showing its Process, Interaction, participant, business basis, status, and related Requests. Request composition SHALL start from that Need detail.

#### Scenario: Open Need detail
- **WHEN** an authorized user follows a Need link from its Process
- **THEN** the detail route resolves the persisted Need by ID and provides navigation to its Process and related request history

#### Scenario: Unknown or mismatched Need
- **WHEN** a user opens a nonexistent Need or supplies a Need that does not belong to the Process in the URL
- **THEN** the API returns 404 without exposing another Process's Need

### Requirement: New Need requires business basis
Creation of a new ConnectivityNeed SHALL require a nonblank `businessBasis` of at most 10,000 characters in addition to a valid Interaction choice.

#### Scenario: Create Need with basis
- **WHEN** an authorized user creates a Need for an active Process with a nonblank basis and valid Interaction
- **THEN** the API stores the basis with the new Need and returns its stable ID

#### Scenario: Create Need without basis
- **WHEN** an authorized user omits or submits a blank `businessBasis` while creating a Need
- **THEN** the API returns 422 and creates no Need

#### Scenario: Clear a supplied basis
- **WHEN** an authorized user attempts to clear a Need's supplied business basis
- **THEN** the API returns 422 and leaves the existing basis unchanged

### Requirement: Need lifecycle and unique tuple reservation
Each Need SHALL have `ACTIVE` or `RETIRED` status, defaulting to `ACTIVE`. Retiring a Need SHALL preserve its unique `(processId, interactionId, componentId)` tuple; only the same Need may be restored, and only while its Process is `ACTIVE`.

#### Scenario: Retire and restore Need
- **WHEN** an authorized user retires an active Need and later restores it under an active Process
- **THEN** its status changes to `RETIRED` and back to `ACTIVE` with the same ID and tuple

#### Scenario: Repeat current Need status
- **WHEN** an authorized user requests the Need's current lifecycle status
- **THEN** the API returns the current Need without changing its ID, tuple, or history

#### Scenario: Duplicate tuple while retired
- **WHEN** a caller tries to create a Need using a tuple reserved by an existing retired Need
- **THEN** the API returns 409 and directs the caller to restore the existing Need; no second Need is created

#### Scenario: Restore under archived Process
- **WHEN** a caller attempts to restore a retired Need whose Process is archived
- **THEN** the API returns 409 and the Need remains `RETIRED`

### Requirement: Retired Need preserves history and blocks new requests
A retired Need SHALL remain readable and SHALL NOT support a new AccessRequest. Existing Requests, Decisions, Rules, justifications, and provenance SHALL remain available and unchanged.

#### Scenario: Submit request for retired Need
- **WHEN** an authorized requester submits an AccessRequest for a retired Need
- **THEN** the API returns 409 without creating a Request, Decision, or Rule

#### Scenario: Inspect retired Need history
- **WHEN** an authorized user opens a retired Need with existing requests
- **THEN** the detail view shows the retired status and links to the unchanged request and policy history

### Requirement: Independently authorized Need operations
Need read, create, basis update, and lifecycle operations SHALL require their corresponding scoped server-held grants and the associated Process read grant. Shared-read mode SHALL NOT confer write or lifecycle authority.

#### Scenario: Missing Need update or lifecycle grant
- **WHEN** an authenticated user without `business.need.update` or `business.need.lifecycle` attempts that operation
- **THEN** the API returns 403 and makes no change

### Requirement: Need deletion is unsupported
The system SHALL NOT physically delete a ConnectivityNeed or cascade changes to Requests, Decisions, Rules, or provenance.

#### Scenario: Attempt to delete Need
- **WHEN** a caller attempts a physical deletion of a Need
- **THEN** no Need deletion is performed and all IDs, links, and history remain intact
