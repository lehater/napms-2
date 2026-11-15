"""Contracts for the read-only CI impact selector, with no third-party dependencies."""

import json
import unittest
from pathlib import Path

from ci_test_selector import Change, MAP, docs_path, parse_diff, select


class ImpactSelectorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mapping = json.loads(MAP.read_text(encoding="utf-8"))

    def plan(self, *paths, status="M", exists=lambda _: True):
        changes = tuple(Change(status, (p,)) for p in paths)
        return select(changes, self.mapping, sha="test-merge", mapping_sha="fixed", target_exists=exists)

    @staticmethod
    def selected(plan):
        return {g["id"] for g in plan["selected_groups"]}

    def test_nul_terminated_diff(self):
        self.assertEqual(
            parse_diff(b"M\0web/src/navigation.ts\0A\0README.md\0"),
            (Change("M", ("web/src/navigation.ts",)), Change("A", ("README.md",))),
        )

    def test_renames_retain_both_paths(self):
        changes = parse_diff(b"R100\0web/src/Old.tsx\0web/src/New.tsx\0")
        self.assertEqual(changes[0].paths, ("web/src/Old.tsx", "web/src/New.tsx"))
        self.assertEqual(select(changes, self.mapping)["mode"], "FULL")

    def test_truncated_or_empty_diff_is_rejected(self):
        for raw in [b"", b"M\0foo", b"R090\0old\0", b"\0"]:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                parse_diff(raw)

    def test_traversal_and_control_characters_are_rejected(self):
        for raw in [b"M\0../unsafe\0", b"M\0/absolute\0", b"M\0docs/a\nb.md\0"]:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                parse_diff(raw)

    def test_weird_but_valid_filename_is_data_not_shell(self):
        raw = b"M\0src/x;$(curl bad).py\0"
        plan = select(parse_diff(raw), self.mapping)
        self.assertEqual(plan["mode"], "FULL")
        self.assertTrue(any("Unmapped file" in r for r in plan["full_reasons"]))

    def test_docs_only_is_selected(self):
        plan = self.plan("README.md", "docs/architecture/intro.md",
                         "openspec/changes/foo/.openspec.yaml", status="A")
        self.assertEqual(plan["mode"], "SELECTED")
        self.assertEqual(self.selected(plan), {"checks:validate", "checks:semantic"})

    def test_non_ascii_documentation_path_is_safe(self):
        self.assertTrue(docs_path("docs/архитектура.md"))
        plan = select(parse_diff("A\0docs/архитектура.md\0".encode()), self.mapping)
        self.assertEqual(plan["mode"], "SELECTED")

    def test_unsupported_docs_executable_is_full(self):
        self.assertEqual(self.plan("docs/helpers.py")["mode"], "FULL")

    def test_isolated_opencode_config_selects_role_tests(self):
        plan = self.plan("opencode.jsonc")
        self.assertEqual(plan["mode"], "SELECTED")
        self.assertEqual(self.selected(plan), {"checks:validate", "checks:semantic", "python:opencode"})
        self.assertIn("python:all", {g["id"] for g in plan["excluded_groups"]})

    def test_changed_opencode_contract_test_is_selected(self):
        self.assertIn("python:opencode", self.selected(self.plan("tests/test_opencode_role_catalog.py")))

    def test_isolated_navigation_selects_browser_dependency(self):
        plan = self.plan("web/src/navigation.ts")
        self.assertEqual(plan["mode"], "SELECTED")
        self.assertTrue({"web:build", "web:harness"} <= self.selected(plan))
        self.assertNotIn("python:all", self.selected(plan))

    def test_union_of_two_independent_ui_changes(self):
        plan = self.plan("web/src/BusinessProcesses.tsx", "web/src/PolicyRules.tsx")
        self.assertEqual(plan["mode"], "SELECTED")
        self.assertTrue({"web:business", "web:harness", "web:build"} <= self.selected(plan))

    def test_shared_api_and_sqlite_are_full(self):
        for path in ["src/napms/http.py", "src/napms/storage.py", "src/napms/use_cases.py"]:
            with self.subTest(path=path):
                self.assertEqual(self.plan(path)["mode"], "FULL")

    def test_mixed_known_and_unknown_is_full(self):
        plan = self.plan("web/src/navigation.ts", "src/napms/http.py")
        self.assertEqual(plan["mode"], "FULL")
        self.assertIn("python:all", self.selected(plan))

    def test_ci_and_selector_changes_are_full(self):
        for path in [".github/workflows/verify.yml", "scripts/ci_test_selector.py",
                     "ci/test-impact-map.json", "pyproject.toml", "web/package-lock.json"]:
            with self.subTest(path=path):
                self.assertEqual(self.plan(path)["mode"], "FULL")

    def test_deleted_source_is_full(self):
        self.assertEqual(self.plan("web/src/navigation.ts", status="D")["mode"], "FULL")

    def test_unavailable_target_falls_back_to_full(self):
        plan = self.plan("opencode.jsonc", exists=lambda _: False)
        self.assertEqual(plan["mode"], "FULL")
        self.assertTrue(any("Missing test target" in x for x in plan["full_reasons"]))

    def test_corrupt_map_does_not_select_subset(self):
        broken = {**self.mapping, "rules": [{"paths": ["x"], "groups": ["missing"], "contracts": ["x"]}]}
        self.assertEqual(select((Change("M", ("x",)),), broken)["mode"], "FULL")

    def test_empty_changes_do_not_select_subset(self):
        self.assertEqual(select((), self.mapping)["mode"], "FULL")

    def test_repeatable_and_sorted(self):
        changes = (Change("M", ("web/src/navigation.ts",)),
                   Change("M", ("web/src/BusinessProcesses.tsx",)))
        a = select(changes, self.mapping, sha="fixed", mapping_sha="hash")
        b = select(changes, self.mapping, sha="fixed", mapping_sha="hash")
        self.assertEqual(a, b)
        self.assertEqual([g["id"] for g in a["selected_groups"]],
                         sorted(g["id"] for g in a["selected_groups"]))


if __name__ == "__main__":
    unittest.main()
