# Design

## Context

Baseline: `main@4864706e54535e947b6f8b4e4ed09e4c6138b66a`, independently checked through GitHub Connector and `git fetch origin`. PR #51 is merged; [post-merge Verify #43300505261](https://github.com/lehater/napms-2/actions/runs/43300505261) succeeded on that SHA. See proposal for the product gap.

| Observed implementation | Reuse / missing behavior |
| --- | --- |
| `storage.py`: SQLite v3; immutable Need, Revision, Deployment, Request and Subject; unique Need triple and exact Subject triple | All necessary facts already exist. No migration or persisted composition draft needed. |
| `Service.needs/create_need/_compatible`: scoped business grants, all-revision Application/direction consistency, unused communication filtering | Reuse consistency, but **do not reuse unused-Need filtering**: request composition necessarily uses an already-saved Need. |
| `Service.submit` + `validate_subject`: source grant, four references, role/Application checks, canonical subject + independent Request in write transaction | Add disclosure gates and all-revision consistency; remove missing-source 404 versus unauthorized-source 403 oracle. |
| `request_view` / HTTP `AccessRequest`: no Need or exact tuple | Add fields from stored Request/Subject, not React state or new columns. |
| `Service.decide/rule`: independent decision, canonical Rule, export authority on both Resources | No redesign; use existing endpoints for decision and acceptance verification. |
| `Needs.tsx`, `BusinessProcesses.tsx`: REAL tab; `App.tsx`: UUID creation and existing Request Detail | Inline selected-Need composition, existing detail and Shell. |
| `api.ts`, `DemoProfile.tsx`, local-demo proxy | Extend typed client; preserve trusted server actor, reset and late-response protections. |
| `tests/test_{security,listing,transactions,connectivity_needs,acceptance}.py`, browser Process/Request tests | Extend existing integration infrastructure; actual backend stop/start fixture already exists. |

Normative sources are the accepted OpenSpec Request/Decision/Policy specs and implemented `persist-connectivity-need` change, plus `docs/domain.md`. `docs/product.md` and UX scenario include older milestone descriptions; PR #44–#51 and inspected code establish current coverage. Issue #37, PR #38 and its research document supply historical findings only. The old broad read-model proposal, display migrations and QueryService are not adopted.

## Goals / Non-Goals

**Goals:** bounded selection from existing Need, honest exact composition, safe disclosure before and during submission, reconstructible PENDING detail, reuse of current decision flow.

**Non-goals:** proposal exclusions apply. No production tenant/object-ownership model is inferred from `demo-business`. No new history/catalog search or Rule-summary endpoint is needed to submit a repeated request. The UI must not assert absence of earlier requests/rules when it has not queried them. M-11 remains deferred, not PASS.

## Decisions

### 1. One narrow selection endpoint

`GET /business-processes/{processId}/needs/{connectivityNeedId}/access-request-options`

Both path IDs are UUIDs. Strict optional query:

| Parameter | Contract |
| --- | --- |
| `kind` | `revisions` (default), `source-deployments`, or `destination-deployments` |
| `interactionRevisionId` | UUID, required for either deployment kind, forbidden for `revisions` |
| `limit` | integer 1..100, default 20 |
| `offset` | nonnegative integer, default 0; huge offsets safely yield empty pages |

Unknown keys, repeated query keys, malformed UUIDs, invalid kind/paging and invalid kind/Revision combinations return 422 `INVALID_INPUT`. Client actor, grants, scopes, Resource filters and evaluation time are not supported.

Successful response is `{kind,items,limit,offset,hasMore}`. Item shape depends only on `kind`:

- `revisions`: `{interactionRevisionId,interactionId,applicationId,sourceComponentId,destinationComponentId,ipProtocol,destinationPortStart,destinationPortEnd}`; protocol is stored TCP/UDP, ports are stored integers.
- Either deployment kind: `{deploymentId,componentId,resourceId}`. The direction is established by `kind` and selected Revision; no client-generated role inference.

All IDs are UUIDs. No names, endpoints, addresses, scope/grant IDs, hidden IDs, totals, omitted-item counts or reasons per excluded object. No invented CURRENT/ACTIVE Revision flag or HTTPS label for TCP/443. Existing Process name can be displayed from its own authorized DTO.

Within one read transaction pin a snapshot, sample time once, authorize business reads, resolve Process and verify `need.process_id == processId`. Then derive compatible candidates as follows:

