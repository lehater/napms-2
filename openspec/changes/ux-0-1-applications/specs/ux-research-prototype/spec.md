## Purpose

Provide a bounded fictional UX research area for evaluating linked navigation before product and backend expansion.

## ADDED Requirements

### Requirement: Hierarchical application browsing
Applications SHALL list application profiles first. An application card SHALL show its component roles and related directed interactions with participants and purpose. Revisions SHALL be shown within their interaction. Existing object identities, direct URLs, related-object navigation and browser Back SHALL remain usable.

#### Scenario: Walk through a profile
- **WHEN** a user opens Applications and selects a profile, an interaction and its revision
- **THEN** the user sees participant roles, direction, purpose and immutable technical parameters in their parent context and can navigate back or reload each URL

### Requirement: Distinct object properties
The prototype SHALL distinguish actuality/lifecycle from revision immutability and read-only UI operation availability. It SHALL NOT invent domain states to fill a generic state column. Revision immutability SHALL be described as an invariant, not a mutable status or flag.

#### Scenario: Inspect profile and revision
- **WHEN** a user opens an application or revision
- **THEN** Read-only describes the interface, Current describes actuality where present, and immutable revision parameters are explained separately from lifecycle

### Requirement: Compact research presentation
The sidebar SHALL use short consistent English labels, logical groups, a slightly darker background than the work area and a visible active section. Tables SHALL omit repeated long data-nature captions while retaining that distinction in object details. Narrow layouts SHALL keep navigation and content usable without page-wide overflow.

#### Scenario: Browse at limited width
- **WHEN** a user browses Applications and its cards in a narrow window
- **THEN** the active section remains clear, content reflows or tables scroll locally, and persistent/computed semantics remain available in details

### Requirement: Baseline fluid research shell
The research prototype SHALL use the approved UI Baseline v0.1 fluid layout without a global workspace width limit, a dark sidebar initially 264px wide and adjustable from 200px to 360px using pointer and keyboard. Only the numeric sidebar preference MAY be persisted in localStorage. Eight sections, mock/API separation and narrow navigation SHALL remain usable without page overflow.

#### Scenario: Resize and reload
- **WHEN** a user adjusts the desktop sidebar and reloads
- **THEN** its width is restored within bounds and the workspace fills remaining width at 1440, 1920 and 2560px

### Requirement: Resource collection and contextual detail
Resources SHALL list existing Resource fixture objects with subject-specific columns, working search, filters and pagination. Resource detail SHALL provide Overview, Endpoints, Deployments and History with direct tab URLs, breadcrumbs and Back. Nested collections SHALL share the table pattern and distinguish children, relations and interval history without invented facts. Existing application and real request scenarios SHALL remain functional.

#### Scenario: Browse a resource
- **WHEN** a user filters/pages Resources, opens a Resource, navigates its subject tabs and related objects, and returns
- **THEN** the list context is retained, only fixture facts are displayed, and no research fetch/XHR or credentials/domain-data storage occurs
