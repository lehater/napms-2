# Access requests web UI delta

## RENAMED Requirements

- FROM: `### Requirement: Create real request from four references`
- TO: `### Requirement: Create real request from saved Need`

## MODIFIED Requirements

### Requirement: Create real request from saved Need
The client SHALL compose a request within a selected saved Need on the existing BusinessProcess `Потребности` tab, using backend-provided Revision and source/destination Deployment selectors without UUID entry. It SHALL show a summary and require explicit confirmation, send only the existing four fields to `POST /access-requests`, and navigate to the server-returned Request on 201. `/access-requests/new` SHALL lead to REAL Process/Need selection instead of the manual UUID form.

#### Scenario: Valid demo request
- **WHEN** the operator with valid Requester authority selects an existing Need, exact Revision and two compatible Deployments and confirms the summary
- **THEN** FastAPI persists a new PENDING Request and the existing detail page shows its server-returned ID, Need, exact subject and admission

#### Scenario: Invalid reference or insufficient grant
- **WHEN** the server rejects input as 400, 403, 404 or 422
- **THEN** the form reports safe failure without claiming creation or DENIED, invalidates the affected selection and offers correction or refresh

#### Scenario: Existing creation entry
- **WHEN** an operator opens `/access-requests/new` or uses the request list creation link
- **THEN** they can reach REAL BusinessProcesses and select a saved Need without entering four identifiers or opening MOCK Simulation

### Requirement: Read scoped list and persisted detail
The client SHALL read the list via authenticated `GET /access-requests`, paginate with the defined limit/offset contract, open individual requests using the existing `GET /access-requests/{requestId}`, and display server-provided Need and exact subject references, IDs, timestamps, admission, status and decision evidence. It SHALL not hide unauthorized rows solely on the client or reconstruct saved facts from a draft. For ALLOWED decisions carrying a server-provided policyRuleId, Detail SHALL offer a REAL link to `/policy-rules/{ruleId}`; the link does not confer `policy.export` authority. DENIED SHALL never render a fabricated Rule link.

#### Scenario: Newly submitted request visible
- **WHEN** a requester successfully creates a request and returns to their list
- **THEN** the server-returned list contains the request and its detail page reports PENDING

#### Scenario: Terminal request visible after reload
- **WHEN** a previously submitted request is decided and the client reloads its detail page with a valid authorized credential
- **THEN** the detail displays the persisted ALLOWED or DENIED outcome and decision evidence obtained from FastAPI, not an optimistic local value

#### Scenario: List permissions
- **WHEN** a requester and a decision maker access the list using their distinct actual credentials
- **THEN** each sees only records allowed by backend authorization, regardless of the displayed UI mode

#### Scenario: Allowed Request to authorized Rule
- **WHEN** a Decider confirms ALLOWED and the saved Request reports a policyRuleId
- **THEN** the UI offers a REAL Rule Detail link preserving the Rule ID across role switching; a separately authorized Exporter can open it even without being authorized to read the original Request

#### Scenario: DENIED request has no policy
- **WHEN** the saved Request is DENIED with a null policyRuleId
- **THEN** the UI shows the terminal decision without a Rule or policy-export action

#### Scenario: Historical composition after restart
- **WHEN** the browser reloads and backend restarts against the same database before a saved Request is opened
- **THEN** its Need and exact three-part subject are restored from the protected Request GET without requiring renewed composition read grants

### Requirement: Full real-backend browser verification
The implementation SHALL include Playwright verification using supported loopback processes, temporary SQLite and real FastAPI, with no mocked API or recorded credentials. One E2E SHALL cover UI Process/Need creation, exact selection, PENDING submission, reload, actual backend restart, Demo actor switch, ALLOWED, real Rule detail and actual selected-rule JSON/CSV file downloads. Existing DENIED, visibility and authorization coverage SHALL remain.

#### Scenario: Independent complete E2E run
- **WHEN** the documented local Playwright test runs against an initialized temporary demo environment
- **THEN** both terminal outcomes and authorization boundaries are verified through real REST requests and persisted SQLite state, with credentials excluded from tracked artifacts and test output

