# Spec Delta

## Purpose

Record independent trusted ALLOWED or DENIED decisions for admitted requests, derive at most one canonical PolicyRule per exact AccessSubject, and preserve decision provenance.

## ADDED Requirements

### Requirement: Independently authorized terminal decision
The system SHALL accept `POST /access-requests/{requestId}/decision` only from an actor with an effective server-held `access.decide` grant for the configured demo policy scope. An AccessRequest SHALL transition from PENDING to exactly one terminal decision.

#### Scenario: Authorized ALLOWED
- **WHEN** an authorized decision maker submits ALLOWED for a PENDING request
- **THEN** a persisted ALLOWED decision contains decisionId, requestId, actorId and decidedAt, and the request is terminal

#### Scenario: Unauthorized decision
- **WHEN** a requester lacking `access.decide` submits ALLOWED or DENIED, including with forged actor or grant data
- **THEN** the API returns 403 or rejects unsupported fields and no decision or Rule is created

#### Scenario: Already decided request
- **WHEN** any second decision is submitted to an already-decided request
- **THEN** the API returns 409 and retains the first immutable decision

### Requirement: DENIED is not a PolicyRule
A DENIED decision SHALL be stored as distinct permission evidence and SHALL NOT create a PolicyRule. A later DENIED on another request for a subject SHALL NOT implicitly revoke a previously ALLOWED Rule.

#### Scenario: First decision denied (AC-03)
- **WHEN** a previously unallowed subject receives DENIED
- **THEN** its decision is retrievable and there is no PolicyRule or export row for that subject

#### Scenario: Later DENIED after ALLOWED
- **WHEN** an authorized actor denies a new request for a subject that already has an ALLOWED Rule
- **THEN** no new Rule appears, and the existing Rule retains its state until an explicit lifecycle transition

### Requirement: One canonical Rule per exact subject
For every exact AccessSubject, the system SHALL persist at most one PolicyRule, created only on ALLOWED, initially ACTIVE. Repeated ALLOWED decisions for separate requests for the same subject SHALL reuse the Rule and retain every decision as distinct evidence.

#### Scenario: First ALLOWED (AC-01)
- **WHEN** a PENDING request for a subject without a Rule is ALLOWED
- **THEN** the system atomically creates one ACTIVE PolicyRule linked to the subject and originating ALLOWED decision

#### Scenario: Further ALLOWED (AC-04)
- **WHEN** another PENDING request for the same exact subject is ALLOWED
- **THEN** the same ruleId is returned, no second Rule is created, and the additional decision remains auditable

#### Scenario: Concurrent ALLOWED for same subject
- **WHEN** distinct requests for an identical subject are ALLOWED concurrently
- **THEN** at most one canonical PolicyRule exists and both committed decisions reference it

#### Scenario: Existing inactive Rule
- **WHEN** another request for a subject whose Rule is INACTIVE receives ALLOWED
- **THEN** the existing ruleId is reused without silently changing INACTIVE to ACTIVE

### Requirement: Stable Rule identity and provenance
A Rule SHALL retain immutable subject references and the originating request/actor/ALLOWED decision/Need, including when current Endpoint address values change. All subsequent ALLOWED decisions SHALL remain linked without replacing origin provenance.

#### Scenario: Address changes (AC-07)
- **WHEN** Endpoint IP data changes after an ALLOWED decision
- **THEN** Resource, Endpoint, AccessSubject and Rule identifiers and original decision evidence remain unchanged

#### Scenario: Additional allowance
- **WHEN** a second ALLOWED decision reuses a Rule
- **THEN** the original authorizing decision remains the Rule's origin and the later decision is separately discoverable
