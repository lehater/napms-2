"""Regression tests for bounded local checks (no worktree lifecycle wrapper)."""

from __future__ import annotations

import importlib.util
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("check_fast_for_bounded_tests", SCRIPTS / "check-fast.py")
check_fast = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = check_fast
spec.loader.exec_module(check_fast)


class BoundedChecksTests(unittest.TestCase):
    def test_short_command_succeeds(self):
        with tempfile.TemporaryDirectory() as tmp:
            code, timed_out = check_fast.run_bounded(
                (sys.executable, "-c", "print('ok')"), Path(tmp), 5,
            )
        self.assertEqual((code, timed_out), (0, False))

    @unittest.skipUnless(os.name == "posix", "process groups require POSIX")
    def test_slow_command_ends_at_timeout(self):
        with tempfile.TemporaryDirectory() as tmp:
            started = time.monotonic()
            code, timed_out = check_fast.run_bounded(
                (sys.executable, "-c", "import time; time.sleep(30)"), Path(tmp), 1,
            )
            elapsed = time.monotonic() - started
        self.assertEqual((code, timed_out), (124, True))
        self.assertLess(elapsed, 6)

    @unittest.skipUnless(os.name == "posix", "process groups require POSIX")
    def test_timeout_kills_surviving_child_in_same_group(self):
        with tempfile.TemporaryDirectory() as tmp:
            location = Path(tmp)
            ready = location / "child-ready"
            marker = location / "child-survived"
            child = (
                "import pathlib,signal,sys,time;"
                "signal.signal(signal.SIGTERM, signal.SIG_IGN);"
                "pathlib.Path(sys.argv[1]).write_text('ready');"
                "time.sleep(2);"
                "pathlib.Path(sys.argv[2]).write_text('survived')"
            )
            parent = (
                "import subprocess,sys,time;"
                f"subprocess.Popen([sys.executable,'-c',{child!r},sys.argv[1],sys.argv[2]]);"
                "time.sleep(30)"
            )
            result = check_fast.run_bounded(
                (sys.executable, "-c", parent, str(ready), str(marker)),
                location, 1,
            )
            self.assertEqual(result, (124, True))
            self.assertTrue(ready.exists(), "child must start before the group is killed")
            time.sleep(2.5)
            self.assertFalse(marker.exists(), "timeout left a live descendant")


class TargetedPlaywrightChecksTests(unittest.TestCase):
    def test_existing_modified_spec_selects_exact_playwright_target(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec = root / "web/e2e/requests.spec.ts"
            spec.parent.mkdir(parents=True)
            spec.write_text("// existing spec", encoding="utf-8")
            entries = [check_fast.Change("M", ("web/e2e/requests.spec.ts",))]
            checks = check_fast.checks_for(root, "web", entries, "HEAD")
            self.assertEqual([c.label for c in checks], [
                "TypeScript and production build",
                "Web semantic boundary",
                "Changed Playwright E2E specs",
            ])
            self.assertEqual(checks[-1].cwd, "web")
            self.assertEqual(checks[-1].argv, (
                "npm", "exec", "--", "playwright", "test", "e2e/requests.spec.ts",
            ))

    def test_modified_web_ui_and_two_specs_target_only_both_specs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ("requests", "rules"):
                path = root / f"web/e2e/{name}.spec.ts"
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("// existing spec", encoding="utf-8")
            entries = [
                check_fast.Change("M", ("web/src/App.tsx",)),
                check_fast.Change("M", ("web/e2e/rules.spec.ts",)),
                check_fast.Change("M", ("web/e2e/requests.spec.ts",)),
            ]
            checks = check_fast.checks_for(root, "web", entries, "HEAD")
            self.assertEqual(checks[-1].argv[-2:], ("e2e/requests.spec.ts", "e2e/rules.spec.ts"))

    def test_missing_target_never_skips_browser_tests(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            entries = [check_fast.Change("M", ("web/e2e/requests.spec.ts",))]
            self.assertEqual(check_fast.checks_for(root, "web", entries, "HEAD"), check_fast.FULL)




if __name__ == "__main__":
    unittest.main()
