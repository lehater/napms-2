# policy-export Specification Delta

## ADDED Requirements

### Requirement: Exact source-port fidelity in canonical policy
Selected and current policy exports SHALL include nullable `sourcePortStart` and `sourcePortEnd` and retain existing mandatory destination-port fields. Rule detail and Rule collection SHALL use the immutable InteractionRevision's exact source interval. NULL/NULL SHALL mean source ANY, not an inferred 1–65535 numeric range.

#### Scenario: Explicit source interval
- **WHEN** an authorized ACTIVE Rule references a revision with explicit source ports
- **THEN** Rule detail, collection, JSON and CSV preserve those exact bounds

#### Scenario: Historical ANY interval
- **WHEN** an authorized Rule references an older revision or a revision created with ANY
- **THEN** the source pair is null in JSON, empty in CSV, and not silently converted to numeric bounds