1. Need references the stable Interaction and source Component. Revision has that Interaction and source; both Components belong to its existing Application. All revisions for that Interaction agree on Application and directed component pair, reusing `_compatible` (not only the actor-visible revisions). Invalid Interaction groups yield no options.
2. Source Deployment matches Revision source Component and has an existing Resource. Actor has effective `access.options.read` **and** `access.request` on that Resource.
3. Destination Deployment matches Revision destination Component and has an existing Resource. Actor has effective `access.options.read` on that Resource. **No destination `access.request` is checked.**
4. Offer a Revision only if at least one source and one destination survive these rules. Any returned source and destination for that Revision form a compatible pair; there are no topology, address, endpoint or same/different-Resource restrictions to invent.
5. Apply all filtering before sorting and paging. Revisions sort by `interactionRevisionId` ascending; deployment pages by `deploymentId` ascending, canonical UUID text order. `hasMore` means another **visible eligible** item exists, computed with a bounded extra eligible item, never a global count.

A deployment-mode query must reference a coherent Revision reachable from this Need with at least one currently eligible source and destination; otherwise return the uniform 404. Authorized revision discovery with no complete choices returns 200, `items:[]`, `hasMore:false`; out-of-range pages do likewise. Do not distinguish hidden candidates from absent candidates. Offset pages are live snapshots, not a cross-request snapshot lease; stale selections are revalidated at POST.

**Why this shape:** three selector reads at one scoped URI keep every list bounded and preserve the accepted three-choice UX. An unbounded nested response or Cartesian list of all triples multiplies output; generic catalogs/QueryService introduce unnecessary interfaces. No search infrastructure or cursor service is needed for local demo.

### 2. P1 authorization and disclosure decision

Use existing `grants(actor_id,action,scope,valid_from,valid_until)`, trusted credentials and effective-time rules. Add one action, `access.options.read`, scoped to an exact Resource UUID; no wildcard or implied grant. It permits only minimal Deployment/Resource identifiers in Need-scoped composition, not Resource Detail, endpoints or IPs.

| Operation | Required authority |
| --- | --- |
| Read Process / saved Needs | Existing `business.process.read` + (for Needs) `business.need.read`, `demo-business` |
| Create Need / Need creation options | Existing `business.process.read` + `business.need.create`, `demo-business`, unchanged |
| New request options | Both business read actions; source rows require source `access.options.read` + source `access.request`; destination rows require destination `access.options.read` |
| Submit selected references | Both business read actions, `access.options.read` on each selected Resource, and **only source** `access.request`; all rechecked in write transaction |
| Historical Request list/detail facts | Existing author-or-effective-`access.decide` visibility; reads do not require still-live composition grants |
| Decide | Existing `access.decide` on `demo-policy`, independent of business/catalog reads |
| Read Rule / export | Existing `policy.export` on both Resources, unchanged |

`demo-business` explicitly covers the entire isolated synthetic Process/Need/communication domain; it is not creator ownership and is not a multi-tenant boundary. No foreign protected Process/communication catalog may be imported into that scope. Resource placement disclosure is nevertheless individually scoped, so adding a Resource/Deployment does not expose it automatically. A caller with source request authority alone sees no Need/options. A caller with Need read alone learns no Resource placement from this endpoint. `business.need.create`, `access.decide`, and `policy.export` do not imply composition read authority.

The demo Requester receives exactly two additional `access.options.read` grants, for seeded source and destination Resources; Decider and Exporter receive none. Append seed IDs so existing IDs never change. Seed remains explicit and idempotent, does not renew expired existing grants or alter credentials. Upgrading existing v3 demo data means rerunning existing `init-demo`, not a schema migration. Custom test requesters need explicit business/disclosure grants when they submit; do not grant them to every actor automatically.

This deliberately tightens **reference disclosure prerequisites** on direct POST as well as GET: otherwise someone can bypass option filtering and learn hidden placements via successful submissions and subsequent detail. It does not require destination request authority, change AccessSubject identity, or turn discovery into ALLOWED. This compatibility change is explicit in the proposal and spec delta, not silently treated as existing behavior. The proposed P1 decision is complete and reviewable; owner approval of the spec is still pending.

### 3. Error policy and authoritative existing write path

For well-formed input, authenticate before protected lookup. On every new GET and strengthened POST use this precedence:

