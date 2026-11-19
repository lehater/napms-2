# Backlog refinement pilot — Stage D

**Issue:** [#131](https://github.com/lehater/napms-2/issues/131)

**Scope:** the existing #127 family and product candidate #126 only.

**Source:** `main` at `0063cb2f1443b50d258e8ff4579352f497f76541`; Issue #131 body last updated `2026-11-18T17:29:52Z`.

## Coordinator: selection and priority comparison

The bounded sample contains one verified SDLC enabler and one owner-requested product outcome:

| Issue | Evidence and proposal | Persisted Project #6 state |
|---|---|---|
| [#127](https://github.com/lehater/napms-2/issues/127) | P1 remains justified by its verified critical-path role; Stages A–C are integrated. | Preparing · P1 · SDLC |
| [#126](https://github.com/lehater/napms-2/issues/126) | Its owner-authored title and classification specify P1. The contract cites D-04 and a real Interaction creation review; this is a user-facing domain/UX correction. No due date or milestone is stated, and its native blocker count is zero. It remains P1 alongside #127; this records the owner’s priority tier and does not claim an exact ordering between the workstreams. | Preparing · P1 · Product |
| [#131](https://github.com/lehater/napms-2/issues/131) | Bounded acceptance pilot, valuable but without a product delivery deadline; retain P2. | Running · P2 · SDLC |

Before this pilot, #126's Project Priority and Workstream were empty despite its explicit P1 and Product scope in the saved Issue. The owner-authored values were read, compared with #127's verified P1 critical-path value, and applied to the existing Project item. `Product` is supported by the real Application/Interaction scope. No new Issue, Project item, label, or relationship was created.

## Refiner: reuse, decomposition, and open work

- #127 is genuinely decomposable: policy (#128), Skill (#129), admission (#130), and pilot (#131) have distinct outcomes. GitHub read-back returned exactly these four native Sub-issues; the pilot added none.
- #128 is the accepted canonical intake/priority policy (PR #132, squash commit `fb06314eeac339673bd70d18363c6f396620072b`). A repeated policy request should reuse it, not create another Issue.
- #129 is one bounded Skill outcome and #130 is one admission safeguard; neither needs further splitting. Their accepted PRs are #133 (`7e5a2d7b9ebbf513ef9cf54f12daa7104c7b965d`) and #134 (`db63aa43f52dcca04e310010368a86b71c939dab`).
- #126 remains one cohesive product task under its own root. Its saved contract says to audit purpose semantics and compatibility before implementation. It remains Preparing; the pilot did not start its Worker or reparent it under #127.
- #129 and #130 are CLOSED/COMPLETED in GitHub, and still natively block #131 with satisfied completion reasons. Their Project Status is still Review; the Issue #131 handoff identifies changing those completed cards to Done as a separate administrative operation, so this pilot leaves them unchanged.

## Project Operator: native operations and read-back

Project #6 is `https://github.com/users/lehater/projects/6`. Relevant item IDs were #126 `PVTI_lAHOAKOiO84Brdw8zhJzQj8` and #131 `PVTI_lAHOAKOiO84Brdw8zhJzeso`.

For #126, the Issue body already specified Type Task, Reasoning High, Effort Medium, Priority P1, Area `area:application-catalog` (or an existing equivalent), and initial Status Preparing. The repository has no `area:application-catalog` label; `area:business-connectivity` is the existing equivalent used by Issues #108–#110. The Project Operator applied these values at their native sources and read them back:

- Issue Type: Task; Issue Fields: Reasoning High, Effort Medium; Area: `area:business-connectivity`.
- Project #6: Status Preparing, Priority P1, Workstream Product.
- Native parent, blockers, and assignees: none. Its contract validates, but its own instructions keep it Preparing until the semantic/source audit is complete.

For #131, read-back confirmed Type Task, Reasoning Medium, Effort Medium, `area:sdlc`, Project Priority P2, and Workstream SDLC. The pre-existing native parent is #127; #127's full Sub-issue list is #128–#131. Its complete `blocked_by` list is #129 and #130, each CLOSED with state reason `completed`. No relationships or Project items were added.

#131's Project Status changed Preparing → Ready → Running. After the Ready write, `gh issue view` read back Ready. `python3 scripts/check-task-admission 131` then returned `{"decision":"ALLOW","reasons":[]}` immediately before assignment. The authenticated executor `lehater` was assigned and independently read back; Project Status Running was then written and read back. The Issue remains OPEN. No additional Worker was dispatched and no automatic execution was enabled.

The existing saved contracts for #126 and #131 both pass `scripts/validate-task`. The Stage B/C merges are present on the recorded `main` source. The pilot made no OpenSpec or product-code changes and required no application test run.

## Handoff and limits

The Issue body is the portable handoff: it stores the Coordinator, Refiner, Project Operator, Worker/Reviewer boundaries, executable contract, native desired-state conditions, and required capabilities independently of a model name. The handoff from the GitHub connector to the authenticated `gh` CLI is recorded in the Issue comment linked below; the CLI re-read it before applying the Review transition. The workflow remains human-assisted; this pilot did not enable unattended dispatch or merging.

Autonomous readiness gaps remain explicit: there is no approved unattended trigger, bounded execution budget/retry policy, or automated stop/approval boundary for priority conflicts and partial native writes. Assignment, review, acceptance, and merge remain manual. No cost or token measurements were collected.

**Next action:** owner reviews the linked PR and accepts or requests changes. Keep #126 Preparing until its implementation audit resolves the purpose semantics and compatibility questions. Reconcile the separate #129/#130 Project Status mismatch when authorized.
