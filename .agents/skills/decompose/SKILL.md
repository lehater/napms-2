---
name: decompose
description: Prepare or decompose a NAPMS GitHub Issue for the AI task workflow. Use when turning a parent outcome into scoped sub-issues or making an executable issue Ready.
---

1. Open the source Issue and consult [.ai/workflow.yaml](../../../.ai/workflow.yaml). Read the relevant repository and OpenSpec sources, inspect existing children and blockers, and confirm the expected outcome and boundaries.
2. Apply D1–D8. Reuse matching Issues and put independently verifiable outcomes under the parent with GitHub Sub-issues. Record prerequisites with native GitHub dependencies. Use the lifecycle rules to close planning parents after their acceptance conditions are met.
3. Set issue metadata using GitHub fields and labels specified in the policy. Fill one fenced YAML block per executable Issue using the [Issue template](../../../.github/ISSUE_TEMPLATE/ai-task.md) and [schema](../../../.ai/task.schema.json). Include the references and decisions the executor needs, allowed changes, and observable acceptance evidence.
4. Install the optional validator dependencies once with `python3 -m pip install -e '.[workflow]'` in the development environment. Validate the saved Issue from the repository root with `gh issue view <number> --json body --jq .body | python3 scripts/validate-task`, or pipe the Issue body from the GitHub connector into the same validator.
5. Set Project Status to Ready after the validator succeeds and you confirm the context is current and the outcome is executable. Dependencies can still block assignment. Report the prepared Issues, open decisions and blockers.