| Check | Failure result |
| --- | --- |
| Missing/invalid credential | 401 `UNAUTHENTICATED`, existing generic envelope |
| Either business read grant absent, expired, not-yet-valid or wrong scope | 403 `FORBIDDEN`, before Process/Need/selection lookups |
| POST source absent, or lacking source read/request authority | Identical 403 `FORBIDDEN`; resolve via authorized lookup, do not expose which predicate failed |
| Process/Need absent, Need not under requested Process; destination absent/unreadable; Revision absent/outside Need Interaction | Identical 404 `NOT_FOUND`, message `Entity not found`, no identifiers or metadata |
| All involved references within authorized scope, but roles/Application/Need participant or same-Interaction revision group inconsistent | 400 `INVALID_SUBJECT`, generic incompatibility message, no per-object diagnostics |
| Malformed/unsupported input | 422 `INVALID_INPUT`, no echo of values |

GET has no submitted source ID and no global request permission gate: absence of any eligible placement produces an empty revisions page. Deployment-query revisions that are absent, hidden or no longer fully selectable all get the same 404. Authorization failures must not reveal protected object existence even when probing random path IDs; 422 syntax errors never imply existence.

POST remains exactly `{connectivityNeedId,interactionRevisionId,sourceDeploymentId,destinationDeploymentId}` with four required UUID fields, no additional Process ID, nonce or save endpoint. Derive Process from persisted Need. In existing `BEGIN IMMEDIATE` transaction: capture one time; check all live grants and readable references; validate Process, Need, Interaction group, Revision, Components/Applications, Deployment Resources and exact subject; only then reuse/insert Subject and insert Request. Every failure rolls back, including an injected failure after Subject insertion. Never create a Decision or Rule during submission. Admission evidence continues recording only source request grant, actor and check time; disclosure grants are not permission evidence.

The Process/Need path binding applies to GET. POST has no Process parameter or remembered selection session: another readable, compatible Need in another Process is a valid independent justification, not a forbidden substitution. A mismatched path pair fails GET; an incompatible or unreadable Need fails POST. Do not invent creator ownership or bind admission to a previous GET.

For POST, check destination visibility and Revision membership before returning semantic diagnostics so incompatibility never reveals a hidden reference. Revocation committed before write transaction acquisition must be observed; a writer holding the SQLite write transaction prevents concurrent grant mutation until completion. GET eligibility is advisory, never an admission token. Expired or revoked destination read grants yield the same 404 as unknown destination; revoked source request/read or business grants yield 403. Do not return 409 for a stale selection or repeated request. Repeated authorized POSTs remain independent PENDING requests sharing one Subject.

All new options responses and Request list/detail/POST responses, including their errors, use `Cache-Control: no-store`. For existing `GET /access-requests/{requestId}`, preserve unrelated-actor 403 and normalize unknown ID to the same 403 envelope to avoid an existence oracle; visible requests still return 200. This small retrieval hardening is required because the DTO now includes linked IDs. Rule/decision endpoints retain their existing contracts.

### 4. Minimal persisted Request projection

Extend existing `AccessRequest` with required fields:

```text
connectivityNeedId: UUID
subject: {
  sourceDeploymentId: UUID,
  destinationDeploymentId: UUID,
  interactionRevisionId: UUID
}
```

Read from `access_requests.need_id` and its `access_subjects` row in the same transaction. Keep existing status, subjectId, requesterActorId, timestamps, admission and decision fields. Use the same DTO in POST, list, detail and nested `Rule.originatingRequest`; list visibility remains filtered before paging. Old saved requests have these references already, so no backfill or migration is needed.

Historical author/decider may see these minimal audit references even after business/options/request grants expire. This is access to a request they own or adjudicate, not a right to browse linked catalogs. No Process metadata, destination Resource, addresses, extra traffic/catalog fields or automatically followed protected links are added to this projection. Decider needs no `access.options.read` to adjudicate. Rule ID in a decision remains a fact; it must not become a link into the MOCK Rule UI.

### 5. Existing Need-context composition and navigation

On `/business-processes/{processId}?tab=needs`, select a persisted Need row and expand its communication/composition block inside the tab. Display its stable Need/Interaction/source Component and authorized Process context, three labeled selectors, Revision traffic, selected Deployment/Resource facts, and compact `Запросить доступ` summary. This maps the accepted S02 composition onto the existing REAL tab; it does not create a separate wizard, Shell or global Need catalog.

Revision selection fetches both paginated deployment kinds. A changed Need/Revision clears dependent values and confirmation. Each selector has independent previous/next controls; changing its page clears that selector and confirmation, so submission never relies on an unlisted stale choice. Require explicit choice even for one option. Summary includes Need, direction, exact Revision, actual protocol/ports, both Deployments and both Resource IDs. Confirmation is a clearly labeled in-place action after summary, not navigation to another form. No POST occurs before confirmation. Explain that PENDING is not permission and ALLOWED does not prove network availability.

