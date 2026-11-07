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
