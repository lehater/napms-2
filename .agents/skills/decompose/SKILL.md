---
name: decompose
description: Refine one NAPMS Issue or a bounded backlog set, reuse or decompose outcomes, and prepare executable Issues for the AI task workflow.
---

Use [.ai/workflow.yaml](../../../.ai/workflow.yaml) as the source for intake, priority, D1–D8, metadata, lifecycle and handoff rules. The Coordinator performs refinement with this Skill and optional scoped read-only Explorer help. Project Operator is the responsibility for authorized native GitHub I/O. Verify capabilities in the current runtime; these responsibilities do not require a particular model, shell or runtime.

## Refine and propose

1. Bound the input to a specified Issue or explicit candidate list/query in a repository, Project #6, workstream or parent. For next-task preparation, inspect Product Structure with `is:open status:Preparing` and native prerequisites in that scope. Record the selection and stop boundary; avoid a whole-repository or backlog audit.
2. Read current source Issues, updates, parent/children and blockers. Check nearby open/closed Issues, relevant PRs and prior decisions for matching outcomes. Inspect relevant repository/OpenSpec sources on demand at a recorded SHA; reuse research after checking freshness. Record canonical identity, evidence and the decision from `refinement.intake` for each candidate. Preserve accepted completed work unless evidence justifies reopening; check ongoing work before proposing overlap. Missing context stays in Preparing with the minimum question/evidence needed.
3. Apply D1–D8: retain one executable Issue when further splitting adds no value; create children only for distinct, independently verifiable outcomes. Match existing Issues before proposing new ones. Include parent/source references, adopted owner decisions and genuine prerequisites. Escalate unresolved product/architecture decisions through the Coordinator.
4. Propose Type, Reasoning, Effort, Area, Priority, Workstream and Status at the policy's native sources. Compare relevant candidates using `refinement.prioritization` and record evidence/uncertainty. Discover actual field IDs/options and Project membership, distinguishing Issue Fields from similarly named Project fields. Missing required options or disputed priority requires clarification. Do not inherit parent priority.
5. Prepare exactly one fenced YAML execution contract per executable Issue using the [Issue template](../../../.github/ISSUE_TEMPLATE/ai-task.md) and [schema](../../../.ai/task.schema.json). Include current references/SHA, adopted decisions, allowed changes, observable acceptance, verification, required capabilities and escalation conditions. Planning parents follow the existing lifecycle acceptance rules.
6. Before assignment or handoff, the Coordinator applies the task boundary and routing guidance in [orchestration policy](../../../.ai/workflow.yaml): record the outcome/source, required capabilities, selected runtime and model/reasoning mode, and whether this is an independent task, continuation, bounded refinement batch or new attempt. Follow [optional task tracing](../../../.ai/codex-task-tracing.md) for runId correlation; do not duplicate its setup here.
7. Present a compact desired-state proposal: canonical repository/Issue URLs and IDs (or distinct outcome proposed for creation), Project/item identity, observed Issue update/version and source SHA, evidence, decisions, required capabilities and ordered operations with exact expected content, native relationships and classification/Project values. The Coordinator approves routine changes within authorized scope, serializes conflicting writes and escalates owner decisions before application.

## Apply and reconcile

8. Project Operator uses only approved native GitHub CLI/API operations available in the runtime. Re-read the baseline before writing; reconcile drift or return for a revised decision. Match canonical identities/outcome scope before creation and use persisted IDs subsequently. Before retrying a timeout or partial batch, inspect for existing Issues, links and Project items; apply only missing approved changes and preserve unrelated data. Include removals explicitly in the approved plan. Use the shared [GitHub operations reference](../../../.ai/github-operations.md) for live field/option discovery, pagination, API forms, and permission diagnostics; it is command guidance, not additional policy.

   Use existing native operations below when a shell is available, or supported connector equivalents. Verify endpoint/request support and discovered IDs before writes; unsupported operations require a handoff.

   | Resource | Apply | Independent read-back |
   | --- | --- | --- |
   | Issue content/labels | `gh issue create/edit --repo OWNER/REPO`, with `--body-file` for prepared bodies | `gh issue view` or Issue API: saved content, identity and update |
   | Issue Type, Reasoning, Effort | Authorized Issue/Issue Field API with verified field/option IDs | Re-read Issue Type and Issue Field values at the policy's native sources |
   | Parent/children | Native Sub-issues/parent API via `gh api` | Re-read parent and complete child lists, comparing canonical IDs |
   | Blockers | Native issue dependencies API via `gh api` | Re-read complete `blocked_by` list and dependency state/reason |
   | Project membership/fields | `gh project item-add` / `item-edit` or ProjectV2 API with discovered IDs | Re-read Project #6 membership and each expected field, including Status |

   Follow pagination for compared collections. Incomplete/inaccessible read-back or a successful write response alone cannot establish equality.

9. Compare actual with desired state per operation and report persisted IDs, expected values, actual read-back, differences and exact failures/permissions. Reapplying matching state creates no additional Issues, relationships or items. On stale baseline, unknown options, unavailable capabilities or partial writes, stop dependent operations, keep/request Preparing and record verified partial state plus exact remaining operations. If the Status write is unavailable, explicitly deny Ready/admission and report the discrepancy; do not claim Preparing was persisted. Markdown references are evidence, never native hierarchy/dependencies.
10. Validate each saved executable Issue with existing optional `.[workflow]` dependencies (install only if absent). From the repository root: `gh issue view <number> --repo OWNER/REPO --json body --jq .body | python3 scripts/validate-task`. Without a shell, hand the saved body to a capable runtime for this same check and retain its result. Set Ready only after validation, current executable context, native classification/Project read-back and reconciled relationships satisfy `refinement.desired_state.ready`; read back Ready too. Known incomplete dependencies may still block later assignment under R3.

## Persist the handoff

11. Save concise evidence in the relevant GitHub Issue or linked PR: canonical identities, source version/SHA, adopted decisions, existing contract reference, authorized desired-state operations, required capabilities, actual read-back/IDs/differences, validation results, unresolved blockers and one next action. Reference the existing contract rather than copying it to a second store. If the runtime cannot persist the note, return its exact text and remaining executable native operations for a human to transfer. The receiving ChatGPT, Codex or other runtime re-reads GitHub and checks freshness/capabilities before continuing.
12. Report prepared/reused Issues, truthful statuses, open decisions and blockers. Preparation ends here. Assignment remains manual through the existing `execute-task` R1–R7 boundary; do not dispatch a Worker or merge as a consequence of refinement.
