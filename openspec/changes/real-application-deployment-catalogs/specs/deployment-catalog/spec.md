# Spec Delta

## Purpose

Lets operators record where an existing application Component is deployed and use that placement in the REAL access-request journey. Resource records remain owned by the existing demo fixture and are only selectable here.

## ADDED Requirements

### Requirement: Authenticated deployment catalog reads
The system SHALL provide authenticated, bounded, deterministic collection and detail reads for ComponentDeployments and the Resource selector/detail data. Reads SHALL require `catalog.read` except in shared-read local-demo mode, and SHALL remain independent of submit and decide permissions.

#### Scenario: Read deployment catalog
- **WHEN** an authenticated local-demo actor opens the deployment collection
- **THEN** the response includes persisted ComponentDeployments and their linked Component, Application, and Resource references

#### Scenario: Read deployment detail
- **WHEN** an actor opens an existing ComponentDeployment detail
- **THEN** the REAL UI shows its linked Component, Application, and Resource as navigable links

### Requirement: Append-only ComponentDeployment creation
The system SHALL allow an authorized catalog creator to place an existing Component on an existing Resource. Deployment records SHALL not support update or deletion.

#### Scenario: Create a deployment
- **WHEN** an actor with the catalog-create grant selects an existing Component and Resource
- **THEN** the system persists and returns the ComponentDeployment with a server-assigned identifier and linked entities

#### Scenario: Reject an unknown relation
- **WHEN** an actor submits a Component or Resource identifier that does not exist
- **THEN** the API rejects the operation without persisting a deployment

#### Scenario: Unauthorized deployment mutation
- **WHEN** an actor without the catalog-create grant attempts to create a ComponentDeployment
- **THEN** the API rejects the operation without persisting a record

#### Scenario: Resource catalog remains read-only
- **WHEN** an operator creates a ComponentDeployment
- **THEN** the operator can select existing Resources, and no Resource or Endpoint create, update, or delete operation is introduced

### Requirement: Deployment catalog navigation
The REAL deployment collection and detail SHALL use shared collection, table, and detail patterns and link to related Component, Application, and Resource details where those REAL routes exist.

#### Scenario: Follow deployment relations
- **WHEN** an operator selects a related Component, Application, or Resource from deployment detail
- **THEN** the UI opens the corresponding REAL detail or the established return path with working breadcrumbs

#### Scenario: Route changes do not retain another detail
- **WHEN** an operator navigates from one Deployment or Resource detail to another, then opens an unknown identifier
- **THEN** the UI shows only the current detail followed by its not-found error, never stale content from the previous route

### Requirement: New deployments appear in request options
After a ComponentDeployment is created, existing need-options and access-request-options flows SHALL expose compatible placements without manual identifier entry.

#### Scenario: Select newly created placements
- **WHEN** an actor opens request options for a Need whose Interaction matches the deployed Components
- **THEN** the compatible source and destination deployments are selectable in their directed roles

#### Scenario: Reject an incompatible deployment or revision
- **WHEN** a request is composed with a deployment or revision that does not match the Need and directed Component roles
- **THEN** the existing request API rejects it and creates no AccessRequest or PolicyRule
