# policy-export Specification Delta

## ADDED Requirements

### Requirement: Current actor-authorized policy export
The API SHALL expose `GET /policy/export/current?format=json|csv`, returning rows for each **ACTIVE** canonical PolicyRule visible under effective `policy.export` grants on both Resources. It SHALL preserve the existing selected-rule `GET /policy/export?ruleId=...&format=...` contract.

#### Scenario: Several canonical active Rules
- **WHEN** an Exporter holds effective rights on both Resources for several ACTIVE Rules and exports the current policy
- **THEN** exactly one current-policy row per eligible Rule/traffic clause is returned, regardless of how many ALLOWED Requests or allowances reference that Rule

#### Scenario: Inactive or unauthorized Rule
- **WHEN** a stored Rule is INACTIVE or one of its Resource grants is absent
- **THEN** it produces no row in the actor-authorized current export, and no hidden metadata or total is exposed

### Requirement: One committed snapshot and evaluation time
Current-policy export SHALL pin one committed SQLite read snapshot and choose one server UTC `evaluationAt` for grant checks, Rule states, Endpoint addresses and provenance across all returned rows. It SHALL NOT stitch per-Rule HTTP exports or accept caller-selected historical evaluation times.

#### Scenario: Concurrent grant or address update
- **WHEN** Resource grants or Endpoint addresses change during a policy export
- **THEN** all authorized rows reflect one pinned database view, with the same `evaluationAt`, and subsequent exports observe later committed changes

#### Scenario: Revocation after snapshot pin
- **WHEN** a grant is revoked after an export starts on a pinned snapshot
- **THEN** that in-flight evaluation MAY finish from the old view while a subsequent export uses the new grant state

### Requirement: Explicit scope and output shape
Current-policy JSON SHALL return `{scope:"authorized",evaluationAt,rows}` without `selectedRuleId`; current CSV SHALL preserve existing columns and expose the evaluation timestamp. Both SHALL preserve READY/INCOMPLETE rows and deterministic Rule order. They SHALL identify the result as **actor-authorized**, not globally complete.

#### Scenario: JSON/CSV parity
- **WHEN** an Exporter downloads JSON then CSV without relevant data changes
- **THEN** each contains the same authorized policy rows/fields and readiness, with a separately generated valid `evaluationAt` for its own request

#### Scenario: Empty current policy
- **WHEN** the actor has no visible ACTIVE Rules
- **THEN** JSON contains `rows=[]` and CSV only the header; no hidden global counts, IDs or invented permit rows are emitted

#### Scenario: INCOMPLETE address
- **WHEN** a visible ACTIVE Rule has an unavailable current Endpoint address
- **THEN** its row remains INCOMPLETE with the corresponding null JSON or empty CSV address, rather than silently disappearing
