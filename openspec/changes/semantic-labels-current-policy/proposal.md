# Proposal: Semantic labels and visible current policy

## Why

In the running REAL NAPMS flow, Request/Need/Deployment selectors and lists foreground opaque UUIDs. The user also cannot browse all accessible canonical PolicyRules: the primary Sidebar lacks a REAL Rule collection, and export requires knowing a single Rule ID. This blocks the owner's product acceptance of implementation PR #55 despite successful technical E2E.

User decision: prefer deterministic domain-derived display labels; people provide names only for intrinsically named entities. Traffic is shown using compact grouped notation, e.g. `tcp(1-10,15,35555),udp(1-10,15,35555)`; ICMP type/code notation is planned without expanding the current traffic model.

## What Changes

- Introduce human-supplied catalog name metadata for BusinessProcess (existing), Resource (hostname/FQDN), Application (profile name) and Component (application-scoped name). All other labels are derived from authorized domain facts. Preserve technical UUID identity.
- Add server-produced display projections to REAL Need/request/selection surfaces. No client-generated mock aliases or free-form names for Interaction, Need, Request, Deployment or Rule.
- Introduce a REAL PolicyRule collection in the main Sidebar. List authorized canonical Rules (ACTIVE and INACTIVE), with semantic summary, independent provenance and navigation to existing Rule Detail and selected-Rule JSON/CSV export.
- Introduce a single-snapshot current **actor-authorized** policy export in JSON and CSV across visible ACTIVE Rules. Distinguish this subset from a global all-resources export. Existing selected-rule export remains unchanged.
- Verify with real FastAPI/SQLite and React browser tests, including owner-visible navigation, non-disclosure and downloaded bytes.

## Scope and sequencing

This change is a product acceptance extension requested after owner's hands-on review of Draft PR #55. It is **OpenSpec only**; no code, migrations, tests or PR #55 state are changed here. Follow-up implementation may extend the same product acceptance path but must be separately planned and reviewed.

Out of scope: general Resource/Application/Component CRUD, production IAM, global completeness assertions without global grants, ICMP traffic-domain implementation, multi-clause traffic storage, new firewall vendor export, rule deployment, full historical as-of policy and UI redesign.

## Capabilities

- NEW `semantic-display-labels`: canonical domain-derived labels and minimal name metadata.
- NEW `policy-rules-web-ui`: authorized REAL Rule collection and contextual policy actions.
- MODIFIED `access-requests-web-ui`: show meaningful labels instead of UUID-first rows.
- MODIFIED `policy-export`: add authorized current-policy selection/export without altering existing ruleId semantics.

## Risks / decisions

- Schema v3 catalog tables currently lack names and are guarded by immutability triggers. Implementation must use a narrowly scoped additive migration and explicitly preserve stable structural identity; avoid bypassing triggers or fabricating data.
- A Rule can have many ALLOWED decisions/Needs. Its label must be based on exact Subject, not an arbitrarily chosen Request.
- Existing rights grant selected Rule export on both Resources. Collection and current export must filter by the same effective rights before returning metadata, count or bytes.
- Scope wording must never imply that the actor sees every Rule in the system.
- Owner smoke task 4.3 in PR #55 remains open until owner approval; this proposal does not complete or merge it.
