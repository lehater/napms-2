# application-catalog Specification Delta

## MODIFIED Requirements

### Requirement: Directed Interaction with published immutable revisions

Each Interaction SHALL identify an Application, directed source and destination Components, and an optional legacy-compatible purpose. Its published revisions SHALL be numbered starting at 1 and contain at least one canonical owned TrafficClause. A TrafficClause SHALL define TCP or UDP and source/destination port intervals with source ANY represented by null/null. Published snapshots SHALL be immutable; editing a draft SHALL not change persisted history. Adding a changed revision SHALL publish a new snapshot under the same Interaction identifier. Exact duplicate clauses within one revision, unchanged replacement revisions, and indistinguishable interactions with identical participants, purpose, and clauses SHALL be rejected.

#### Scenario: Publish initial multi-clause revision
- **WHEN** an actor creates an Interaction with two distinct valid clauses
- **THEN** exactly one Interaction and revision #1 are persisted atomically, and both clauses are visible in revision detail

#### Scenario: Reject duplicate clause
- **WHEN** a revision draft contains identical normalized protocol and port selectors more than once
- **THEN** the operation is rejected without persisting an incomplete revision

#### Scenario: Publish subsequent revision
- **WHEN** an actor publishes a changed set under an existing Interaction
- **THEN** revision number increments and the old revision and all dependent policy history remain unchanged

#### Scenario: Reject indistinguishable Interaction
- **WHEN** an actor creates the same pair, purpose and canonical clause set as an existing Interaction
- **THEN** the API returns conflict rather than creating a new Interaction

#### Scenario: Legacy revision survives upgrade
- **WHEN** a version-6 database is initialized
- **THEN** old revision IDs remain resolvable as numbered snapshots containing their original single clause
