# Local runtime delta

## MODIFIED Requirements

### Requirement: Private reusable demo credentials
The browser workflow SHALL reuse the existing locally generated requester and decider credentials without copying tokens into code, frontend build variables, URLs, browser persistent storage, version control, CI logs, or screenshots. Outside the explicit proxy profile, credential switch SHALL require an explicitly entered token for the next role; the backend SHALL still resolve actor/grants from the bearer token only.

#### Scenario: Local manual mode switch
- **WHEN** the operator copies a token from the already initialized private demo credential file into the masked client field
- **THEN** the client authenticates subsequent requests by bearer header and a role change drops the previous token and displayed data

#### Scenario: Reinitialization and browser restart
- **WHEN** the backend is restarted using the same DB and private credential file, or the browser is refreshed
- **THEN** SQLite and server credential mappings remain consistent, while the browser requires re-entry of the bearer token

#### Scenario: Explicit proxy profile
- **WHEN** the operator starts the local demo proxy profile and selects a known demo actor
- **THEN** only the local proxy reads its pre-existing private token and adds the backend bearer header; the browser receives no bearer token

## ADDED Requirements

### Requirement: Single local command
The system SHALL provide one explicit local-demo command to initialize or migrate the current SQLite non-destructively, start loopback FastAPI and Vite, check both for readiness and stop child services on exit. Missing prerequisites, unsafe credentials, occupied ports or service failures SHALL produce safe actionable errors without printing tokens.

#### Scenario: Start and restart
- **WHEN** the operator runs the documented local-demo command with an existing DB and private credentials
- **THEN** both services become ready without resetting data, IDs or grants, and the same data remains after stop/start

#### Scenario: Failed startup
- **WHEN** a prerequisite is absent, either port is occupied or a child fails
- **THEN** startup fails with a nonsecret explanation and any started child is stopped

### Requirement: Stateless actor substitution
Only the explicit development profile SHALL translate a whitelisted actor selector into an existing private bearer credential for whitelisted backend API routes. Anonymous selection SHALL forward without Authorization. FastAPI SHALL continue to resolve identity and enforce grants. The proxy SHALL reject unknown selectors and conflicting bearer/selector input; it SHALL NOT issue credentials, change grants or accept arbitrary upstream destinations.

#### Scenario: Independent authority
- **WHEN** requester, decider and exporter are selected in turn
- **THEN** each backend operation uses that actor's existing grants; unauthorized operations return the backend's 403

#### Scenario: Anonymous request
- **WHEN** anonymous selection invokes a protected operation
- **THEN** FastAPI returns its genuine 401 without a business mutation

### Requirement: Proxy boundary and credential privacy
Credential substitution SHALL require loopback peer and an exact allowed Host, same-origin request context and a non-simple custom header. Unsafe methods SHALL require the exact UI Origin. Cross-origin, null-Origin, forged Host and preflight requests SHALL be denied before token use. Tokens SHALL NOT be exposed through HTTP, static files, URLs, browser storage, logs or build output.

#### Scenario: CSRF attempt
- **WHEN** a request has a foreign or null Origin, cross-site metadata, unsupported Host or missing custom header
- **THEN** substitution is denied without backend mutation or token disclosure

#### Scenario: Private file access
- **WHEN** the browser requests the credentials file through Vite static paths or inspects API responses
- **THEN** no private credential contents are returned

### Requirement: Explicit development activation
The proxy SHALL activate only in an explicitly selected local-demo development server profile. Normal dev SHALL retain manual bearer behavior. Production build and preview SHALL NOT activate the proxy, even when supplied the development mode or environment flags. Activation settings and private file paths SHALL remain server-only.

#### Scenario: Production activation attempt
- **WHEN** build or preview is invoked with local-demo activation flags
- **THEN** activation fails closed and no token substitution endpoint becomes available

#### Scenario: Normal development
- **WHEN** Vite starts without the explicit local-demo profile
- **THEN** actor substitution is unavailable and existing manual bearer calls remain supported
