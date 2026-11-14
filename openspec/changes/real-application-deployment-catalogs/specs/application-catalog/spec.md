# Spec Delta

## Purpose

Lets operators create and inspect application communication profiles that the REAL business-need flow can reference. It keeps component roles and directed traffic revisions coherent and immutable.

## ADDED Requirements

### Requirement: Authenticated application catalog reads
The system SHALL provide authenticated, bounded, deterministic collection and detail reads for Applications, Components, and Interactions with their current immutable revision. Reads SHALL require `catalog.read` except in shared-read local-demo mode, and SHALL remain independent of submit and decide permissions.

#### Scenario: Read application catalog
- **WHEN** an authenticated local-demo actor opens the application collection or an Application detail
- **THEN** the response includes persisted Applications and their Components and Interactions without requiring access-request or access-decision authority

#### Scenario: Unknown application detail
- **WHEN** an actor requests an Application identifier that does not exist
- **THEN** the API returns the standard not-found response without exposing unrelated records

### Requirement: Append-only Application and Component creation
The system SHALL allow an authorized catalog creator to create an Application by name and a Component by Application and name. Component names SHALL be unique within their Application, and catalog records SHALL not support update or deletion.

#### Scenario: Create an Application
- **WHEN** an actor with the catalog-create grant submits a valid nonblank Application name
- **THEN** the system persists and returns the Application with its server-assigned identifier

#### Scenario: Create a Component
- **WHEN** an authorized actor creates a Component with a unique nonblank name in an existing Application
- **THEN** the system persists and returns the Component linked to that Application

#### Scenario: Duplicate Component name
- **WHEN** an actor attempts to create a Component whose name already exists in that Application
- **THEN** the API rejects the operation and preserves the existing records

#### Scenario: Unauthorized catalog mutation
- **WHEN** an actor without the catalog-create grant attempts to create an Application or Component
- **THEN** the API rejects the operation without persisting a record

### Requirement: Directed Interaction with initial immutable revision
The system SHALL allow an authorized actor to create a directed Interaction between Components in one Application together with its first immutable TCP or UDP destination-port revision. The source and destination MAY be the same logical Component; deployments identify the concrete placements used for each role.

#### Scenario: Create directed communication
- **WHEN** an authorized actor creates an Interaction for two Components in the same Application with a valid protocol and port or port range
- **THEN** the system persists the directed Interaction and its initial revision and returns their identifiers and traffic details

#### Scenario: Create a self-interaction
- **WHEN** an authorized actor creates an Interaction whose source and destination are the same Component, with a valid protocol and port or port range
- **THEN** the system persists both directed roles and the initial revision, leaving source and destination deployments to identify the concrete placements

#### Scenario: Reject incompatible communication
- **WHEN** an actor submits Components from different Applications, an unsupported protocol, or an invalid port range
- **THEN** the API rejects the operation without creating an Interaction or revision

#### Scenario: Revision remains immutable
- **WHEN** an actor attempts to update or delete the initial revision
- **THEN** the operation is unavailable and the persisted revision remains unchanged

### Requirement: Application detail navigation
The REAL Application collection and detail SHALL use the shared collection and detail patterns, with Components and Interactions shown as tabs inside Application detail and navigable links to related records.

#### Scenario: Open related component and interaction
- **WHEN** an operator selects a Component or Interaction from an Application detail tab
- **THEN** the REAL UI opens that related detail and provides a breadcrumb path back to the Application

#### Scenario: Paginate Interaction collection
- **WHEN** an Application has more Interactions than the current bounded page
- **THEN** the Interactions tab provides previous/next navigation and retains its selected tab while changing pages

#### Scenario: Route changes do not retain another detail
- **WHEN** an operator navigates from one Component or Interaction detail to another, then opens an unknown identifier
- **THEN** the UI shows only the current detail followed by its not-found error, never stale content from the previous route

### Requirement: New communication appears in need options
After an Interaction and its initial revision are created, the existing business-process need-options flow SHALL expose that revision without requiring manual identifier entry.

#### Scenario: Select newly created communication for a need
- **WHEN** an authorized actor opens need-options after creating a compatible Interaction
- **THEN** the new directed communication and its initial revision appear as selectable options
