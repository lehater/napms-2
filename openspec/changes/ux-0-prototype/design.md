# Design

## Context

See proposal.md for motivation. Existing App owns in-memory credentials and real request routes. Research IA is provisional and contains more workspaces than Issue #23 authorizes.

## Goals / Non-Goals

**Goals:** Stable linked research navigation without real data access; small common table/card rendering patterns.

**Non-Goals:** Backend expansion, product acceptance of research entities, simulated writes, final IAM, revoke or revision lifecycle.

## Decisions

- Route `/prototype/*` before mounting the credential-owning real App. This prevents mock views from obtaining a client or credentials and clears protected UI when leaving real routes. A mixed mock/API data provider would introduce unnecessary coupling.
- Use a typed static object graph and references by distinct `mock-` IDs. Shared table and detail card render explicit fields and relationships, never API inputs. Eight sections group objects without building a generic schema engine.
- Keep fixture targets as candidates. One fixed complete fictional target gives missing 443/excess 8443; another unknown capture gives Uncomparable. No operations are offered, avoiding invented execution evidence.
- Reuse React Router, Tailwind and native controls; no new dependency. Test fixture references and actual browser chain, zero fetch/XHR, direct links, search, and real route boundary.
- Research ERD alignment (#25/#26): add stable Interaction, explicit Endpoint cards and TAE set/entry within existing sections. Need references Interaction and names its participant; concrete requests retain the exact revision. Label each kind as persistent logical state or computed view; all relationship links are UI navigation, not a physical ERD. TAE only references its own facts and a computed interpretation, never an AP rule or NEP object. Configured derives from those facts under an explicit fictional completeness/scope assumption. Unknown capture stays null rather than an empty permit set or Any.
- Show current RC values as readings of temporal address/site/responsibility facts with intervals, without history editors. Distinguish source-only RequestAuthorityEvidence from decision authority and RuleAuthorizationEvidence using labeled card fields. Existing NST cards remain computed candidates; no Firewall/routing engine, persisted reachability, matching store or NEO is introduced.

## Risks / Trade-offs

- Research mistaken for accepted behavior → persistent mock banner and change limited to prototype contract.
- Generic display loses context → domain-specific summaries, labeled provenance and relationship links.
- No real network evidence → fixed timestamps and explicit candidate/completeness limits; never claim delivery or real target discovery.

## Open Questions

For later product decisions: validate the eight navigation labels with users; define evidence freshness/completeness and target equivalence contracts; choose contextual request picking and separate withdrawal lifecycle. These do not block read-only UX-0.
