"""Regression checks for the coordinator's GitHub admission decision."""

import io
import json
import runpy
import subprocess
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("check-task-admission")
PROJECT = "https://github.com/users/lehater/projects/6"
PARENT_URL = "https://api.github.com/repos/lehater/napms-2/issues/127"
TASK_BODY = (
    "Parent: #127. **Dependency:** #128 must be accepted before this is Ready.\n"
    "## Execution contract\n"
    "```yaml\n"
    "schema_version: 1\n"
    "goal: Admit only issues with a valid contract.\n"
    "context:\n  - '#127'\n"
    "scope:\n  - Reuse the existing admission check.\n"
    "acceptance:\n  - Required native metadata must be verified.\n"
    "verification:\n  - Run the focused admission tests.\n"
    "```\n"
)
PARENT_BODY = """<!-- CHILDREN_START -->
- [x] #128 — Stage A
- [x] #129 — Stage B
- [ ] #130 — Stage C
- [ ] #131 — Stage D
<!-- CHILDREN_END -->"""


def connection(nodes, has_next_page=False):
    return {"nodes": nodes, "pageInfo": {"hasNextPage": has_next_page}}


def snapshot(*, blockers=None, status="Ready", priority="P1", workstream="SDLC",
             assignees=0, state="OPEN", project_url=PROJECT, parent_number=127,
             children=(128, 129, 130, 131), parent_body=PARENT_BODY, body=TASK_BODY,
             project_has_next=False, blocker_has_next=False, child_has_next=False,
             total_blockers=None):
    blockers = blockers if blockers is not None else [(128, "CLOSED", "COMPLETED")]
    return {"data": {"repository": {"issue": {
        "number": 130,
        "url": "https://github.com/lehater/napms-2/issues/130",
        "repository": {"nameWithOwner": "lehater/napms-2"},
        "state": state,
        "body": body,
        "assignees": {"totalCount": assignees},
        "projectItems": connection([{
            "project": {"url": project_url},
            "status": {"name": status} if status else None,
            "priority": {"name": priority} if priority else None,
            "workstream": {"name": workstream} if workstream else None,
        }], project_has_next),
        "issueDependenciesSummary": {
            "totalBlockedBy": len(blockers) if total_blockers is None else total_blockers,
        },
        "blockedBy": connection([
            {"number": number,
             "url": f"https://github.com/lehater/napms-2/issues/{number}",
             "repository": {"nameWithOwner": "lehater/napms-2"},
             "state": blocker_state, "stateReason": reason}
            for number, blocker_state, reason in blockers
        ], blocker_has_next),
        "parent": ({
            "number": parent_number,
            "url": f"https://github.com/lehater/napms-2/issues/{parent_number}",
            "repository": {"nameWithOwner": "lehater/napms-2"},
            "body": parent_body,
            "subIssues": connection([{
                "number": number,
                "url": f"https://github.com/lehater/napms-2/issues/{number}",
                "repository": {"nameWithOwner": "lehater/napms-2"},
            } for number in children], child_has_next),
        } if parent_number is not None else None),
    }}}}


def source_issue(*, state="open", body=TASK_BODY, parent_url=PARENT_URL, labels=None,
                 issue_type="Task", fields=None):
    if labels is None:
        labels = ["area:sdlc"]
    if fields is None:
        fields = [
            ("Reasoning", "Medium"),
            ("Effort", "Medium"),
        ]
    return {
        "number": 130,
        "url": "https://api.github.com/repos/lehater/napms-2/issues/130",
        "state": state,
        "body": body,
        "parent_issue_url": parent_url,
        "type": {"name": issue_type} if issue_type else None,
        "labels": [{"name": label} for label in labels],
        "issue_field_values": [
            {"issue_field_name": name, "single_select_option": {"name": value}}
            for name, value in fields
        ],
    }


