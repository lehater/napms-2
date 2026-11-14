"""Structural checks for the proposed OpenCode V2 role contract.

These checks do not replace runtime permission-denial probes or OS sandbox tests.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "opencode.jsonc").read_text(encoding="utf-8"))


def rules_for(role: str) -> list[dict[str, str]]:
    return CONFIG["agents"][role]["permissions"]


def has_rule(
    rules: list[dict[str, str]], action: str, effect: str, resource: str = "*"
) -> bool:
    return any(
        rule.get("action") == action
        and rule.get("effect") == effect
        and rule.get("resource") == resource
        for rule in rules
    )


class OpenCodeRoleContractTests(unittest.TestCase):
    def test_expected_agents_and_default(self) -> None:
        self.assertEqual(CONFIG["default_agent"], "orchestrator")
        self.assertEqual(
            set(CONFIG["agents"]),
            {
                "orchestrator",
                "explore",
                "architect",
                "planner",
                "worker",
                "validator",
                "reviewer",
            },
        )
        self.assertEqual(CONFIG["agents"]["orchestrator"]["mode"], "primary")
        self.assertTrue(
            all(
                CONFIG["agents"][name]["mode"] == "subagent"
                for name in set(CONFIG["agents"]) - {"orchestrator"}
            )
        )

    def test_local_model_has_an_explicit_provider(self) -> None:
        # Regression: a clean HOME previously failed with provider.no-route.
        model = CONFIG["agents"]["orchestrator"]["model"]
        provider_id, model_id = model.split("/", 1)
        provider = CONFIG["providers"][provider_id]
        self.assertEqual(
            provider["package"], "@opencode/ai/providers/openai-compatible"
        )
        self.assertEqual(provider["settings"]["baseURL"], "http://127.0.0.1:11434/v1")
        self.assertTrue(provider["models"][model_id]["tool_call"])
        for name, agent in CONFIG["agents"].items():
            if name != "orchestrator":
                self.assertNotIn("model", agent)  # Inherit the active session model.

    def test_global_deny_first_and_no_unrestricted_writer(self) -> None:
        self.assertEqual(
            CONFIG["permissions"][0], {"action": "*", "resource": "*", "effect": "deny"}
        )
        self.assertTrue(has_rule(CONFIG["permissions"], "edit", "deny"))
        self.assertTrue(has_rule(CONFIG["permissions"], "shell", "deny"))
        self.assertTrue(has_rule(CONFIG["permissions"], "execute", "deny"))
        for role in CONFIG["agents"]:
            self.assertFalse(has_rule(rules_for(role), "edit", "allow"))
            self.assertFalse(has_rule(rules_for(role), "execute", "allow"))

    def test_orchestrator_only_delegates_to_catalog_roles(self) -> None:
        rules = rules_for("orchestrator")
        self.assertEqual(
            {(r["action"], r["resource"], r["effect"]) for r in rules},
            {
                ("subagent", name, "allow")
                for name in CONFIG["agents"]
                if name != "orchestrator"
            }
            | {("skill", "*", "deny")},
        )
        for role in CONFIG["agents"]:
            if role != "validator":
                self.assertFalse(
                    any(
                        r["action"] == "shell" and r["effect"] != "deny"
                        for r in rules_for(role)
                    )
                )

    def test_worker_requires_explicit_edit_approval(self) -> None:
        rules = rules_for("worker")
        self.assertTrue(has_rule(rules, "edit", "ask"))
        self.assertTrue(has_rule(rules, "shell", "deny"))
        self.assertTrue(has_rule(rules, "execute", "deny"))
        self.assertTrue(has_rule(rules, "external_directory", "deny"))

    def test_reviewer_and_planners_are_read_only(self) -> None:
        for role in ("explore", "architect", "planner", "reviewer"):
            with self.subTest(role=role):
                rules = rules_for(role)
                for action in (
                    "edit",
                    "shell",
                    "execute",
                    "external_directory",
                    "subagent",
                ):
                    self.assertTrue(has_rule(rules, action, "deny"))

    def test_validator_shell_allowlist(self) -> None:
        rules = rules_for("validator")
        self.assertTrue(has_rule(rules, "shell", "ask"))
        actual = {
            r["resource"]
            for r in rules
            if r["action"] == "shell" and r["effect"] == "allow"
        }
        self.assertEqual(
            actual,
            {
                "git diff --check",
                "python3 scripts/check-fast.py --dry-run",
                "openspec validate --all --strict",
            },
        )


if __name__ == "__main__":
    unittest.main()