Disable submit while loading, incomplete, invalid or busy. Guard double clicks; do not add backend idempotency because repeated requests are allowed. On successful 201 navigate to `/access-requests/{returnedRequestId}` and fetch saved detail; restore composition from GET after reload/restart. `/access-requests/new` remains a stable navigation entry showing a link to REAL BusinessProcesses to select a Need; remove the four-UUID form/defaults. Existing list/new/detail navigation and manual-token fallback remain usable, and the local-demo path uses the existing Demo actor control.

On 400/403/404 or failed options refresh, invalidate selection/confirmation and offer a safe refresh; never label it DENIED or reveal why a hidden candidate disappeared. Show a neutral no-available-options message for empty pages. Do not infer that no placements exist globally. On network failure do not auto-retry POST: outcome may be unknown, so offer the existing request list for checking before an intentional new submission. On actor/credential, Process or Need change, clear protected selections/data/errors and ignore stale async GET/POST completions, including late navigation and 401 from the previous session. Existing MOCK simulation remains isolated.

### 6. Verification and handoff

One real browser E2E must create a Process and Need through UI, choose exact Revision/source/destination from backend options, confirm and see PENDING, reload, **stop and restart backend against the same temporary SQLite**, reopen the same request and exact Need/tuple, switch Demo actor to Decider, confirm ALLOWED and see persisted decision/rule ID. Assert zero Decisions/Rules before decision. Using the existing protected Rule backend with Exporter credential, verify `ruleId`, `subject`, originating request/decision and exactly one Rule for that Subject (DB assertion allowed in test). No Requester/Decider export grant is added for this check.

Integration tests cover multiple revisions/placements and hidden rows before paging, all grant windows and revocation between GET/POST, cross-Process Need substitution, unrelated Revision, conflicting same-Interaction revisions, reversed/wrong-Application placements, absent IDs and non-disclosure error pairs, strict inputs and zero partial Subject/Request/Decision/Rule rows. Verify author/decider historical DTO reads, unrelated/unknown Request error parity, repeated requests from different Needs resolving the same Subject, repeated ALLOWED reusing Rule, DENIED leaving Rule unchanged and INACTIVE not reactivated. Test actual snapshot/time boundary, not client-only permission mocks.

Keep all existing regressions. Explicitly update affected expectations: source missing POST becomes 403; unknown Request GET becomes 403; new endpoint increases OpenAPI path count; new seed grants increase grant count; custom submitter fixtures need explicit read grants; UUID-form browser tests migrate to Need selection. These are specified contract/fixture changes, not deletion of negative coverage. Run strict OpenSpec, full pytest/coverage, blocking Ruff, web typecheck/build, semantic contract, proxy and full Playwright; record advisory Ruff/format/Pyright separately as existing CI does. CI/production tests are not edited by this specification PR.

Implementation handoff must include exact head SHA, matching Verify run, blocking/advisory results, completed OpenSpec tasks, smoke evidence and owner acceptance in the implementation PR before any future squash merge. Specification readiness is distinct from implementation acceptance.

## Risks / Trade-offs

- Separate read gates tighten old local POST clients → mark breaking, provision only explicit demo grants, update documented fixtures and test both read-only and request-only actors.
- Technical UUID labels are verbose → display actual direction/traffic and select controls; no manual UUID entry or invented names. Display metadata is a later slice.
- Global `demo-business` is not tenant isolation → confine to synthetic local demo; per-Resource grants prevent placement discovery beyond explicitly granted Resources.
- Live offset pages can change between requests → reset selections on refresh and revalidate transactionally; no snapshot tokens.
- Lack of reliable POST retry identity → no automatic retry, preserve explicit repeated-request semantics.
- This slice does not expose Rule Detail, full history or advanced visibility reasons → no claims of missing rules or working network access; existing backend verifies policy facts.

## Migration Plan

No SQLite migration: keep v3, tables, existing identities and immutability. Deploy backend/client together in local demo and rerun explicit `init-demo` to append the two grants; preserve private credentials and expired grants. Existing requests reconstruct immediately. Rollback code/client together; extra grants are inert in the older code and saved Requests remain compatible, but rollback reopens the old disclosure behavior and must not be represented as the hardened release.

## Readiness

No unresolved P0/P1 architecture question is deferred to implementation. This is a proposed contract awaiting coordinator/owner review, especially the explicit read-gate tightening. Once approved, the implementation tasks are bounded and require no further catalog/IAM redesign. This PR neither implements nor authorizes merge.
