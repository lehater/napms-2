# policy-rules-web-ui Specification

## Purpose

Let an independently authorized policy operator browse real saved canonical Rules and reach current-policy exports, rather than needing an opaque Rule ID from a Request.

## ADDED Requirements

### Requirement: REAL PolicyRule collection in the main navigation
The REAL main Sidebar SHALL include `Правила политики`, linked to an authenticated collection of stored canonical Rules. It SHALL preserve `Бизнес-процессы` and `Заявки на доступ` as REAL collections and SHALL NOT restore MOCK catalogue links.

#### Scenario: Open policy without a known Rule ID
- **WHEN** an authorized Exporter selects `Правила политики` in the main Sidebar
- **THEN** the browser shows real backend Rules with meaningful source→destination/traffic labels, distinct ACTIVE/INACTIVE state and links to the existing Rule Detail

#### Scenario: One Rule with multiple allowances
- **WHEN** two ALLOWED decisions refer to the same exact AccessSubject
- **THEN** the collection lists the canonical Rule once and its Detail retains both allowances

### Requirement: Protected bounded Rule listing
`GET /policy-rules` SHALL return `{items,limit,offset,hasMore}` with `limit` 1..100 (default 20) and nonnegative `offset` (default 0). It SHALL include only Rules for which the actor has effective `policy.export` on both Resources, filter before pagination, and reveal no inaccessible Rule IDs, counts, endpoints or provenance.

#### Scenario: Mixed-resource grants
- **WHEN** some persisted Rules reference a Resource outside the Exporter's effective authority
- **THEN** list pages and `hasMore` reflect only fully authorized Rules, without a global total or a gap representing a hidden Rule

#### Scenario: Inactive Rule
- **WHEN** a fully authorized Rule has state INACTIVE
- **THEN** it remains in the collection with INACTIVE state and an inspectable provenance link but is not represented as currently effective policy

#### Scenario: Invalid query and missing credential
- **WHEN** query parameters are invalid or unsupported, or no valid bearer credential exists
- **THEN** the API returns the established sanitized 422 or 401 response, respectively, without Rule data

### Requirement: Human-readable Rule and Request navigation
The Rule list SHALL prioritize the server-produced exact Subject label, typed traffic and state, with UUID as secondary copyable metadata. It SHALL provide working Rule Detail, selected-Rule JSON/CSV actions and a direct link back to the REAL collection from the Detail route.

#### Scenario: Rule from ALLOWED Request
- **WHEN** the user opens a stored Rule via its ALLOWED Request or directly from the Rule collection
- **THEN** the same REAL Rule detail is shown, with accessible breadcrumbs and navigation to the Rule collection and Requests

#### Scenario: No fake explanation of missing rules
- **WHEN** the actor has no visible Rules
- **THEN** the UI states that no Rules are available **to that actor**, without claiming the system contains no Rules

### Requirement: Current authorized policy is a view, not a Rule
The Rule collection SHALL offer `Выгрузить доступную текущую политику` in JSON and CSV using the new single-snapshot API. The UI SHALL distinguish current ACTIVE export rows from stored INACTIVE Rules and SHALL NOT label the result a complete global policy.

#### Scenario: Download policy snapshot
- **WHEN** Exporter requests the current-policy JSON and CSV formats
- **THEN** the browser saves actual server response bytes for all actor-authorized ACTIVE Rules, with `evaluationAt` and READY/INCOMPLETE facts preserved

#### Scenario: Credential change while downloading
- **WHEN** a user changes actor/credential during protected listing or an export request
- **THEN** the UI clears previous-session Rule data, ignores stale responses and prevents initiating a late download from the previous session
