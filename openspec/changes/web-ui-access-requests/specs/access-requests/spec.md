# access-requests Specification Delta

## ADDED Requirements

### Requirement: Authenticated visible request collection
The system SHALL expose authenticated `GET /access-requests`. An actor SHALL see their own submissions, including after expiration of their former request-admission grant. An actor with an effective server-held `access.decide` grant for `demo-policy` SHALL see all requests. The server SHALL evaluate authority at one instant within the read transaction; caller-supplied actor, role, scope, or grant SHALL NOT expand visibility.

#### Scenario: Requester owns two requests
- **WHEN** an authenticated requester reads the collection after submitting two requests while another requester has also submitted a request
- **THEN** only the first requester's two requests are returned, each with the existing `AccessRequest` shape, and no other request details are disclosed

#### Scenario: Effective decision authority
- **WHEN** an authenticated actor has an effective `access.decide` grant on `demo-policy`
- **THEN** the collection includes requests submitted by all actors, within the requested page

#### Scenario: Revoked or expired decision grant
- **WHEN** an actor's former decision grant is no longer effective
- **THEN** the actor can see only their own requests, even if they previously could see all requests

#### Scenario: Historical author visibility
- **WHEN** a requester who submitted a request no longer has an effective `access.request` grant
- **THEN** the requester can still list their own previously submitted request

#### Scenario: Missing credential or unrelated actor
- **WHEN** no valid bearer credential is supplied
- **THEN** the API returns 401 with the existing `UNAUTHENTICATED` envelope and no request information
- **WHEN** an authenticated actor has neither decision authority nor any submitted requests
- **THEN** the API returns 200 with an empty `items` array and no other actor's details

### Requirement: Bounded and deterministic request collection
The collection SHALL return `{"items": [AccessRequest], "limit": integer, "offset": integer, "hasMore": boolean}`. It SHALL accept only optional `limit` (integer 1..100; default 20) and `offset` (nonnegative integer; default 0). It SHALL order visible requests by `submittedAt` descending, then `requestId` descending, paginate after applying server-side visibility, and set `hasMore` when another authorized item follows. It SHALL not expose a global total or extra filters.

#### Scenario: First page and next page
- **WHEN** an authorized actor has more than the requested `limit` visible requests and requests `offset=0`
- **THEN** at most `limit` requests are returned in deterministic order and `hasMore=true`
- **WHEN** the actor requests the next non-overlapping offset against an unchanged database
- **THEN** the remaining visible requests are returned without inaccessible records affecting pagination

#### Scenario: End or empty collection
- **WHEN** an actor requests a page at or beyond the last authorized request
- **THEN** `items=[]`, `hasMore=false`, and the requested `limit` and `offset` are returned

#### Scenario: Invalid query and authority spoofing
- **WHEN** `limit` or `offset` is invalid, or a query includes `actorId`, `role`, `grants`, `scope`, or any other unsupported parameter
- **THEN** the API returns 422 with the existing `INVALID_INPUT` error envelope and reveals no list data

### Requirement: Collection preserves stored request truth
Each returned request SHALL use the existing `AccessRequest` representation, preserving source admission evidence, `PENDING` vs terminal outcome, and nullable decision provenance. Listing SHALL NOT create requests, decisions, or PolicyRules. Responses SHALL be marked `Cache-Control: no-store`.

#### Scenario: Decisions reflected without mutation
- **WHEN** a PENDING request becomes ALLOWED or DENIED through the existing authorized decision endpoint
- **THEN** a subsequent authorized collection read returns its persisted terminal status and matching decision, without modifying any business records

#### Scenario: Storage restart
- **WHEN** the backend is restarted with the same initialized SQLite database
- **THEN** authorized listing returns previously persisted requests and decisions
