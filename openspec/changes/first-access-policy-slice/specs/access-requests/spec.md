# Spec Delta

## Purpose

Accept a concrete network access need for stable deployed participants and immutable traffic semantics while preserving the independent distinction between request authority and permission.

## ADDED Requirements

### Requirement: Exact stable AccessSubject
An AccessSubject SHALL be identified by the exact ordered tuple (source ComponentDeployment, destination ComponentDeployment, InteractionRevision). Resource IP addresses and ConnectivityNeed SHALL NOT be part of that identity. The revision and participant references SHALL be valid and immutable for a submitted request.

#### Scenario: Valid subject
- **WHEN** source and destination deployments match the InteractionRevision's directed Component roles and the Need references that communication
- **THEN** the system resolves the same AccessSubject identity regardless of current Endpoint IP values

#### Scenario: Invalid semantics
- **WHEN** the submitted revision, deployments or Need do not correspond, or a reference does not exist
- **THEN** the API rejects the request without creating an AccessRequest or PolicyRule

### Requirement: Source-only request admission
The system SHALL check the authenticated actor's effective `access.request` grant for the source Resource at request admission time. It SHALL NOT demand a destination Resource `access.request` grant. Admission SHALL NOT itself constitute ALLOWED.

#### Scenario: Source grant without destination grant (AC-05)
- **WHEN** an actor with an effective source Resource `access.request` grant but no destination Resource request grant submits a valid subject
- **THEN** the API accepts the request and leaves it PENDING without creating a PolicyRule

#### Scenario: Missing source grant (AC-05)
- **WHEN** a valid request is submitted by an authenticated actor lacking the effective source Resource `access.request` grant
- **THEN** the API returns 403 before persisting a new request and records no DENIED decision

### Requirement: Auditable independent requests
Each accepted `POST /access-requests` SHALL create a distinct PENDING AccessRequest with its immutable subject, Need reference, submitting actor, admission timestamp and source-only authority evidence. Repeated submissions MAY reference the same subject but SHALL remain distinct requests.

#### Scenario: Accepted request
- **WHEN** a valid authorized request is submitted
- **THEN** the API returns 201 with requestId, subjectId, PENDING status, submittedAt and source authority evidence, and persists those facts

#### Scenario: Repeated request
- **WHEN** an authorized actor submits the same exact subject and Need again
- **THEN** the API creates another requestId referencing the same subjectId without creating a PolicyRule

### Requirement: Protected request retrieval
The API SHALL allow the submitting actor or an authorized decision maker to retrieve an AccessRequest and its optional terminal decision without exposing it to unrelated actors.

#### Scenario: Inspect DENIED outcome
- **WHEN** the authorized submitting actor retrieves a decided request
- **THEN** the result distinguishes the request, admission evidence and DENIED decision with no PolicyRule reference

#### Scenario: Unrelated actor
- **WHEN** a valid actor who is neither the submitter nor authorized decider requests another actor's request
- **THEN** the API returns 403 without disclosing request details
