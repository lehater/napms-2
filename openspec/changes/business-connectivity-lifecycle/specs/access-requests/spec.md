# Spec Delta

## ADDED Requirements

### Requirement: Lifecycle-aware request admission
The system SHALL accept a new AccessRequest only when its referenced ConnectivityNeed is `ACTIVE` and its parent BusinessProcess is `ACTIVE`. This lifecycle check SHALL NOT change existing requests, decisions, rules, or provenance.

#### Scenario: Request for active business context
- **WHEN** an authorized requester submits a valid request for an active Need under an active Process
- **THEN** the request follows the existing source-only admission contract

#### Scenario: Request for retired Need or archived Process
- **WHEN** an authorized requester submits a valid request for a retired Need or an archived parent Process
- **THEN** the API returns 409 before creating an AccessRequest and does not create a Decision or Rule

#### Scenario: Existing history after lifecycle change
- **WHEN** a Need is retired or its Process is archived after an AccessRequest was submitted
- **THEN** the existing Request, Decision, Rule, and provenance retain their identities and remain retrievable under existing authorization rules
