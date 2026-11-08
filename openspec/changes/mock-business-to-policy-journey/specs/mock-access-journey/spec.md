## Purpose
Provide a complete synthetic business-to-policy journey in the existing browser interface without backend access.

## ADDED Requirements

### Requirement: Navigable business context
The prototype SHALL retain seven collections and existing routes, breadcrumbs and Object Detail, and link BusinessProcess, Need, Application, Interaction, exact revision, deployments and resources without typed identifiers.

#### Scenario: Traverse context
- **WHEN** a user opens Settlement from Business Processes
- **THEN** related Need, profile, directed communication, TCP destination 443 revision and compatible deployment resources are reachable by links

### Requirement: Validated mock submission
The simulation SHALL create a PENDING request with exact source/destination/revision AccessSubject and Need only when deployments match the revision's directed component roles and the Need's Interaction.

#### Scenario: Valid selection
- **WHEN** compatible named participants are submitted
- **THEN** a new PENDING request appears in its collection and Object Detail with linked context

#### Scenario: Invalid selection
- **WHEN** source and destination roles do not match the selected revision
- **THEN** an error is shown and no request is created

### Requirement: Immutable simulated decisions
A separately labeled simulation decision mode SHALL finalize PENDING requests once. ALLOWED SHALL create or reuse one rule per exact AccessSubject; DENIED SHALL record null rule without creating or revoking rules. Completed decisions and originating rule provenance SHALL remain unchanged.

#### Scenario: First allowance
- **WHEN** a new subject is ALLOWED
- **THEN** one rule exposes subject, components, Need, ALLOWED origin and links back to request, Need and process

#### Scenario: Reuse and denial
- **WHEN** subsequent requests for the same subject are ALLOWED and DENIED
- **THEN** the rule is reused, all decisions remain distinct, denial links no rule and original provenance remains unchanged

### Requirement: Isolated volatile simulation
All simulation actions SHALL display MOCK or Simulation labels, use separate client state over the immutable fixture, preserve state across SPA navigation and disclose reset on full reload. They SHALL NOT call real APIs or alter real UI.

#### Scenario: Navigate and reload
- **WHEN** a simulated request is created and the user navigates within the SPA
- **THEN** the request remains visible until full reload, which resets simulation state
