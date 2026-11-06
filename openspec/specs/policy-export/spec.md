# policy-export Specification

## Purpose

Produce an authorized, coherent snapshot of current effective network access policy with stable identities, explainable provenance and vendor-neutral READY/INCOMPLETE JSON or CSV rows.

## Requirements

### Requirement: Scoped policy export authorization
For `GET /policy/export`, the system SHALL authorize the resolved actor's effective `policy.export` grant against BOTH source and destination Resource scopes of the selected Rule. It SHALL not expose selected policy details to an unauthorized caller.

#### Scenario: Effective export grants (AC-01)
- **WHEN** an actor has effective `policy.export` authority for both Resources of the selected Rule
- **THEN** the selected effective policy can be evaluated

#### Scenario: Missing required scope (AC-06)
- **WHEN** an actor lacks `policy.export` on either selected Resource
- **THEN** export returns 403 without any policy row, addresses or provenance

### Requirement: Only effective Rules produce export rows
The selected policy SHALL include rows only for a Rule backed by an ALLOWED decision and currently ACTIVE at evaluationAt. An INACTIVE Rule SHALL remain stored and readable by an appropriately authorized actor but SHALL produce no effective export row.

#### Scenario: Active Rule
- **WHEN** a selected Rule is ACTIVE at evaluationAt
- **THEN** its traffic clauses are eligible for export materialization

#### Scenario: Inactive Rule (AC-08)
- **WHEN** a previously ALLOWED Rule is made INACTIVE and export is requested
- **THEN** JSON returns zero rows and CSV returns only the header, while authorized Rule details still show INACTIVE and provenance

### Requirement: Readiness without data loss
For each effective traffic clause the system SHALL emit READY only when both source and destination Endpoint current addresses are available; otherwise it SHALL emit INCOMPLETE with null for any missing address, retaining Resource/Endpoint/Rule identity and traffic semantics. INCOMPLETE SHALL not be represented as an executable permit.

#### Scenario: Complete realization (AC-01)
- **WHEN** both Endpoint addresses are present for one ACTIVE Rule with one TCP/UDP traffic clause
- **THEN** exactly one READY row contains source/destination addresses, exact protocol/ports, identities, evaluationAt and provenance

#### Scenario: Missing destination address (AC-02)
- **WHEN** the destination Endpoint of an ACTIVE Rule lacks a current address
- **THEN** exactly one INCOMPLETE row remains with null destinationAddress and the same ruleId, traffic and provenance

### Requirement: Current IP realization preserves identity
Export SHALL use the current address realization at the evaluation moment and SHALL NOT change historical requests, decisions, Rule identity or traffic revision when an Endpoint address changes.

#### Scenario: Two export evaluations (AC-07)
- **WHEN** the same Rule is exported, its Endpoint IP changes, and it is exported again
- **THEN** the second export displays the updated IP and a new evaluationAt while all domain identifiers and originating permission evidence remain stable

### Requirement: Coherent single evaluation
Each export SHALL evaluate scoped grants, Rule effectiveness, current Endpoint realizations and provenance using one committed database snapshot. The authorization decision and exported rows SHALL use facts from that same snapshot.

#### Scenario: Consistent snapshot
- **WHEN** current IP, grants or Rule state are committed concurrently with an export
- **THEN** every returned row and authority decision comes from one pinned snapshot, not a mix of old and new facts

### Requirement: Consistent evaluation timestamp
Each export SHALL report one server-selected UTC `evaluationAt` and use it for all time-dependent grant validity and Rule effectiveness checks. It denotes evaluation of a current committed snapshot, not an exact historical database version. An export already running when a grant is revoked MAY complete based on its earlier pinned snapshot.

#### Scenario: Evaluation of time-bounded grants
- **WHEN** an export checks grants with `valid_from` and `valid_until` boundaries
- **THEN** every grant uses the same `evaluationAt`, with inclusive start and exclusive end boundaries

#### Scenario: Revocation during export
- **WHEN** a grant is revoked after the export has pinned its snapshot
- **THEN** the in-progress export MAY complete using that snapshot and a subsequent export MUST see the committed revocation

#### Scenario: Client supplied historical evaluationAt
- **WHEN** the client attempts to request an arbitrary historical evaluation timestamp
- **THEN** the API rejects the unsupported parameter rather than implying historical replay

### Requirement: Machine-readable JSON and CSV
The API SHALL support JSON and CSV representations for a selected ruleId, preserving consistent column semantics and provenance: ruleId, subjectId, Resource/Endpoint IDs, nullable addresses, protocol/ports, originating request and actor, decision and actor, Need, revision, readiness and evaluationAt. CSV null addresses SHALL be empty cells; no row SHALL be silently dropped.

#### Scenario: JSON and CSV parity (AC-01/AC-02)
- **WHEN** an authorized actor requests JSON and then CSV without intervening data changes
- **THEN** both formats expose equivalent policy fields and readiness, with evaluationAt exposed in each response

#### Scenario: Missing selected Rule
- **WHEN** a selected ruleId does not exist
- **THEN** the API returns 404 and no export rows

### Requirement: Authorized inactive Rule inspection
The API SHALL expose an individual Rule's current state, subject and permission provenance through `GET /policy-rules/{ruleId}` only when the actor has `policy.export` authority for both Resources.

#### Scenario: Inspect inactive Rule (AC-08)
- **WHEN** an authorized actor requests an INACTIVE Rule after an empty export
- **THEN** the Rule remains discoverable with its identity, INACTIVE state and originating permission evidence

#### Scenario: Unauthorized inspection
- **WHEN** an actor without the required export grants requests Rule details
- **THEN** the API returns 403 without revealing protected Rule details
