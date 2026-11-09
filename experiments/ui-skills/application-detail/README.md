# NAPMS 2.0 — controlled UI Skill experiment (Application detail)

**Status:** paired delegated Codex pilot executed; see [results and raw evidence](RESULTS.md). Exact runtime model/effort is not independently attested; this is not a fully verified CLI replication.
**Scope:** research-only; no product implementation or Harness/CI change in this PR.
**Source commit (both arms):** `642a6f8f5d7e903641068887bd5a32ae6ea466d3` (`main`, PR #35).
**Target route:** `/prototype/applications/mock-application`.
**Product priority unchanged:** Issue #37 (real domain-backed scenario) remains separate.

## Question and hypothesis

Does providing two reputable UI Skills to Codex improve the readability, clarity and accessibility of the **existing** Application object detail, without affecting NAPMS domain semantics, approved UI Baseline, test gates or implementation simplicity?

The test compares **two new Codex runs**, not the accepted current screen versus one new Codex run. Each arm starts from the same commit. No claim of statistical significance: this is a one-task paired pilot, with a go/no-go decision only for a larger experiment.

## Immutable inputs

- `docs/research/ui-baseline-v0.2/README.md` (approved behavior, navigation and styling constraints)
- `docs/research/ui-baseline-v0.1/reference.html` (visual reference)
- `docs/domain.md`, `docs/contracts/ux-0-semantic-boundaries.json`
- `web/src/prototype/{Prototype,Views,Shell,Resources,data}.tsx|ts` as applicable, `web/src/prototype/baseline.css`
- `web/e2e/{prototype,semantic-contract}.spec.ts`, `web/playwright.config.ts`
- Same Codex model, effort and version for both runs; fresh agent sessions, equivalent tool permissions, no cross-run sharing of edits.

**Skill sources for arm B** (record the installed resolved commit and CLI version):
- Anthropic Frontend Design: `anthropics/skills@2c5958ecac7cee2b583967a2c4981d0f4a75c579` / `frontend-design`
- shadcn/ui: `shadcn-ui/ui@8ab27715521cbd4f87ae6886cd989cbb678f6de7` / `shadcn`
- Audit, applied to **both arms** only after edits: Vercel Web Interface Guidelines `vercel-labs/web-interface-guidelines@434b7f91364665f2f733b310ec54809bf8f37937`, file `command.md`. Do not fetch mutable `main` as an instruction source.

Skills must be installed in the **B worktree only**, without changing `AGENTS.md` or the OpenSpec rules. Do not commit skills or unrelated generated files. Review any downloaded skill instructions and shell commands before use. No bypass of Codex approvals or sandbox.

## Identical task for both Codex arms

> Improve the existing read-only **Application Object Detail** (`/prototype/applications/mock-application`) for an enterprise network policy operator. Optimize visual hierarchy, scanning, keyboard navigation and comprehension of the source → destination communication, component roles and the path to its InteractionRevision. Preserve approved v0.2 IA: three Sidebar groups, seven collections, Overview/Components/Communications tabs, existing object identities, deep links, fixture values and all domain invariants. Components in this fixture are roles, not independent entities with fabricated IDs. The page remains MOCK and never invokes the real API.
>
> Work only in frontend UI presentation files relevant to this screen; prefer existing components and CSS. Do not introduce dependencies unless strictly necessary and explicitly recorded. Do not modify backend, SQLite, API, OpenSpec, domain/ERD, fixtures, contracts or CI. No landing-page redesign, hero section, decorative animation, new product features or blanket styling changes. Produce a minimal patch, one paragraph explaining why it improves this task, and verifiable evidence from build, semantic tests and browser tests. Do not change anything outside the stated scope.

For arm A: use only existing built-in Codex and repository OpenSpec Skills. Do not load additional design skills.

For arm B: same task, with **frontend-design** and **shadcn** skills enabled and invoked. Respect incumbent UI Baseline above the skills when recommendations conflict. No new component installation without inspecting `shadcn add --dry-run`; respect project dependencies.

## Runs

1. Create two separate working trees/branches `exp/ui-application-A` and `exp/ui-application-B` from **exactly** `642a6f8`. Do not base B on the output of A. Use clean sessions.
2. Apply the shared task, record `codex --version`, model/effort, instruction files used, installed skill revisions, and `git diff --stat`.
3. Run from each `web` directory: `npm ci`, `npm run build`, `npm run test:semantic`, and `npm run test:e2e` (with the same local Chromium/Python prerequisites used by existing CI). Record exit codes and evidence; no credentials in logs or screenshots.
4. Capture at least `/prototype/applications/mock-application` Overview, Components and Communications at **1440×900**, **1920×1080** and **390×844** for both runs. Use identical page state, browser, zoom and Sidebar width; check keyboard-only navigation and horizontal overflow.
5. Audit both results using the **same pinned** Vercel guidelines, in a separate read-only review session. Report reproducible `file:line` findings, severity P0–P3 and any false positives. Do not authorize the auditor to patch either arm.
6. Compare both against the unchanged baseline `main`. Preserve raw screenshots and check logs only in the experiment evidence area or Draft PR (never credentials). Do not merge A or B into main automatically.

## Evaluation: gates first, then merit

**Hard fail:** any broken existing build/semantic/E2E gate; changes to the 7-collection navigation or domain meaning; MOCK/REAL blending; fabricated Component identities or states; added backend/API/schema/fixtures/CI; accessibility regression; or unapproved new dependency.

For runs passing the gates, score each criterion as `improved / unchanged / regressed`, with a screenshot or reproducible observation:
1. Comprehension of source, destination, component role, direction and revision.
2. Information density and visual hierarchy at desktop width.
3. Readability and absence of clipped/overflowing text at narrow width.
4. Keyboard navigation and visible focus; no inaccessible controls.
5. Change cost: files/LOC/dependencies and whether repeated UI patterns were reused.

Do not use stars, subjective visual appeal or number of skill instructions as evidence. Keep assessor feedback blind to the A/B label when possible.

**Decision:** recommend retaining a skill **only** if B has at least one demonstrated usability/accessibility improvement over A and no hard fails or disproportionate complexity. Otherwise reject or extend the experiment; one pilot does not establish a general productivity advantage.

## Initial source-only observations (not A/B results)

- `web/src/prototype/Views.tsx` already uses URL-addressable navigation links for detail tabs and explicitly distinguishes Component roles from independent objects.
- `web/src/prototype/Shell.tsx` has a `<main>` landmark but no explicit “skip to main content” link: a candidate accessibility finding to verify in the browser.
- `web/src/index.css` already provides `:focus-visible` outlines for interactive elements, so focus absence must **not** be asserted from screenshots alone.
- Existing Playwright tests cover geometry and mock/real semantics. Any proposed additional test needs a specific uncovered regression.

**Next action:** review [actual results](RESULTS.md) and independent audit. Keep accepted `main` untouched; any broader adoption requires a replicated controlled trial.
