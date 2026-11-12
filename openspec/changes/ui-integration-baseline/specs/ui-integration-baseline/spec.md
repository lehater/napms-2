# ui-integration-baseline Specification

## Purpose
Integrate the accepted NAPMS UI/IA Baseline v0.2 into one real/mock-aware browser shell before expanding the backend catalog.

## ADDED Requirements

### Requirement: Single application shell and canonical Sidebar
Every real and mock route SHALL render within one shared full-width Shell using one common topbar, Sidebar, breadcrumbs and page layout. The Sidebar SHALL show the three accepted groups and exactly seven collection entries in Baseline v0.2 order. Available real BusinessProcess and AccessRequest collections SHALL use their live routes; other collections SHALL remain explicitly labelled MOCK.

#### Scenario: Navigate real collections
- **WHEN** a developer opens either the Process or Request real page
- **THEN** the same resizable Sidebar and page layout are visible, and switching between these collections does not open an independent application shell

#### Scenario: Navigate mock collection
- **WHEN** a developer opens a not-yet-integrated collection
- **THEN** the page is clearly marked MOCK and uses the same Shell without mixing fictitious records into a real API collection

### Requirement: Deterministic entry and preserved direct routes
The browser SHALL redirect `/` to `/business-processes`, keep existing Process, Request and `/prototype/*` direct URLs functional, and show an explicit Not Found page for unknown URLs. Existing mock Need→Request→Rule links and back-navigation SHALL remain usable.

#### Scenario: Root and deep links
- **WHEN** a developer loads `/` and then opens a previously bookmarked real Process or Request detail
- **THEN** the root goes to the real BusinessProcess collection, while each bookmarked URL opens its original persisted object with common breadcrumbs

#### Scenario: Existing mock scenario
- **WHEN** a developer follows the accepted `/prototype/needs/mock-need?tab=communication` journey
- **THEN** request submission and decision remain browser-only simulation, and every mock deep link remains reachable

### Requirement: One context-specific actor control
In explicit local-demo mode, the shared Shell SHALL show one real Demo actor selector on real pages and SHALL NOT show the legacy request Demo mode selector. Mock pages SHALL distinguish their independent simulated actor and shall not conflate it with the real API actor. Changing the real actor SHALL clear protected UI data and pending actions without changing backend grants or existing SQLite records.

#### Scenario: Requester to Decider
- **WHEN** the developer switches from Requester to Decider on a real Request page
- **THEN** prior Requester data/confirmation is cleared, decision affordances reflect the new selected actor, and FastAPI still determines authorization

#### Scenario: Independent mock role
- **WHEN** a developer enters an explicitly labelled MOCK journey
- **THEN** the simulated role controls only mock transitions and cannot grant a real API permission

#### Scenario: Manual bearer compatibility
- **WHEN** the app runs without the explicit local-demo profile
- **THEN** protected real API operations still use a manually entered in-memory bearer credential and continue to rely on server-side authorization

### Requirement: Baseline collection and detail composition
Real BusinessProcess and AccessRequest list/detail screens SHALL use the accepted collection-to-detail structure: a subject-specific table, page title, readable properties, breadcrumbs and horizontal contextual tabs where applicable. Real screens SHALL use consistent primary actions, loading, empty and error states, and SHALL NOT display fictional associated data as real.

#### Scenario: BusinessProcess detail without Needs API
- **WHEN** a user opens a persisted BusinessProcess
- **THEN** Overview shows its server facts, and the `Потребности` tab states that real reading is not connected rather than claiming zero Needs or showing fixture items

#### Scenario: Request detail and decision
- **WHEN** an authorized Decider opens a real PENDING Request and confirms a decision
- **THEN** its Overview and Decision/evidence display only persisted server responses; terminal states remain ALLOWED or DENIED without invented PolicyRules

### Requirement: Preserve existing security and domain boundaries
UI integration SHALL leave FastAPI authority checks, local proxy credential substitution, SQLite schema, access-subject identity, decision semantics and policy export unchanged. A real API path SHALL never silently fall back to a mock fixture after a 401, 403, network error or server failure.

#### Scenario: Unauthorized actor
- **WHEN** an anonymous or insufficiently granted demo actor requests protected real Process or Request data
- **THEN** the UI surfaces the backend 401 or 403 without a mock fallback or privilege escalation

### Requirement: Full end-to-end and viewport regression
The implementation SHALL verify root navigation, common Shell, both real collections, actor switching and unchanged mock journeys using actual loopback FastAPI and SQLite. It SHALL preserve semantic-contract and security tests, and verify usable layouts at 1920×1080, 1440×900, 2560×1440 and 390 px without horizontal page overflow.

#### Scenario: Owner acceptance
- **WHEN** a developer runs the documented one-command local-demo and walks from root to Process creation, then Request decision and back
- **THEN** the UI uses one Shell, persisted data survive reload and backend restart, one relevant actor control is visible, and previously accepted mock flows still pass
