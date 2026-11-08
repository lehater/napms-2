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

### Requirement: Research identity and authority distinctions
The prototype SHALL link Need to stable Interaction and its participant, while each request selects the exact immutable revision. Current Endpoint address, Site and Responsibility SHALL be labeled as temporal-history readings. Source-only RequestAuthorityEvidence SHALL be distinct from ALLOWED, decision authority and RuleAuthorizationEvidence.

#### Scenario: Inspect Need and request
- **WHEN** a user opens the Need and follows its request
- **THEN** the Need identifies Interaction and participant, the request identifies revision and source admission evidence, and the Rule identifies separate ALLOWED authorization evidence

### Requirement: Logical facts and computed views
Cards and lists SHALL distinguish persistent logical facts from computed results. TAE set/entry SHALL expose capture provenance and five normalized communication dimensions. Configured SHALL identify its input facts and interpretation limits. Required, Configured, Reconciliation and NST candidates SHALL be labeled computed; UI links SHALL NOT claim persistent TAE-to-AP/NEP relations or a physical SQL schema.

#### Scenario: Drill down to technical facts
- **WHEN** a user follows Configured to its evidence set and entry
- **THEN** source, scope, times, reliability and five dimensions are visible independently of AP/NEP, evidence is not claimed to authorize access, and Unknown, Any and empty sets remain distinct

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

### Requirement: Independent request, policy and comparison presentation
The prototype SHALL preserve the distinction between AccessRequest, PolicyRule and computed Reconciliation. The policy catalogue SHALL list PolicyRule only. Separate labelled mock request and reconciliation lists MAY appear on Overview; linked request provenance and all existing direct object URLs SHALL remain available.

#### Scenario: Browse policies and requests
- **WHEN** the user opens the policy catalogue and follows a related access request
- **THEN** the policy list contains PolicyRule only while the request displays its own decision state and provenance

### Requirement: Typed UI status semantics
The prototype SHALL label request statuses PENDING/ALLOWED/DENIED, rule states Active/Inactive and Reconciliation results Drift/Uncomparable as distinct categories. Read-only UI mode and InteractionRevision immutability SHALL appear as attributes, never as lifecycle status. The normative presentation-only status domains SHALL be recorded in `docs/contracts/ux-0-semantic-boundaries.json`.

#### Scenario: Inspect statuses and invariants
- **WHEN** the user examines an ALLOWED or DENIED request, an Active rule, a Reconciliation result, Application or InteractionRevision
- **THEN** status captions identify the relevant category, and UI read-only/immutable indicators are never shown as object status

### Requirement: Automatic UX-0 semantic contract gate
Every PR SHALL execute blocking UX-0 fixture/domain semantic contract and browser rendering regression checks in GitHub Actions. For each existing Kind the contract SHALL explicitly define a typed status category or no-status decision, and new Kind or top-level sections SHALL require an updated contract and browser coverage before merge. These checks SHALL NOT be claimed as universal validation of other UI screens or the real API. Failures SHALL report the entity, expected type/state and violation and be triaged through SDLC-04 without automatic Harness changes.

#### Scenario: Introduce a semantic regression
- **WHEN** an AccessRequest is added to the PolicyRule catalogue or assigned a PolicyRule lifecycle status
- **THEN** the semantic contract check fails before merge and identifies the violated invariant
