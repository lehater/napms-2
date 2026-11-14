# application-catalog Specification Delta

## MODIFIED Requirements

### Requirement: Directed Interaction with initial immutable revision
The system SHALL allow an authorized actor to create a directed Interaction between Components in one Application with an initial immutable TCP or UDP revision. Destination ports SHALL be a required interval 1–65535. Source ports SHALL be an independently optional interval 1–65535; a source pair omitted or null/null SHALL mean ANY. A partial, inverted or out-of-bounds interval SHALL be rejected. Source and destination MAY be the same Component; deployments identify concrete placements.

#### Scenario: Create UDP NTP with dynamic source
- **WHEN** the actor creates UDP destination 123 and omits source bounds
- **THEN** the revision, API and exports preserve ANY at source and 123 at destination

#### Scenario: Create explicit independent intervals
- **WHEN** the actor submits different valid source and destination intervals
- **THEN** the system stores the exact boundaries on the immutable revision and exposes them in its detail

#### Scenario: Reject invalid source interval
- **WHEN** an actor submits a partial, inverted or out-of-bounds source or destination interval
- **THEN** the API rejects the command and persists no Interaction or revision

#### Scenario: Historical immutable records
- **WHEN** a pre-v6 database is upgraded
- **THEN** existing revision IDs, subject/rule identities and destination ports remain intact, and source NULL/NULL means ANY
