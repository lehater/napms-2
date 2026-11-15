#!/usr/bin/env python3
"""Evaluate completed Verify job results before approving a merge candidate.

During introduction this job is additive; the existing four required checks
remain protected by the GitHub Ruleset until a separate migration.
"""

from __future__ import annotations

import os
import sys


def evaluate(env: dict[str, str]) -> tuple[bool, list[str]]:
    """Return (accepted, reasons). Unknown/missing state always rejects."""
    errors: list[str] = []

    def value(name: str) -> str:
        return env.get(name, "").strip()

    if value("VALIDATE") != "success":
        errors.append("validate did not succeed")
    if value("SEMANTIC") != "success":
        errors.append("semantic-contract did not succeed")

    event = value("EVENT")
    if event == "pull_request":
        if value("IS_DRAFT") != "false":
            errors.append("Draft PR cannot satisfy the merge gate")
        if value("CHANGES") != "success":
            errors.append("change classification did not succeed")
        if value("PLAN_MODE") not in {"FULL", "SELECTED"}:
            errors.append("missing or unknown impact plan")
        sha = value("CANDIDATE_SHA")
        if not sha or sha != value("GITHUB_SHA"):
            errors.append("plan candidate SHA does not match the checked commit")
        docs = value("DOCS_ONLY")
        application, web = value("APPLICATION"), value("WEB")
        if docs == "true":
            if application != "skipped" or web != "skipped":
                errors.append("docs-only must intentionally skip both expensive jobs")
        elif docs == "false":
            if application != "success" or web != "success":
                errors.append("product change requires both application and web success")
        else:
            errors.append("missing or invalid docs-only classification")
    elif event == "workflow_dispatch":
        if value("CHANGES") != "skipped":
            errors.append("manual FULL must not depend on PR-only change classification")
        if value("APPLICATION") != "success" or value("WEB") != "success":
            errors.append("manual FULL requires successful application and web checks")
    else:
        errors.append("unsupported event or missing event type")

    return not errors, errors


def main() -> int:
    keys = (
        "EVENT", "IS_DRAFT", "CHANGES", "PLAN_MODE",
        "CANDIDATE_SHA", "GITHUB_SHA", "DOCS_ONLY",
        "APPLICATION", "WEB", "VALIDATE", "SEMANTIC",
    )
    state = {key: os.environ.get(key, "") for key in keys}
    accepted, errors = evaluate(state)
    message = (
        "CI aggregate: PASS — every check required by the current change scope completed."
        if accepted else
        "CI aggregate: FAIL — " + "; ".join(errors)
    )
    print(message)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as output:
            output.write("### ci-required (additive, not yet in Ruleset)\n\n")
            output.write("**" + ("PASS" if accepted else "FAIL") + "**\n\n")
            for key in ("EVENT", "CHANGES", "DOCS_ONLY", "APPLICATION", "WEB",
                        "VALIDATE", "SEMANTIC", "PLAN_MODE"):
                output.write("- " + key + ": " + state[key].replace("\n", " ") + "\n")
            for error in errors:
                output.write("- ERROR: " + error + "\n")
    return 0 if accepted else 1


if __name__ == "__main__":
    sys.exit(main())