class CheckTaskAdmissionTest(unittest.TestCase):
    def check(self, response, expected, detail="", *, source=None,
              graphql_error=None, rest_error=None, contract_result=None):
        output = io.StringIO()
        calls = []
        if graphql_error:
            calls.append(graphql_error)
        else:
            calls.append(subprocess.CompletedProcess([], 0, json.dumps(response)))
            if rest_error:
                calls.append(rest_error)
            else:
                calls.append(subprocess.CompletedProcess([], 0, json.dumps(source or source_issue())))
                if contract_result is None:
                    contract_result = {"valid": True, "errors": []}
                calls.append(subprocess.CompletedProcess([], 0, json.dumps(contract_result)))

        with patch("sys.argv", [str(SCRIPT), "130"]), redirect_stdout(output), \
                patch("subprocess.run", side_effect=calls) as gh:
            with self.assertRaises(SystemExit) as exit_status:
                runpy.run_path(str(SCRIPT), run_name="__main__")

        decision = json.loads(output.getvalue())
        self.assertEqual(decision["decision"], expected)
        self.assertEqual(exit_status.exception.code, int(expected == "DENY"))
        self.assertIn(detail, " ".join(decision["reasons"]))
        expected_calls = 1 if graphql_error or (not graphql_error and response.get("errors")) else len(calls)
        self.assertEqual(gh.call_count, expected_calls)
        graphql_command = gh.call_args_list[0].args[0]
        self.assertEqual(graphql_command[:3], ["gh", "api", "graphql"])
        self.assertIn("number=130", graphql_command)
        if rest_error and expected_calls == 2:
            self.assertEqual(gh.call_args_list[1].args[0],
                             ["gh", "api", "repos/lehater/napms-2/issues/130"])
        elif expected_calls == 3:
            self.assertEqual(gh.call_args_list[1].args[0],
                             ["gh", "api", "repos/lehater/napms-2/issues/130"])
            self.assertTrue(gh.call_args_list[2].args[0][1].endswith("/scripts/validate-task"))
            self.assertEqual(gh.call_args_list[2].kwargs["input"],
                             response["data"]["repository"]["issue"]["body"])

    def test_all_required_metadata_and_native_relationships_allow_admission(self):
        self.check(snapshot(), "ALLOW")

    def test_blocker_completion_and_declared_dependencies(self):
        for state, reason, expected in (
            ("OPEN", None, "DENY"),
            ("CLOSED", "NOT_PLANNED", "DENY"),
            ("CLOSED", "COMPLETED", "ALLOW"),
            ("CLOSED", None, "DENY"),
        ):
            with self.subTest(state=state, reason=reason):
                self.check(snapshot(blockers=[(128, state, reason)]), expected,
                           "R3:" if expected == "DENY" else "")

        self.check(snapshot(blockers=[]), "DENY", "native blockers do not match")
        self.check(snapshot(blockers=[
            (128, "CLOSED", "COMPLETED"),
            (129, "CLOSED", "COMPLETED"),
        ]), "DENY", "native blockers do not match")

    def test_flat_hierarchy_markdown_child_references_do_not_pass(self):
        self.check(snapshot(children=[]), "DENY", "native parent Sub-issues omit this Issue")
        self.check(snapshot(children=[128, 129, 131]), "DENY",
                   "native Sub-issues do not match the parent's declared children")

    def test_parent_and_subissue_pagination_or_mismatch_fail_closed(self):
        self.check(snapshot(parent_number=126), "DENY", "declared Parent")
        self.check(snapshot(child_has_next=True), "DENY", "incomplete GitHub connection")
        self.check(snapshot(parent_body="children are mentioned, but there are no native markers",
                            children=[]), "DENY", "native parent Sub-issues omit this Issue")

    def test_declared_dependencies_are_compared_without_exact_prose(self):
        body = "Parent: #127. **Dependency:** #128 must complete first."
        graph = snapshot(body=body)
        rest = source_issue(body=body)
        graph["data"]["repository"]["issue"]["blockedBy"] = connection([])
        graph["data"]["repository"]["issue"]["issueDependenciesSummary"]["totalBlockedBy"] = 0
        self.check(graph, "DENY", "native blockers do not match", source=rest)
        self.check(snapshot(body=body, blockers=[(128, "CLOSED", "COMPLETED")]), "ALLOW",
                   source=source_issue(body=body))

        body = "## Dependencies\n- #128 must complete before execution."
        self.check(snapshot(body=body, blockers=[]), "DENY", "native blockers do not match",
                   source=source_issue(body=body))

    def test_rejects_missing_or_ambiguous_classification(self):
        cases = (
            (snapshot(priority=None), source_issue(), "Priority"),
            (snapshot(workstream=None), source_issue(), "Workstream"),
            (snapshot(), source_issue(issue_type=None), "Issue Type"),
            (snapshot(), source_issue(labels=[]), "Area"),
            (snapshot(), source_issue(labels=["area:sdlc", "area:product"]), "Area"),
            (snapshot(), source_issue(fields=[("Reasoning", "Medium")]), "Effort"),
            (snapshot(), source_issue(fields=[("Reasoning", "Medium"),
                                               ("Reasoning", "High"),
                                               ("Effort", "Medium")]), "Reasoning"),
            (snapshot(priority="P3"), source_issue(), "Priority"),
        )
        for graph, rest, detail in cases:
            with self.subTest(detail=detail, graph=graph):
                self.check(graph, "DENY", detail, source=rest)

    def test_rejects_inaccessible_or_incomplete_github_data(self):
        self.check(snapshot(), "DENY", "HTTP 404", graphql_error=subprocess.CalledProcessError(
            1, ["gh"], stderr="gh: HTTP 404",
        ))
        self.check(snapshot(), "DENY", "HTTP 403", rest_error=subprocess.CalledProcessError(
            1, ["gh"], stderr="gh: HTTP 403",
        ))

        payload = snapshot()
        payload["errors"] = [{"message": "Forbidden"}]
        self.check(payload, "DENY", "GraphQL returned errors")
        self.check(snapshot(project_has_next=True), "DENY", "incomplete")
        self.check(snapshot(total_blockers=2), "DENY", "R3:")
        self.check(snapshot(blocker_has_next=True), "DENY", "incomplete")

        rest = source_issue()
        rest.pop("issue_field_values")
        self.check(snapshot(), "DENY", "Issue Field read-back is unavailable", source=rest)

    def test_rejects_stale_or_inconsistent_issue_readback(self):
        rest = source_issue(body="New Issue body")
        self.check(snapshot(), "DENY", "Issue body read-back differs", source=rest)

    def test_current_contract_is_revalidated_with_the_existing_validator(self):
        invalid_body = "Parent: #127 without an execution contract"
        self.check(snapshot(body=invalid_body), "DENY", "R2: Current execution contract is invalid",
                   source=source_issue(body=invalid_body),
                   contract_result={"valid": False, "errors": [{
                       "code": "invalid_contract", "path": [], "message": "missing YAML contract",
                   }]})

    def test_native_relationships_require_canonical_repository_identity(self):
        rest = source_issue(parent_url="https://api.github.com/repos/other/project/issues/127")
        self.check(snapshot(), "DENY", "native parent read-back differs", source=rest)

        graph = snapshot()
        graph["data"]["repository"]["issue"]["blockedBy"]["nodes"][0]["url"] = (
            "https://github.com/other/project/issues/128")
        self.check(graph, "DENY", "native blocker is not in lehater/napms-2")

    def test_rejects_nonready_assigned_or_nonproject_issues(self):
        self.check(snapshot(state="CLOSED"), "DENY", "R1:")
        self.check(snapshot(status="Running"), "DENY", "R1:")
        self.check(snapshot(assignees=1), "DENY", "R6:")
        self.check(snapshot(project_url="https://github.com/users/other/projects/6"),
                   "DENY", "R1:")


if __name__ == "__main__":
    unittest.main()
