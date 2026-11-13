# semantic-display-labels Specification

## Purpose

Render existing domain objects in meaningful, authoritative language without replacing immutable identities or demanding artificial names.

## ADDED Requirements

### Requirement: Catalog entities own intrinsic names
Resource SHALL have operator-supplied hostname/FQDN-style display metadata, Application SHALL have an operator-supplied profile name, and Component SHALL have a name in its Application context. BusinessProcess SHALL retain its existing name. These descriptive values SHALL NOT be used as stable IDs or automatically inferred from Endpoint IP addresses.

#### Scenario: Named catalog facts
- **WHEN** the operator views a seeded Resource, Application, Component or BusinessProcess in an authorized REAL flow
- **THEN** the user-entered or explicitly seeded name is presented ahead of the stable UUID, without a synthetic alias from the research fixture

#### Scenario: Historical object without a name
- **WHEN** an existing SQLite v3 record has no name after additive migration
- **THEN** the UI identifies the missing name explicitly and exposes its stable UUID as secondary technical context without fabricating a hostname or component name

### Requirement: Stable identities survive name metadata migration
The name schema change SHALL preserve Resource, Application, Component, Deployment, AccessSubject, Request, Decision and Rule IDs and relationships. Existing historical data, credentials and grants SHALL survive an explicit idempotent migration. Immutable structural identity SHALL remain protected even if display metadata can be updated separately.

#### Scenario: Existing v3 data
- **WHEN** an initialized v3 database is upgraded with existing requests and canonical Rules
- **THEN** previous API identities, permission evidence and decisions remain valid, and new optional name metadata does not require replacing rows or resetting credentials

#### Scenario: Demo seed
- **WHEN** demo data is reinitialized after upgrade
- **THEN** synthetic names are seeded for known demo catalog entities only, with no unexpected rewrite of user values or renewal of expired grants

### Requirement: Derive labels for relational entities
The server SHALL provide deterministic presentation labels from the target entity's authorized attributes and links: Interaction from directed Components; Revision from Interaction plus exact traffic; Deployment from Component and Resource; Need from Process and Interaction; Request and Rule from exact deployed Subject and traffic. AccessDecision SHALL use outcome and Request context.

#### Scenario: Repeatable name-free label
- **WHEN** two requests share one exact AccessSubject
- **THEN** both may have the same descriptive traffic label while their request IDs, statuses, dates and provenance remain distinct

#### Scenario: Canonical Rule used by several Needs
- **WHEN** multiple ALLOWED decisions for distinct Requests reference one canonical Rule
- **THEN** its displayed identity is based on exact AccessSubject, not an arbitrarily chosen Process, Need or decision

#### Scenario: Need independent of Revision
- **WHEN** a Need references an Interaction whose revisions differ in traffic
- **THEN** the Need label identifies Process and directed Components without pinning a particular port; selected Revision is shown separately in the composition context

### Requirement: Canonical typed traffic display
For currently supported TCP/UDP destination port intervals, labels SHALL use lowercase protocol tokens and `protocol(port)` or `protocol(start-end)`, e.g. `tcp(443)` and `udp(5353-5355)`. The renderer SHALL preserve actual port semantics, not concatenate UUIDs or client-invented strings.

#### Scenario: Single port and range
- **WHEN** a valid InteractionRevision stores TCP with ports 443–443 or UDP with ports 5353–5355
- **THEN** its label contains `tcp(443)` or `udp(5353-5355)`, respectively

#### Scenario: Future multiple clauses (format only)
- **WHEN** a future compatible domain model supplies several TCP/UDP intervals
- **THEN** the established display convention is `tcp(1-10,15,35555),udp(1-10,15,35555)`, sorting and merging equivalent intervals without spaces or lost clauses

#### Scenario: Future ICMP types and codes (format only)
- **WHEN** a future typed model supports ICMPv4 or ICMPv6 types/codes
- **THEN** its display convention is `icmp(8/0,0/0)` or `icmpv6(128/0,129/0)`; pairs mean type/code and are not interpreted as ports

### Requirement: Protected semantic read projections
Display labels SHALL be composed only from facts authorized for the enclosing REAL read or selection. They SHALL NOT widen existing POST admission, permit enumeration of hidden Resources, expose hidden catalog metadata via lists/errors, persist browser credentials, or substitute MOCK data.

#### Scenario: No longer allowed to discover destinations
- **WHEN** source request authority remains but destination disclosure is unavailable
- **THEN** GET options cannot show that destination's name or placement, while direct source-authorized POST semantics remain unchanged

#### Scenario: Independent actor view
- **WHEN** the demo actor or credential changes while a label or collection request is pending
- **THEN** late protected metadata from the prior session is not rendered and no stale label is retained
