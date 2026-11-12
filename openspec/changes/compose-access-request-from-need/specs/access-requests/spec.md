# Access requests delta

## MODIFIED Requirements

### Requirement: Source-only request admission
The system SHALL check the authenticated actor's effective `access.request` grant for the source Resource at request admission time. It SHALL NOT demand a destination Resource `access.request` grant. Admission SHALL NOT itself constitute ALLOWED. Direct POST SHALL NOT require `business.*`, `access.options.read` or any destination Resource grant. Request authority SHALL NOT imply catalog read rights or require a prior GET.

#### Scenario: Source grant without destination grant (AC-05)
- **WHEN** an actor without business/disclosure grants has an effective source Resource `access.request` grant but no destination Resource request grant and submits a valid subject
- **THEN** the API accepts the request and leaves it PENDING without creating a PolicyRule

#### Scenario: Missing source grant (AC-05)
- **WHEN** a valid request is submitted by an authenticated actor lacking the effective source Resource `access.request` grant
- **THEN** the API returns 403 before persisting a new request and records no DENIED decision

#### Scenario: Source permission is not catalog visibility
- **WHEN** an actor has source `access.request` but lacks a required business or selected Resource read grant
- **THEN** GET discovery is restricted, while direct POST with valid compatible references succeeds as PENDING without granting catalog visibility

### Requirement: Protected request retrieval
The API SHALL allow the submitting actor or an authorized decision maker to retrieve an AccessRequest and its optional terminal decision without exposing it to unrelated actors. Missing and unauthorized request IDs SHALL produce the same generic 403 response. Detail responses and errors SHALL use `Cache-Control: no-store`.

#### Scenario: Inspect DENIED outcome
- **WHEN** the authorized submitting actor retrieves a decided request
- **THEN** the result distinguishes the request, admission evidence and DENIED decision with no PolicyRule reference

#### Scenario: Unrelated actor
- **WHEN** a valid actor who is neither the submitter nor authorized decider requests another actor's request
- **THEN** the API returns 403 without disclosing request details

#### Scenario: No existence oracle
- **WHEN** an authenticated actor probes a missing request ID and an existing inaccessible request ID
- **THEN** both return the identical 403 `FORBIDDEN` envelope without linked IDs

## ADDED Requirements

### Requirement: Need-scoped selection API
The API SHALL provide `GET /business-processes/{processId}/needs/{connectivityNeedId}/access-request-options` with UUID paths and strict `kind`, `interactionRevisionId`, `limit` and `offset` query parameters. It SHALL return `{kind,items,limit,offset,hasMore}` and `Cache-Control: no-store`, including errors. No other catalog endpoint is required.

#### Scenario: Revision page
- **WHEN** an authorized caller omits `kind` or selects `revisions`, without `interactionRevisionId`
- **THEN** items contain only `interactionRevisionId,interactionId,applicationId,sourceComponentId,destinationComponentId,ipProtocol,destinationPortStart,destinationPortEnd` from stored facts

#### Scenario: Deployment page
- **WHEN** an authorized caller selects `source-deployments` or `destination-deployments` and supplies a selectable `interactionRevisionId`
- **THEN** items contain only `deploymentId,componentId,resourceId` for the requested direction and Revision

#### Scenario: Strict input
- **WHEN** UUID syntax, kind, paging or the kind/Revision combination is invalid, or a key is unknown or repeated
- **THEN** the API returns generic 422 `INVALID_INPUT` without echoing input, reading protected facts for the response or writing records

### Requirement: Independent placement disclosure
GET options discovery SHALL require `business.process.read` and `business.need.read` on `demo-business`. Placement disclosure SHALL require explicit effective `access.options.read` on each Resource UUID. This grant SHALL expose only minimal composition references, not addresses or Resource Detail. Business, request, decision and export grants SHALL NOT imply it.

#### Scenario: Need reader without placement rights
- **WHEN** an actor can read the Need but has no eligible readable source/destination pair
- **THEN** revision discovery returns an empty page without Resource/Deployment IDs or hidden counts

#### Scenario: Destination is independently protected
- **WHEN** an actor can request from a readable source but lacks `access.options.read` on a compatible destination Resource
- **THEN** that destination is excluded from GET options without hidden counts; a compatible direct POST with known UUIDs and source request authority remains admissible

#### Scenario: Local demo provisioning
- **WHEN** explicit demo initialization is run for fresh or existing v3 storage
- **THEN** only Requester receives the two seeded Resource disclosure grants, existing IDs/credentials and expired grants are preserved, and no schema migration or decision occurs

### Requirement: Compatible complete choices
Revision options SHALL belong to the Need's Interaction and source Component, with existing Components in the Revision's Application and a consistent Application/directed pair across that Interaction's revisions. A Revision SHALL be offered only if it has a readable source with source request authority and a readable destination. Deployments SHALL match their respective Revision roles.

#### Scenario: Complete pair
- **WHEN** a coherent Need has multiple Revisions and compatible authorized placements
- **THEN** each eligible Revision and its matching placements are selectable, independent of IP availability, existing requests and existing PolicyRules

#### Scenario: Inconsistent communication
- **WHEN** revisions of one Interaction disagree on Application or directed roles, or the Need participant disagrees with the Revision source
- **THEN** no Revision from that invalid communication is offered and direct incompatible submission writes nothing

#### Scenario: Wrong parent or stale Revision selector
- **WHEN** Need is missing or belongs to another Process, or deployment discovery references an absent, unrelated or no-longer-selectable Revision
- **THEN** the API returns the same generic 404 without confirming another object's existence

