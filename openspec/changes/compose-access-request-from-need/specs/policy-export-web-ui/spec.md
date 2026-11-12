# policy-export-web-ui Specification

## Purpose

Complete the accepted REAL NID-first access journey with an authorized, saved PolicyRule detail and actual per-Rule JSON/CSV file download through the existing FastAPI policy endpoints.

## ADDED Requirements

### Requirement: REAL selected Rule detail

The browser SHALL provide a stable REAL route `/policy-rules/{ruleId}`, reachable from a saved ALLOWED AccessRequest's `policyRuleId`. It SHALL fetch `GET /policy-rules/{ruleId}` using the currently authenticated actor and render only server-returned Rule identity, ACTIVE/INACTIVE state, exact AccessSubject and originating Request/Decision/allowances. It SHALL not reconstruct policy facts from client state, substitute a MOCK Rule, or treat a decision or URL as export authority.

#### Scenario: Independent decision to Exporter handoff
- **WHEN** the Decider confirms ALLOWED and sees a server-supplied policyRuleId on the saved Request
- **THEN** a real link opens `/policy-rules/{ruleId}`, and after changing to the independently authorized Exporter actor the route displays the stored Rule without requiring Exporter to read the originating Request

#### Scenario: DENIED has no Rule detail
- **WHEN** a saved Request is DENIED and its decision contains no policyRuleId
- **THEN** the client shows the DENIED outcome without inventing a Rule or an export link

#### Scenario: Rule state and provenance
- **WHEN** an Exporter with appropriate grants opens an existing ACTIVE or INACTIVE Rule
- **THEN** the UI reports its exact server state, subject, originating Request/Decision and allowances without claiming that ALLOWED guarantees live network connectivity

### Requirement: Authorized selected-Rule JSON and CSV downloads

From REAL Rule Detail the user SHALL be able to request the **selected** Rule's `GET /policy/export?ruleId={ruleId}&format=json|csv` with the current authenticated API client. The browser SHALL save the returned bytes as `policy-rule-{ruleId}.json` or `policy-rule-{ruleId}.csv`. It SHALL preserve the existing backend JSON shape and CSV fields without synthesizing or re-evaluating policy rows, and SHALL NOT add a bulk/all-Rules export interface.

#### Scenario: Actual JSON and CSV files
- **WHEN** the authorized Exporter selects each format on a valid ACTIVE Rule
- **THEN** the browser downloads actual backend bytes for JSON and CSV; the saved artifacts contain selected ruleId, exact subject-derived traffic, Resource/Endpoint IDs, provenance, server evaluationAt and READY/INCOMPLETE information with format-appropriate serialization

#### Scenario: Inactive Rule remains inspectable
- **WHEN** an authorized Exporter opens an INACTIVE Rule and downloads its representations
- **THEN** Rule Detail still shows INACTIVE and its provenance; the JSON export has zero policy rows and CSV contains only the header, using the existing backend contracts

#### Scenario: Missing address does not disappear
- **WHEN** the server evaluates an ACTIVE Rule with a missing current Endpoint address
- **THEN** the downloaded policy row remains INCOMPLETE with a null JSON address or empty CSV field; the client does not claim a READY executable permit

### Requirement: Preserve export authority and confidential data boundaries

The client SHALL enforce the existing `policy.export` grants on **both** selected Resources through server-authorized Rule Detail/export requests. A Rule ID, ALLOWED decision or UI mode SHALL NOT confer export rights. Credentials SHALL stay out of URLs and persistent browser storage. Protected Rule content and pending downloads SHALL be invalidated on actor/credential changes.

#### Scenario: Requester and Decider cannot export
- **WHEN** a Requester or Decider without `policy.export` tries a Rule detail or export request
- **THEN** the backend rejects it with 403; the browser displays a neutral error without protected Rule fields, policy rows, addresses or download

#### Scenario: Missing or expired destination export grant
- **WHEN** an Exporter loses effective `policy.export` on either Resource before a new export
- **THEN** that export fails with 403 without leaking the selected Rule contents; a previously authorized render does not justify another protected fetch

#### Scenario: Actor changes during loading or download
- **WHEN** the operator switches from Decider to Exporter, or from Exporter to another actor, while a Rule fetch or export is pending
- **THEN** previous-session response data, errors and late download initiation do not appear in the new session; browser-created file URLs are disposed when no longer needed

### Requirement: Full real-browser exported-policy acceptance

The implementation SHALL extend the existing REAL Playwright scenario through saved PENDING, actual backend restart, independent ALLOWED, REAL Rule Detail and **downloaded** selected-rule JSON and CSV. It SHALL use temporary SQLite and the existing local-demo infrastructure without MOCK data, hardcoded credentials or a new export backend.

#### Scenario: Process to downloaded current policy
- **WHEN** Requester creates a Process/Need and submits a coherent Request, then independent Decider confirms ALLOWED and Exporter opens its REAL Rule Detail
- **THEN** Playwright observes the actual JSON and CSV downloads and inspects their bytes for the canonical Rule's ID, exact traffic, READY/INCOMPLETE state, evaluation and originating Request/Decision evidence; exactly one Rule exists for that subject

#### Scenario: Negative and regression coverage
- **WHEN** the same suite exercises DENIED, missing grants, INACTIVE and incomplete-address states
- **THEN** it verifies absence of unauthorized or invented downloads, header-only/zero-row inactive exports, retained incomplete records and unchanged source-only Request admission, without rewriting the policy-export backend