#### Scenario: Need to request to canonical rule
- **WHEN** Requester creates a Process and Need, selects Revision and both Deployments, reviews and confirms, reloads, restarts backend and reopens the saved PENDING Request, then switches Demo actor to Decider and confirms ALLOWED
- **THEN** the same Need/subject survives, existing decision UI shows the persisted outcome and Rule ID, and a separately authorized Exporter opens REAL Rule Detail and downloads JSON and CSV whose contents confirm the canonical Rule's subject, traffic, readiness and origin
- **AND** no Decision or Rule existed for this fresh subject before ALLOWED and no UUID input or MOCK route was needed

## ADDED Requirements

### Requirement: Truthful bounded selection in existing composition
The selected Need's communication block SHALL use existing Shell, components, Demo actor and typed client. Each selector SHALL support the API's bounded pages and show only returned facts. Changing Need/Revision SHALL clear dependent choices; changing a selector page SHALL clear that selection. The UI SHALL NOT fabricate names, statuses, IPs, network availability or absent history.

#### Scenario: Exact summary
- **WHEN** all three choices are selected
- **THEN** the summary shows Need, directed roles, exact Revision, stored protocol/ports, both Deployments and both Resources before a distinct confirmation action

#### Scenario: Discovery authority differs from admission
- **WHEN** business or Resource disclosure grants are absent or expire
- **THEN** the selector UI obeys GET filtering/errors and cannot offer undisclosed choices; it does not claim that direct POST with known valid UUIDs and effective source `access.request` requires those read grants

#### Scenario: Empty choices
- **WHEN** discovery returns an empty page
- **THEN** the UI shows no available options on that page, permits applicable paging/refresh and disables submission without asserting that no hidden objects exist

#### Scenario: Explicit repeated submission
- **WHEN** a previous Request or Rule exists for the same subject and the operator intentionally composes another request
- **THEN** the UI permits a separately confirmed submission and does not imply that it will create a new Rule or reactivate an INACTIVE Rule

### Requirement: Safe asynchronous composition state
The UI SHALL clear protected composition data and confirmations on actor/credential, Process or Need change and ignore previous-session responses. It SHALL disable incomplete/loading/busy submissions and guard duplicate clicks. Stale/forbidden selections SHALL be invalidated. Network-uncertain POSTs SHALL NOT be automatically retried or described as definitely unsaved.

#### Scenario: Actor changes during read or submit
- **WHEN** an options request or submission completes after the operator switches actor or leaves that Need context
- **THEN** its old data, errors and navigation do not affect the current session and prior confirmation cannot be submitted

#### Scenario: Expired selection
- **WHEN** POST rejects a choice after source request authority expires or references become invalid
- **THEN** the UI clears confirmation, displays a non-disclosing error and requires fresh options and confirmation before another submission

#### Scenario: Double click and lost response
- **WHEN** confirmation is double-clicked or its network response is lost
- **THEN** only one in-flight POST is initiated, no automatic retry occurs, and an uncertain outcome offers checking the existing Request list before intentional resubmission


### Requirement: REAL acceptance navigation
The main Sidebar SHALL contain only BusinessProcess and AccessRequest collections, grouped by business context and access management. Needs SHALL be reached through their Process, and selected Rules through ALLOWED Requests. Main navigation SHALL omit research links, unavailable catalogues, empty groups and REAL/MOCK markers while preserving resize, active state, contrast and responsive layout.

#### Scenario: Main entry and linked detail
- **WHEN** the user opens `/` and follows Process, Need, Request and selected Rule links
- **THEN** only two working collection entries are shown; Rule Detail includes breadcrumbs and a return to real Requests, including on authorization failure

#### Scenario: Historical prototype isolation
- **WHEN** a direct `/prototype/*` research URL is opened
- **THEN** historical mock navigation and simulation remain available in an explicitly separate research context; main pages do not consume its state or substitute synthetic data

#### Scenario: Need list context changes
- **WHEN** a selected Need's list page or refresh changes
- **THEN** its selected-row state and composition are cleared, preventing an off-page stale confirmation
