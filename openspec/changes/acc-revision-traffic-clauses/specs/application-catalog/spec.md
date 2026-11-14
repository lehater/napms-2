# application-catalog Specification Delta

## MODIFIED Requirements

### Requirement: Directed Interaction with initial immutable revision

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

## ADDED Requirements

### Requirement: Hierarchical navigation for Interaction revisions and owned clauses

The REAL Application catalog SHALL present Interactions as a nested collection of the Application without mixing the creation form into the list. Every Interaction SHALL have a stable Detail route, with an Overview and a Revisions collection. Each published Revision SHALL have a stable Detail URL nested under the Interaction and SHALL expose a read-only collection of its TrafficClauses. Creating an Interaction or publishing a subsequent Revision SHALL use a separate draft view and SHALL navigate to the published object. A draft's removal/cancellation SHALL NOT mutate published snapshots.

#### Scenario: Browse from Application to exact Revision

- **WHEN** an actor opens the Application's Interactions tab, an Interaction, then a published Revision
- **THEN** each collection and Detail is navigable through links and breadcrumbs, and the exact Revision shows its numbered TrafficClause values

#### Scenario: Reload exact published Revision URL

- **WHEN** an authenticated actor opens or reloads the direct Revision URL
- **THEN** the same immutable revision and its TrafficClauses are resolved, independent of current selected tab

#### Scenario: Discard unsaved revision draft

- **WHEN** an actor adds or removes a TrafficClause in a new Revision draft and chooses Cancel
- **THEN** the draft is discarded and no new Revision is persisted

#### Scenario: Publish draft and show read-only Detail

- **WHEN** an actor publishes a valid changed Revision draft
- **THEN** the interface navigates to the newly published Revision Detail without Edit or Delete actions, and older snapshots remain available
