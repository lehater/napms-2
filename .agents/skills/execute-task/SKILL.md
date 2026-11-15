---
name: execute-task
description: Execute a prepared NAPMS GitHub Issue under the AI task workflow. Use for a Ready issue with an execution contract, from eligibility checks through a pull request and verification evidence.
---

1. Read [.ai/workflow.yaml](../../../.ai/workflow.yaml), the GitHub Issue and its Project item. Apply R1–R7, including the native blocker completion rule. Validate the saved Issue with `gh issue view <number> --json body --jq .body | python3 scripts/validate-task`. The optional `.[workflow]` dependencies are required. Use the Issue body from the GitHub connector when CLI access is unavailable.
2. After validation succeeds, coordinate assignment with the planner or owner. Recheck eligibility and ownership immediately before assignment, record the executor and set Project Status to Running. Work in a dedicated branch or worktree.
3. Implement within the contract's scope. Follow project and OpenSpec instructions. Check the verification commands against the authorized scope, run the checks, and collect acceptance evidence. If a required decision or material contract change prevents progress, record the reason in the Issue and apply the transition back to Preparing.
4. Open and link the pull request, record verification evidence, and set the Issue's Project Status to Review. Use the workflow policy for any review return or completion. Record owner acceptance and required integration before closing the Issue as completed and setting Done.