### Requirement: Filtered bounded options
Selection SHALL filter compatibility and authority before sorting and paging, using one read snapshot and one server evaluation time. Revisions SHALL sort by Revision UUID ascending; placements by Deployment UUID ascending. Limit SHALL be 1..100 (default 20), offset nonnegative (default 0). `hasMore` SHALL describe only additional eligible rows; totals and hidden-row information SHALL NOT be returned.

#### Scenario: Hidden rows between visible rows
- **WHEN** hidden or incompatible rows sort between visible eligible rows and limit is one
- **THEN** pages and `hasMore` match pagination of only the visible eligible rows without gaps attributable to hidden rows

#### Scenario: Empty or out-of-range page
- **WHEN** an authorized revisions query has no complete choices or any valid options query is beyond its eligible result set
- **THEN** the API returns 200 with empty items and `hasMore:false`, without explaining whether hidden options exist

#### Scenario: Concurrent grant change
- **WHEN** a grant changes after a GET pins its snapshot
- **THEN** that GET uses one consistent snapshot/time and a subsequent GET observes changed read grants and POST observes changed source request authority; read-grant changes do not add POST prerequisites

### Requirement: Transactional composition revalidation
The existing four-UUID `POST /access-requests` SHALL use the trusted server actor and recheck effective source-only `access.request` and all Need/Revision/Deployment relationships, including direction, Components, Resources, Application and all-revision consistency in one write transaction at one time. Process SHALL be derived from Need. No option response SHALL authorize a later write. Errors SHALL leave no partial Subject, Request, Decision, Rule or allowance records.

#### Scenario: Changed grants after selection
- **WHEN** source `access.request` grants expire or are revoked before POST acquires its write transaction
- **THEN** POST returns 403 and persists nothing

#### Scenario: Read grants revoked
- **WHEN** business or either Resource `access.options.read` grants expire or are revoked after selection, but source `access.request` remains effective and references remain valid
- **THEN** direct POST still accepts a PENDING request; subsequent GET discovery uses the changed read grants

#### Scenario: Tampered subject
- **WHEN** client IDs select reversed roles, a wrong Application, an unrelated Revision or a Need with a mismatching source participant
- **THEN** server checks reject the request under the safe reference error policy, without trusting client selection or creating permission evidence

#### Scenario: Storage failure after Subject insertion
- **WHEN** a failure occurs after a new Subject is inserted but before Request commit
- **THEN** the Subject insertion is rolled back with the entire failed submission

#### Scenario: Same subject with another Need
- **WHEN** another existing Process owns a compatible Need and an authorized actor submits the same exact triple using that Need
- **THEN** a distinct PENDING Request references the same Subject and its own Need, without creating a Rule

### Requirement: Non-disclosing reference errors
GET and POST SHALL authenticate before protected lookup and use neutral errors without object IDs, protected metadata, addresses, counts or per-object diagnostics. GET SHALL gate business reads before context lookup. POST SHALL authorize source request scope before resolving remaining references, without business/disclosure gates. Errors SHALL leave no partial writes.

#### Scenario: Invalid credential
- **WHEN** GET or POST receives an invalid credential
- **THEN** it returns generic 401 without protected lookup

#### Scenario: Inaccessible GET context
- **WHEN** a business-authorized options caller references missing/inaccessible context or an unselectable Revision
- **THEN** GET returns uniform 404 without protected details

#### Scenario: Residual direct POST inference
- **WHEN** a source-authorized caller submits known UUIDs without catalog read rights
- **THEN** valid references can produce a saved Request, missing references produce generic 404 and incompatible references generic 400; these responses and author-visible audit references can still reveal existence/compatibility in local demo, so complete concealment is not claimed

#### Scenario: Probe protected context
- **WHEN** a caller without business read grants probes real and random Process/Need IDs through GET options
- **THEN** each well-formed GET returns the same 403 without protected fields

#### Scenario: Probe source or destination
- **WHEN** an actor probes absent versus unauthorized sources, or an authorized source with missing destination/Need/Revision references
- **THEN** source failures are identical 403 before other reference resolution, and missing-reference failures are generic 404, without partial records

#### Scenario: Visible incompatibility
- **WHEN** source request authority is effective and existing references conflict in Revision membership, roles, Application or Need participant relationships
- **THEN** POST returns 400 `INVALID_SUBJECT` without per-object diagnostics

### Requirement: Reconstructible request references
Every existing AccessRequest representation SHALL add required `connectivityNeedId` and `subject:{sourceDeploymentId,destinationDeploymentId,interactionRevisionId}` from persisted Request/Subject records. Existing fields and list visibility SHALL remain. Historical author/decider read authority SHALL suffice for these audit references after composition grants expire; linked catalog metadata SHALL NOT be added.

#### Scenario: Reload and backend restart
- **WHEN** author or effective Decider retrieves a saved Request after browser reload and backend restart
- **THEN** the same Need, exact tuple, admission, status and decision are returned without client draft state, including Requests saved before this change

#### Scenario: Read is not catalog browsing
- **WHEN** composition grants have expired but the author or effective Decider lists or retrieves a saved Request
- **THEN** its audit references remain readable without revealing destination Resource/addresses or authorizing catalog discovery

#### Scenario: Existing canonical policy path
- **WHEN** existing independent Decider allows this Request or another Request for the same Subject
- **THEN** existing decision behavior creates or reuses one canonical Rule; DENIED creates none and never revokes a prior Rule, and ALLOWED does not prove network connectivity
