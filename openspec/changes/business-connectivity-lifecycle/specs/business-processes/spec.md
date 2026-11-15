# Spec Delta

## Purpose

Defines management of stable BusinessProcess records, including descriptive edits and lifecycle state, while preserving linked Needs and access history.

## ADDED Requirements

### Requirement: Stable Process identity and editable description
The system SHALL keep `processId` stable while allowing authorized users to edit `name`, `description`, and `responsibleOrganization`. `name` SHALL remain nonblank, and `responsibleOrganization` SHALL NOT confer security authority.

#### Scenario: Edit Process description
- **WHEN** an authorized user updates one or more descriptive fields of an existing Process
- **THEN** the same Process ID and all linked Need, Request, Decision, Rule, and provenance references remain unchanged and the updated fields persist

#### Scenario: Invalid Process name
- **WHEN** a user submits a blank name or unsupported field in a Process update
- **THEN** the API returns 422 and leaves the Process unchanged

### Requirement: Process lifecycle
Each Process SHALL have `ACTIVE` or `ARCHIVED` status, defaulting to `ACTIVE`. Only an `ACTIVE` Process can receive a new Need or support a new AccessRequest. Archiving SHALL preserve child Need statuses and all existing access history.

#### Scenario: Archive and restore Process
- **WHEN** an authorized user archives an active Process and later restores it
- **THEN** its status changes to `ARCHIVED` and back to `ACTIVE`, its ID and related records remain stable, and an unchanged status request is idempotent

#### Scenario: Archived Process blocks new business activity
- **WHEN** a caller attempts to create a Need or submit an AccessRequest using an archived Process
- **THEN** the API returns 409 without creating a Need or Request

#### Scenario: Archived Process remains readable
- **WHEN** an authorized user lists or opens an archived Process
- **THEN** the response and REAL detail view show its `ARCHIVED` status and preserve navigation to its existing Needs and history

### Requirement: Independently authorized Process operations
Process read, create, description update, and lifecycle operations SHALL require their corresponding scoped server-held grants. Shared-read mode and descriptive organization data SHALL NOT grant write or lifecycle authority.

#### Scenario: Missing update or lifecycle grant
- **WHEN** an authenticated user without `business.process.update` or `business.process.lifecycle` attempts that operation
- **THEN** the API returns 403 and makes no change

### Requirement: Process deletion is unsupported
The system SHALL NOT physically delete a BusinessProcess or cascade changes to its Needs or access history.

#### Scenario: Attempt to delete Process
- **WHEN** a caller attempts a physical deletion of a Process
- **THEN** no Process deletion is performed and all IDs, links, and history remain intact
