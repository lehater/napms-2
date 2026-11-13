# access-requests-web-ui Specification Delta

## ADDED Requirements

### Requirement: Semantic Need and communication choices
The REAL Process/Need view and scoped Revision/Deployment selectors SHALL show backend-derived entity labels first. They SHALL keep UUIDs available as secondary technical metadata and retain the complete exact Need/Revision/Resource/Deployment confirmation summary and existing selection/actor reset behavior.

#### Scenario: User selects a directed communication
- **WHEN** the user selects a saved Need, a specific Revision and its two Deployments
- **THEN** they see a meaningful directed Component/Resource description and canonical transport expression, while the exact UUID subject remains available for verification

#### Scenario: Historical unnamed catalog data
- **WHEN** a related catalog entity has no stored name
- **THEN** the UI displays a visible missing-name placeholder and secondary technical ID rather than a fabricated label

### Requirement: Readable AccessRequest collection without identity changes
The REAL Request list SHALL use server-derived source→destination and traffic labels as its primary identifying text. Each row SHALL retain actual request identity, status, date and access-authorized decision evidence, without conflating repeated Requests or a canonical Rule.

#### Scenario: Two different requests for one Subject
- **WHEN** an actor has submitted two Requests for the same AccessSubject
- **THEN** the list shows two distinct rows with the same domain traffic description but different Request IDs/dates and their individual PENDING/ALLOWED/DENIED statuses

#### Scenario: Requester loses disclosure grants
- **WHEN** a Requester can still read their historical Request but no longer has options disclosure grants
- **THEN** Request GET/list visibility remains governed by accepted Request authority; any separately protected catalog labels are omitted/redacted rather than widening grants or failing a valid historical read

### Requirement: No user-entered names for derived objects
The REAL client SHALL NOT require a user to invent free-form names for Interactions, Revisions, Deployments, Needs, AccessRequests, Decisions or PolicyRules. Their labels SHALL be computed from typed domain facts.

#### Scenario: Submit without artificial name
- **WHEN** Requester completes the existing four-UUID subject composition
- **THEN** POST retains its existing payload and source-only admission without an additional `name` field or any extra disclosure prerequisite
