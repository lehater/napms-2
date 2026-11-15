"""Exercise the validator through its command-line entry point."""

import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COMMAND = [sys.executable, str(ROOT / "scripts/validate-task")]
CONTRACT = """```yaml
schema_version: 1
goal: Return a clear error for a missing task.
context: ["docs/engineering/sdlc-improvement-roadmap.md"]
scope: ["scripts/validate-task"]
acceptance: ["Missing input produces a structured error."]
verification: ["Run the targeted validator checks."]
```
"""


class ValidateTaskTest(unittest.TestCase):
    def run_validator(self, body):
        result = subprocess.run(COMMAND, input=body, text=True, capture_output=True, check=False)
        self.assertEqual(result.stderr, "")
        return result.returncode, json.loads(result.stdout)

    def test_valid_issue_body(self):
        issue = "# Expected outcome\n\n~~~~text\n```yaml\nexample\n```\n~~~~\n" + CONTRACT
        self.assertEqual(self.run_validator(issue), (0, {"valid": True, "errors": []}))

    def test_missing_required_field(self):
        status, result = self.run_validator(CONTRACT.replace("schema_version: 1\n", ""))
        self.assertEqual(status, 1)
        self.assertFalse(result["valid"])
        self.assertEqual(result["errors"][0]["code"], "required")

    def test_wrong_type_in_list(self):
        status, result = self.run_validator(CONTRACT.replace('"scripts/validate-task"', "123"))
        self.assertEqual(status, 1)
        self.assertEqual(result["errors"][0]["code"], "type")
        self.assertEqual(result["errors"][0]["path"], ["scope", 0])

    def test_invalid_yaml_and_duplicate_keys(self):
        for replacement, expected in [
            ("schema_version: [1", "invalid_yaml"),
            ("schema_version: 1\nschema_version: 1", "duplicate_key"),
        ]:
            with self.subTest(expected=expected):
                status, result = self.run_validator(CONTRACT.replace("schema_version: 1", replacement))
                self.assertEqual(status, 1)
                self.assertEqual(result["errors"][0]["code"], expected)

    def test_requires_exactly_one_closed_contract(self):
        for body, expected in [
            ("Task without a contract.", "missing_contract"),
            (CONTRACT + CONTRACT, "multiple_contracts"),
            (CONTRACT[:-4], "unclosed_contract"),
        ]:
            with self.subTest(expected=expected):
                status, result = self.run_validator(body)
                self.assertEqual(status, 1)
                self.assertEqual(result["errors"][0]["code"], expected)

    def test_blank_issue_template_is_not_executable(self):
        template = ROOT / ".github/ISSUE_TEMPLATE/ai-task.md"
        result = subprocess.run(COMMAND + [str(template)], text=True, capture_output=True, check=False)
        self.assertEqual(result.returncode, 1)
        errors = json.loads(result.stdout)["errors"]
        self.assertEqual({e["path"][0] for e in errors}, {"goal", "context", "scope", "acceptance", "verification"})
        self.assertTrue(all(e["code"] == "pattern" for e in errors))


if __name__ == "__main__":
    unittest.main()
