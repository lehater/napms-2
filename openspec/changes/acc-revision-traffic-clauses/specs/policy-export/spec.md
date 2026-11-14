# policy-export Specification Delta

## ADDED Requirements

### Requirement: Complete multi-clause policy materialization

Selected and current policy exports SHALL materialize **one policy row per TrafficClause** from the exact immutable InteractionRevision referenced by a Rule. Every row SHALL retain the same Rule and provenance identifiers and the clause-specific protocol and source/destination port selectors. A multi-clause Revision SHALL NOT be silently truncated to the first clause.

#### Scenario: Multi-clause rule
- **WHEN** an ACTIVE Rule references a Revision with TCP 443 and UDP 123 clauses
- **THEN** selected and current JSON/CSV output each contain a row for every clause with the same ruleId and distinct clauseIndex

#### Scenario: Existing historical rule
- **WHEN** a Rule references a pre-migration revision
- **THEN** it continues exporting exactly the historical one-clause traffic without changing identities
