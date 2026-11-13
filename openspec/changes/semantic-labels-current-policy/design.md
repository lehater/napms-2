# Design: Human-readable REAL entities and current-policy view

## Context and domain ownership

Current SQLite v3 uses structural IDs for Resources, Applications, Components, Deployments, Revisions, Needs and Rules. BusinessProcess already has a human-entered name. Catalog data is presently initialized through synthetic demo seed; general catalog CRUD is outside the accepted slice. The API only supports selected Rule export (`ruleId` required), with `policy.export` on both Resources.

**Responsibility split:** named domain data is stored with its owning catalog entity; server read projections resolve authorized relationships and format deterministic labels; React renders them and retains UUIDs for API/links/technical detail.

## 1. Minimum naming data and compatibility

- **BusinessProcess**: existing user-entered `name`.
- **Resource**: user-provided hostname/FQDN-style label. This is a descriptive name, NOT an IP, a DNS lookup result or the stable Resource identity.
- **Application**: user-provided profile name.
- **Component**: user-provided component name unique within its Application's naming context; the UUID remains globally stable.
- Missing names in migrated historical data remain **missing**, with an explicit `Название не задано` placeholder and secondary abbreviated/copyable ID. Do not guess real names from UUIDs or reverse DNS.
- Additive SQLite migration from v3; preserve rows, immutable structural keys, grants, historical Decisions/Rules, and same-DB restart. Demo seed provides meaningful synthetic input names idempotently and must not renew grants, rewrite existing human data or secretly reset the DB.
- Immutable structural relationships remain immutable. Metadata editability is separate from identity: design the minimum safe storage/update boundary that respects existing DB triggers. Do not add general CRUD to this iteration.

## 2. Derived labels and traffic expression

One server-owned label formatter composes display text from typed, authorized fields; never persist a redundant free-form `name` for derived entities.

- Interaction: `SourceComponent → DestinationComponent` (Application context may disambiguate).
- InteractionRevision: `SourceComponent → DestinationComponent · tcp(443)` (port interval from this exact revision).
- ComponentDeployment: `Component @ Resource` (two Deployments may legitimately have the same label; show secondary ID where needed).
- ConnectivityNeed: `BusinessProcess · SourceComponent → DestinationComponent`. Need refers to Interaction and source Component, **not** a specific Revision; do not attach revision traffic unless the surrounding selection explicitly names that revision.
- AccessRequest: `SourceComponent @ SourceResource → DestinationComponent @ DestinationResource · tcp(443)`; display PENDING/ALLOWED/DENIED and date in separate fields; multiple requests may share the same display label.
- AccessDecision: outcome and corresponding Request label; no independent user-defined name.
- PolicyRule: exact ordered AccessSubject + chosen Revision traffic, independent of particular Need or originating Request. Provide separate allowances/provenance and ACTIVE/INACTIVE state.
- Endpoint (when displayed): Resource label and current address/kind, if known; address never defines identity.

**Canonical traffic presentation (destination transport ports):**
- `tcp(443)`, `udp(8000-8010)`, `tcp(1-10,15,35555),udp(5353)`.
- Lowercase protocol tokens. Inclusive positive integer intervals; an isolated port has no range separator. Sort/deduplicate/merge overlapping or adjacent *equivalent* port intervals, then join with commas and no spaces. Stable protocol order (`tcp`, `udp`, `icmp`, `icmpv6`).
- When supported by a future typed domain: `icmp(8/0,0/0)` and `icmpv6(128/0,129/0)` represent type/code pairs, not ports. Preserve distinct pairs; no wildcard meaning or ICMP input grammar is invented here.
- v3 supports one TCP/UDP protocol + one destination port interval per Revision. Implement its `tcp(443)` / `udp(5353-5355)` renderer now; the multi-clause/ICMP examples are future display conventions only.

Labels are presentation metadata, not policy identifiers, access-control keys, export schema replacements or trusted names provided by the browser.

## 3. Authorization-safe read projection

- Keep existing POST `/access-requests` source-only admission; new labels may not become new POST prerequisites.
- Existing Requester sees their own Request and Decider sees their authorized Requests under current rules. Enrich those authorized records only with readable facts; a label must not initiate a broad unauthorized catalog lookup. Missing/redacted names must not be filled by MOCK or leaked through errors.
- Need and options labels originate from the already authorized Process/Need/options flow and respect Resource disclosure filtering; never reveal hidden candidate Resources through labels, list counts or pagination.
- Exporter-specific Rule collection/exports use effective `policy.export` on BOTH source and destination Resources (current time/snapshot). No shared Requester/Decider rights are inferred.
- Protect route transitions and in-flight results across demo actor/credential changes. Persisted UUIDs and provenance remain accessible in authorized technical detail.

## 4. PolicyRule collection and distinct current-policy projection

Introduce `GET /policy-rules?limit=20&offset=0` returning `{items,limit,offset,hasMore}`. Items show `ruleId`, state, server label, exact subject identities, typed transport parameters and selected permissions/provenance references. Enumerate one canonical Rule per AccessSubject (not one per ALLOWED Decision). Include ACTIVE and INACTIVE, with status explicit.

**Read rules:** authenticate actor; in one read transaction pin one instant for grants; require both Resource `policy.export` grants per candidate; filter before pagination; stable order by Rule identity (or documented deterministic fields), no global totals, no visibility-derived leak through errors.

Introduce `GET /policy/export/current?format=json|csv` for the **authorized current policy**, reusing the existing export evaluator. The new endpoint is distinct from `GET /policy/export?ruleId=...&format=...` to preserve existing query and response semantics.

- Build from **ACTIVE**, authorized canonical Rules only; one committed pinned SQLite snapshot and one `evaluationAt` across all grants, current Endpoint addresses and rows. This is not a sequence of per-Rule HTTP requests.
- Preserve existing row fields, deterministic ordering and READY/INCOMPLETE behavior, including null address values. Multiple ALLOWED decisions for one subject do not duplicate a policy row.
- JSON: `{scope:"authorized",evaluationAt,rows:[...]}`, with no `selectedRuleId` (that field only makes sense for single Rule). CSV: existing column header/rows and evaluation metadata. Each response makes the actor-authorized scope unambiguous; it is **not** a globally complete system policy.
- No matching/authorized ACTIVE Rules returns empty JSON rows or header-only CSV, not a fabricated global policy. The response must not contain hidden Rule IDs, totals, addresses or provenance.
- In the Rule collection UI, provide contextual Rule Detail/per-Rule downloads plus clearly labeled `Выгрузить доступную текущую политику` JSON/CSV. Show that INACTIVE Rule remains in collection but is omitted from effective current export.
- Loading, auth errors and files must be protected across actor/credential changes; download actual backend bytes. No automatic upload/apply to firewall or invented readiness.

## 5. Dependencies and scope

PolicyRule list/aggregate export depends on the actual REAL path being finalized in Draft PR #55; its existing selected-Rule API remains authoritative. Scope addition in this Draft OpenSpec requires review before executor implementation. Keep security and migration tests, Browser E2E and manual owner smoke as exit criteria.

Explicit exclusions: aggregate export is **all actor-authorized currently ACTIVE Rules**, not a guarantee of every system Rule; no production tenant/global authority model; no bulk Rule mutation, history reconstruction, general catalog editor, network application, new traffic clauses or full visual redesign.
