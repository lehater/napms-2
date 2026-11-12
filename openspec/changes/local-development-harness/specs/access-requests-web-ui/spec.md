# Web UI delta

## MODIFIED Requirements

### Requirement: In-memory local demo credential switching
Outside the explicit local-demo proxy profile, the web client SHALL support manually selecting requester/decider *labels* and entering a masked bearer token from the pre-existing local demo credential file. It SHALL retain tokens only in volatile page memory and SHALL clear token, displayed protected data, and pending actions on mode switch or credential removal. Displayed labels SHALL NOT grant server authority. Tokens SHALL NOT be bundled, persisted, placed in URLs, or logged.

#### Scenario: Switch from requester to decider
- **WHEN** a user switches the visible mode from requester to decider
- **THEN** the previous token and protected data are removed and a decider credential must be entered before authenticated actions continue

#### Scenario: Reload clears credential
- **WHEN** the browser page is reloaded
- **THEN** the token is no longer available to the app, and the operator must enter it again

#### Scenario: Wrong token for selected mode
- **WHEN** the operator selects decider but supplies a requester token and attempts a decision
- **THEN** the server rejects it with 403 and the client never treats the UI label as authority

#### Scenario: Shared proxy actor selector
- **WHEN** the explicit local-demo profile is active
- **THEN** the common UI offers requester, decider, exporter and anonymous selection without bearer entry, and only a nonsecret selector is sent to the local proxy

#### Scenario: Switch actor and reset actions
- **WHEN** the operator switches actor in the local-demo profile
- **THEN** previous protected data, pending confirmations and forms are removed before the next actor's data is read; the choice is shared across real UI routes and cleared by page reload

## ADDED Requirements

### Requirement: Real proxy-profile browser acceptance
Browser tests SHALL exercise the one-command local-demo runtime with actual FastAPI and SQLite, actor changes and genuine 401/403 without mocked API. Tests SHALL verify no browser bearer headers or credential responses, cross-origin denial, data persistence and unchanged independent grants. Existing manual-bearer and mock journeys SHALL remain valid.

#### Scenario: Manual acceptance without token copying
- **WHEN** requester creates a Process and Request, decider attempts Process creation and then decides the Request, and requester attempts a decision
- **THEN** authorized actions persist and the independent unauthorized actions return 403 without new permissions

#### Scenario: Anonymous and refresh
- **WHEN** the operator selects anonymous or refreshes the browser
- **THEN** a protected read returns a genuine backend 401, and selecting requester again re-reads the persisted Process
