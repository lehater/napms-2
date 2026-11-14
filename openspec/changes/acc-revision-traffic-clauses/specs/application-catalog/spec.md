# application-catalog Specification Delta

## MODIFIED Requirements

### Requirement: Directed Interaction with initial immutable revision

Each Interaction SHALL identify a directed pair of Components within one Application. Purpose SHALL describe that relationship but SHALL NOT be part of its identity. Published revisions SHALL be numbered and immutable, each containing at least one canonical TCP/UDP TrafficClause with independent source and destination ports. Editing traffic SHALL publish a new revision; duplicate or overlapping clauses SHALL be rejected.

#### Scenario: Publish initial multi-clause revision
- **WHEN** an actor creates an Interaction with two distinct valid clauses
- **THEN** exactly one Interaction and revision #1 are persisted atomically, and both clauses are visible in revision detail

#### Scenario: Reject duplicate clause
- **WHEN** a revision draft contains identical normalized protocol and port selectors more than once
- **THEN** the operation is rejected without persisting an incomplete revision

#### Scenario: Publish subsequent revision
- **WHEN** an actor publishes a changed set under an existing Interaction
- **THEN** revision number increments and the old revision and all dependent policy history remain unchanged

#### Scenario: Reject duplicate directed pair
- **WHEN** an actor attempts to create a second Interaction with the same Application, source and destination Components, regardless of purpose, protocol or ports
- **THEN** the API returns 409 and the original Interaction and its revisions remain unchanged

#### Scenario: Reverse direction remains independent
- **WHEN** an Interaction A → B already exists and an actor creates B → A
- **THEN** the second Interaction is allowed because the direction differs

#### Scenario: Legacy revision survives upgrade
- **WHEN** a version-6 database is initialized
- **THEN** old revision IDs remain resolvable as numbered snapshots containing their original single clause

## ADDED Requirements

### Requirement: Unique directed Interaction pair and safe legacy consolidation

The database SHALL enforce uniqueness of (Application, source Component, destination Component). A migration SHALL consolidate legacy duplicate pairs atomically while preserving existing Revision IDs, Need IDs and AccessSubject/PolicyRule references. When distinct current traffic can be combined, it SHALL be published as a new immutable revision. If it cannot be combined unambiguously, migration SHALL roll back without data loss.

#### Scenario: Consolidate historical duplicate pairs

- **WHEN** a v7 database contains multiple Interactions for one directed pair with compatible latest TrafficClauses
- **THEN** initialization retains one canonical Interaction, migrates legacy revision history and creates a combined published revision without altering historical policy snapshots

#### Scenario: Retain historical Need references

- **WHEN** an old ConnectivityNeed refers to an Interaction identity consolidated by migration
- **THEN** its original Need ID remains valid and old and new Revision selections resolve through a historical Interaction alias

#### Scenario: Reject direct duplicate SQL

- **WHEN** a client inserts duplicate Interaction metadata or attempts to insert a new revision under a new Interaction ID for the same pair
- **THEN** a database-level unique constraint aborts that write

#### Scenario: Unsafe merge rolls back

- **WHEN** legacy latest TrafficClauses overlap in a way that cannot be canonically combined
- **THEN** initialization reports the problematic pair and leaves original schema version and persisted records unchanged


### Requirement: Navigable Interaction and Revision details

The REAL Application catalog SHALL present Interactions as a nested collection. Each Interaction SHALL have a stable Detail route with Overview and Revisions tabs. Each published Revision SHALL have a stable nested Detail URL exposing its read-only TrafficClause collection.

#### Scenario: Browse from Application to exact Revision

- **WHEN** an actor opens the Application's Interactions tab, an Interaction, then a published Revision
- **THEN** each collection and Detail is navigable through links and breadcrumbs, and the exact Revision shows its numbered TrafficClause values

#### Scenario: Reload exact published Revision URL

- **WHEN** an authenticated actor opens or reloads the direct Revision URL
- **THEN** the same immutable revision and its TrafficClauses are resolved, independent of current selected tab

### Requirement: Separate Interaction and Revision publication drafts

Creating an Interaction or publishing a subsequent Revision SHALL use a separate draft view, not an editor inside the collection or published history. Publication SHALL navigate to the published object's Detail. Cancelling a draft or removing its TrafficClause SHALL NOT mutate published snapshots.

#### Scenario: Discard unsaved revision draft

- **WHEN** an actor adds or removes a TrafficClause in a new Revision draft and chooses Cancel
- **THEN** the draft is discarded and no new Revision is persisted

#### Scenario: Publish draft and show read-only Detail

- **WHEN** an actor publishes a valid changed Revision draft
- **THEN** the interface navigates to the newly published Revision Detail without Edit or Delete actions, and older snapshots remain available
