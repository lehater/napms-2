# Implementation tasks: Semantic labels and current policy

Specification accepted via PR #56, squash commit `f66c23ff1cdf6d59ccbf63bcca2a16da9e0ddd7c`. Implementation evidence: `docs/evidence/semantic-labels-current-policy.md`; final HEAD and matching CI are recorded in PR #55. Owner acceptance remains pending: task 5.3 below and `compose-access-request-from-need` task 4.3 stay open.

## 1. Minimal naming metadata and migration

- [x] 1.1 Audit v3 SQLite immutability triggers and catalog seed. Choose the smallest additive name-metadata storage approach without changing immutable structural IDs or weakening authority checks. Document optional/historical name behavior.
- [x] 1.2 Implement and test the explicit, transactional migration (future schema version if needed), preserving live v3 records, links, grants, Decisions, Rules and existing credentials. Add idempotent synthetic catalog names to demo seed without overwriting operator input or reviving expired grants.
- [x] 1.3 Ensure catalog name values are validated as actual operator input (where CRUD exists); no fake names, client aliases, reverse DNS inference or general catalog CRUD in this task.

## 2. Server labels and REAL Need/Request UI

- [x] 2.1 Implement one typed traffic formatter for current single TCP/UDP destination port interval: `tcp(443)`, `udp(5353-5355)`. Verify stable, lossless format. Specify future multi-clause/ICMP notation only; do not expand traffic model.
- [x] 2.2 Implement server-owned, authorization-safe display projections for Interaction, Revision, Deployment, Need, Request and Rule. Canonical Rule label must use exact Subject, not one Request; Need label must not imply a particular Revision. Missing name remains explicitly missing.
- [x] 2.3 Update REAL Process/Need lists and Revision/Deployment selectors to foreground readable labels; preserve authorized exact-ID technical details and confirmation summary, paging/selection/reset and source-only POST.
- [x] 2.4 Update Request list/detail to foreground domain label, status/date and distinguish repeated Requests with shared Subjects. Preserve existing admission/decision/visibility contracts after grant revocation; no unauthorized catalog label leakage.

## 3. REAL PolicyRule collection and current export

- [x] 3.1 Add authorized bounded `GET /policy-rules`: return canonical ACTIVE/INACTIVE Rules with server labels; filter fully by effective `policy.export` on both Resources before stable pagination, no global total/leakage. Keep selected Rule GET unchanged.
- [x] 3.2 Add `GET /policy/export/current?format=json|csv` reusing existing evaluator and CSV schema; one pinned committed read snapshot/UTC evaluationAt across ALL actor-authorized ACTIVE canonical Rules, READY/INCOMPLETE, no duplicates from multiple ALLOWED decisions.
- [x] 3.3 Preserve existing `GET /policy/export?ruleId=...` semantics; test actor-scoped/global distinction, mixed grants, expirations/revocations, stable ordering, concurrent changes, null addresses, INACTIVE, empty export and JSON/CSV parity.

## 4. REAL policy UI and verification

- [x] 4.1 Add a real `Правила политики` Sidebar collection; preserve only working REAL entries, direct Rule detail/deep links, status and separate provenance/allowances. The main UI must not load MOCK Research modules.
- [x] 4.2 Add actual selected-Rule and current **authorized** policy downloads. Make current scope visible before download; do not imply complete system policy unless completeness is proven. Keep protected data and downloads isolated on actor/credential changes.
- [x] 4.3 Extend real backend integration tests for schema migration/seed compatibility, name absence, formatter, semantic label confidentiality, canonical Rule de-duplication and full snapshot policy export.
- [x] 4.4 Extend full REAL Playwright E2E: Process/Need → Request → PENDING/restart → independent ALLOWED → Rule collection → selected Rule and current policy JSON/CSV bytes. Verify meaningful displayed labels, one Rule for repeated ALLOWED, actor authority, page/actor reset and 1440×900 / 1920×1080 / 2560×1440. No mocked API.

## 5. Exit criteria and handoff

- [ ] 5.1 Run strict OpenSpec, full pytest/coverage, blocking Ruff, web build/typecheck, semantic contract, proxy and full Playwright; record final HEAD and matching CI. Advisory baseline debt tracked separately.
- [x] 5.2 Record reproducible owner smoke for human-readable REAL objects, visible Rule collection and current actor-authorized aggregate JSON/CSV export; retain bytes/evaluation provenance without credentials.
- [ ] 5.3 Obtain **explicit owner manual acceptance** for the extended product outcome. Until then keep PR #55 Draft and its existing task 4.3 open; do not merge on automated tests alone.

## Non-goals

No general catalog CRUD, global policy authority model, DNS-based identity, production IAM, ICMP/multi-clause traffic modeling, firewall application, historical as-of export or visual redesign.
