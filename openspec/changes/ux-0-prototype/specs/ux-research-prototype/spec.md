## Purpose

Provide a bounded fictional UX research area for evaluating linked navigation before product and backend expansion.

## ADDED Requirements

### Requirement: Isolated research navigation
The web client SHALL expose a token-free `/prototype` area with eight read-only views, grouped navigation, breadcrumbs, URL-addressable object cards and searchable lists. Every view SHALL identify MOCK / FICTIONAL NETWORK DATA. Real request routes SHALL remain accessible without passing fictional identifiers to the API.

#### Scenario: Follow a fictional object
- **WHEN** a user opens Resources and selects a resource
- **THEN** its card links to related placements and supports browser back, reload and direct URL entry without API calls

#### Scenario: Return to real requests
- **WHEN** a user leaves the prototype for `/access-requests/new`
- **THEN** the existing credential entry and real UUID form are used with no fictional references

### Requirement: Coherent fictional communication
The prototype SHALL use one deterministic fixture linking Resource, ComponentDeployment, InteractionRevision, ConnectivityNeed, PolicyRule, TargetRequiredPolicy, ConfiguredEffectivePolicySnapshot and Reconciliation. It SHALL use one Endpoint per Resource and one revision. Intentional request evidence SHALL include BusinessProcess and Need; declared policy SHALL contain permits only.

#### Scenario: Inspect provenance
- **WHEN** a user follows the linked chain from Resource to Reconciliation
- **THEN** the same communication and business justification remain identifiable, including ALLOWED provenance and a separate DENIED request that neither creates a rule nor revokes the existing one

### Requirement: Honest network evidence
The prototype SHALL show at least one required/configured mismatch and explicit Unknown and Uncomparable states for insufficient evidence. It SHALL distinguish request DENIED from NST DENY, identify candidate target uncertainty and fictional snapshot provenance, and SHALL NOT execute network changes, revoke access or switch revisions.

#### Scenario: Compare evidence
- **WHEN** a user opens the demo comparison
- **THEN** required TCP/443 missing and excess configured TCP/8443 produce Drift, while an unknown candidate snapshot produces Uncomparable rather than success

### Requirement: Prototype and real-flow verification
Browser checks SHALL verify navigation, linked fixture integrity and absence of prototype API requests. The existing real FastAPI/SQLite E2E SHALL remain in use without API interception.

#### Scenario: Run browser checks
- **WHEN** the frontend verification suite runs
- **THEN** prototype navigation and real create/list/detail/ALLOWED/DENIED and authorization regressions are checked independently
