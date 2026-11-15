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


def connection(nodes, has_next_page=False):
    return {"nodes": nodes, "pageInfo": {"hasNextPage": has_next_page}}


def snapshot(blockers=(), *, status="Ready", assignees=0, state="OPEN"):
    return {"data": {"repository": {"issue": {
        "state": state,
        "assignees": {"totalCount": assignees},
        "projectItems": connection([{
            "project": {"url": "https://github.com/users/lehater/projects/6"},
            "status": {"name": status},
        }]),
        "issueDependenciesSummary": {"totalBlockedBy": len(blockers)},
        "blockedBy": connection([
            {"url": f"https://github.com/lehater/napms-2/issues/{i}",
             "state": state, "stateReason": reason}
            for i, (state, reason) in enumerate(blockers, start=1)
        ]),
    }}}}


class CheckTaskAdmissionTest(unittest.TestCase):
    def check(self, response, expected, detail="", *, error=None):
        output = io.StringIO()
        with patch("sys.argv", [str(SCRIPT), "2"]), redirect_stdout(output), \
                patch("subprocess.run", side_effect=error,
                      return_value=subprocess.CompletedProcess([], 0, json.dumps(response))) as gh:
            with self.assertRaises(SystemExit) as exit_status:
                runpy.run_path(str(SCRIPT), run_name="__main__")
        decision = json.loads(output.getvalue())
        self.assertEqual(decision["decision"], expected)
        self.assertEqual(exit_status.exception.code, int(expected == "DENY"))
        self.assertIn(detail, " ".join(decision["reasons"]))
        gh.assert_called_once()
        command = gh.call_args.args[0]
        self.assertEqual(command[:3], ["gh", "api", "graphql"])
        self.assertIn("number=2", command)

    def test_blocker_completion(self):
        for state, reason, expected in (
            ("OPEN", None, "DENY"),
            ("CLOSED", "NOT_PLANNED", "DENY"),
            ("CLOSED", "COMPLETED", "ALLOW"),
            ("CLOSED", None, "DENY"),
        ):
            with self.subTest(state=state, reason=reason):
                self.check(snapshot([(state, reason)]), expected,
                           "R3:" if expected == "DENY" else "")
        self.check(snapshot(), "ALLOW")

    def test_one_unfinished_blocker_denies_admission(self):
        self.check(snapshot([
            ("CLOSED", "COMPLETED"),
            ("CLOSED", "NOT_PLANNED"),
        ]), "DENY", "/issues/2 is CLOSED/NOT_PLANNED")

    def test_rejects_unavailable_or_partial_github_data(self):
        self.check(snapshot(), "DENY", "HTTP 404", error=subprocess.CalledProcessError(
            1, ["gh"], stderr="gh: HTTP 404",
        ))
        payload = snapshot()
        payload["errors"] = [{"message": "Forbidden"}]
        self.check(payload, "DENY", "GraphQL returned errors")
        payload = snapshot()
        issue = payload["data"]["repository"]["issue"]
        issue["issueDependenciesSummary"]["totalBlockedBy"] = 1
        self.check(payload, "DENY", "R3:")
        issue["blockedBy"]["pageInfo"]["hasNextPage"] = True
        self.check(payload, "DENY", "incomplete")

    def test_rejects_non_ready_and_assigned_issues(self):
        self.check(snapshot(state="CLOSED"), "DENY", "R1:")
        self.check(snapshot(status="Running"), "DENY", "R1:")
        self.check(snapshot(assignees=1), "DENY", "R6:")
        payload = snapshot()
        payload["data"]["repository"]["issue"]["projectItems"]["nodes"][0]["project"] = {
            "url": "https://github.com/users/other/projects/6",
        }
        self.check(payload, "DENY", "R1:")
