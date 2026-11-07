# access-requests-web-ui Specification

## Purpose

Provide a minimal accessible local browser interface over the existing trusted NAPMS access-request API, preserving independent request and decision authority.

## ADDED Requirements

### Requirement: Minimal navigable local interface
The local web client SHALL provide a shared layout with links to a request list and request creation, stable list/new/detail routes, and visible loading, empty-data and API-error states. It SHALL use existing shadcn/ui components or native controls, without creating a reusable component-system project or unrelated administration screens.

#### Scenario: Navigation and empty list
- **WHEN** an operator opens the client with valid credentials and no visible requests exist
- **THEN** the request list shows a clear empty state and navigation to create a request

#### Scenario: Failed request
- **WHEN** a request fails due to network or HTTP error
- **THEN** the corresponding screen shows a non-secret error and a safe retry or correction action rather than silently showing stale data

### Requirement: Create real request from four references
The client SHALL present labeled `sourceDeploymentId`, `destinationDeploymentId`, `interactionRevisionId`, and `connectivityNeedId` UUID inputs. It MAY offer documented public demo UUID defaults, but SHALL send only the four specified fields to the existing `POST /access-requests` and SHALL navigate to the server-returned request on 201.

#### Scenario: Valid demo request
- **WHEN** the operator using a valid requester credential submits the known coherent demo references
- **THEN** FastAPI persists a new PENDING request in SQLite, and its detail page shows the returned request ID and admission information

#### Scenario: Invalid reference or insufficient grant
- **WHEN** the server rejects input as 400, 403, 404, or 422
- **THEN** the form reports failure without claiming that a request was created or claiming a DENIED decision

### Requirement: Read scoped list and persisted detail
The client SHALL read the list via authenticated `GET /access-requests`, paginate with the defined limit/offset contract, open individual requests using the existing `GET /access-requests/{requestId}`, and display server-provided IDs, timestamps, admission evidence, status, and decision evidence. It SHALL not hide unauthorized rows solely on the client.

#### Scenario: Newly submitted request visible
- **WHEN** a requester successfully creates a request and returns to their list
- **THEN** the server-returned list contains the request and its detail page reports PENDING

#### Scenario: Terminal request visible after reload
- **WHEN** a previously submitted request is decided and the client reloads its detail page with a valid authorized credential
- **THEN** the detail displays the persisted ALLOWED or DENIED outcome and decision evidence obtained from FastAPI, not an optimistic local value

#### Scenario: List permissions
- **WHEN** a requester and a decision maker access the list using their distinct actual credentials
- **THEN** each sees only records allowed by backend authorization, regardless of the displayed UI mode

### Requirement: Irreversible decision via existing server API
The client SHALL present ALLOWED and DENIED actions for a PENDING request in its decider-selected UX mode, require explicit confirmation, and post `{"outcome":"ALLOWED"|"DENIED"}` to the existing decision endpoint. It SHALL re-fetch the request and disable decision actions once a terminal status is returned. The backend SHALL remain the sole authority for accepting decisions.

#### Scenario: ALLOWED
- **WHEN** an authorized decider confirms ALLOWED for a PENDING request
- **THEN** the server returns 201 and a subsequent GET shows ALLOWED with decision evidence and the actual policyRuleId

#### Scenario: DENIED
- **WHEN** an authorized decider confirms DENIED for a fresh PENDING request
- **THEN** a subsequent GET shows DENIED with a null policyRuleId and no new PolicyRule

#### Scenario: Unauthorized or concurrent decision
- **WHEN** a requester token attempts a decision or a terminal request is decided again
- **THEN** 403 or 409 is surfaced, no client-forged success is shown, and the current server state is reloaded when appropriate

### Requirement: In-memory local demo credential switching
The web client SHALL support manually selecting requester/decider *labels* and entering a masked bearer token from the pre-existing local demo credential file. It SHALL retain tokens only in volatile page memory and SHALL clear token, displayed protected data, and pending actions on mode switch or credential removal. Displayed labels SHALL NOT grant server authority. Tokens SHALL NOT be bundled, persisted, placed in URLs, or logged.

#### Scenario: Switch from requester to decider
- **WHEN** a user switches the visible mode from requester to decider
- **THEN** the previous token and protected data are removed and a decider credential must be entered before authenticated actions continue

#### Scenario: Reload clears credential
- **WHEN** the browser page is reloaded
- **THEN** the token is no longer available to the app, and the operator must enter it again

#### Scenario: Wrong token for selected mode
- **WHEN** the operator selects decider but supplies a requester token and attempts a decision
- **THEN** the server rejects it with 403 and the client never treats the UI label as authority

### Requirement: Full real-backend browser verification
The implementation SHALL include a Playwright browser scenario using supported loopback processes, a temporary initialized SQLite DB and real FastAPI HTTP calls, with no mocked API and no recorded credentials. The scenario SHALL verify requester create/list/detail, authorized ALLOWED, authorized DENIED for another request, role switches, reload persistence, and negative authorization.

#### Scenario: Independent complete E2E run
- **WHEN** the documented local Playwright test runs against an initialized temporary demo environment
- **THEN** both terminal outcomes and authorization boundaries are verified through real REST requests and persisted SQLite state, with credentials excluded from tracked artifacts and test output
