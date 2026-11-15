"""Fast stdlib-only regression tests for manual worktree and process controls."""

from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPTS = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS))


def load_script(filename: str, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, SCRIPTS / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


worktree = load_script("task_worktree.py", "task_worktree")
check_fast = load_script("check-fast.py", "check_fast_for_worktree_tests")


def run_git(path: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(path), *args], check=True, capture_output=True, text=True,
    )
    return result.stdout.strip()


class WorktreeContractTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.primary = Path(self.tmp.name) / "projects" / "napms-2"
        self.primary.mkdir(parents=True)
        subprocess.run(["git", "init", "-b", "main", str(self.primary)],
                       check=True, capture_output=True)
        run_git(self.primary, "config", "user.name", "Test")
        run_git(self.primary, "config", "user.email", "test@example.invalid")
        (self.primary / "README.md").write_text("fixture\n", encoding="utf-8")
        run_git(self.primary, "add", "README.md")
        run_git(self.primary, "commit", "-m", "init")
        run_git(self.primary, "update-ref", "refs/remotes/origin/main", "HEAD")

    def test_create_canonical_worktree_and_check_identity(self):
        self.assertEqual(worktree.primary_checkout(self.primary), self.primary)
        path = worktree.create_worktree(self.primary, 42, "feat/issue-42")
        self.assertEqual(path, self.primary.parent / ".worktrees" / "napms-2" / "issue-42")
        self.assertEqual(worktree.primary_checkout(path), self.primary)
        self.assertEqual(run_git(path, "branch", "--show-current"), "feat/issue-42")
        worktree.check_identity(self.primary, path, 42, "feat/issue-42", run_git(self.primary, "rev-parse", "origin/main"))

    def test_create_refuses_existing_worktree_and_bad_branch(self):
        path = worktree.create_worktree(self.primary, 42, "feat/issue-42")
        with self.assertRaisesRegex(worktree.WorktreeError, "already exists"):
            worktree.create_worktree(self.primary, 42, "feat/issue-42-again")
        self.assertTrue(path.is_dir())
        with self.assertRaisesRegex(worktree.WorktreeError, "invalid branch"):
            worktree.create_worktree(self.primary, 43, "--bad")

    def test_create_refuses_missing_origin_main(self):
        run_git(self.primary, "update-ref", "-d", "refs/remotes/origin/main")
        with self.assertRaisesRegex(worktree.WorktreeError, "origin/main missing"):
            worktree.create_worktree(self.primary, 42, "feat/issue-42")

    def test_wrong_path_and_branch_fail_closed(self):
        path = worktree.create_worktree(self.primary, 42, "feat/issue-42")
        with self.assertRaisesRegex(worktree.WorktreeError, "wrong worktree path"):
            worktree.check_identity(self.primary, path, 41, "feat/issue-42", run_git(self.primary, "rev-parse", "origin/main"))
        with self.assertRaisesRegex(worktree.WorktreeError, "wrong branch"):
            worktree.check_identity(self.primary, path, 42, "feat/issue-41", run_git(self.primary, "rev-parse", "origin/main"))

    def test_wrong_base_sha_denied(self):
        path = worktree.create_worktree(self.primary, 42, "feat/issue-42")
        with self.assertRaisesRegex(worktree.WorktreeError, "wrong base SHA"):
            worktree.check_identity(self.primary, path, 42, "feat/issue-42", "0" * 40)

    def test_missing_python_and_foreign_python_import(self):
        path = worktree.create_worktree(self.primary, 42, "feat/issue-42")
        with self.assertRaisesRegex(worktree.WorktreeError, "missing worktree .venv"):
            worktree.check_python(path)
        interpreter = path / ".venv" / "bin" / "python"
        interpreter.parent.mkdir(parents=True)
        interpreter.write_text("#!/bin/sh\nprintf '/other/repo/src/napms/__init__.py\\n'\n",
                               encoding="utf-8")
        interpreter.chmod(0o755)
        with self.assertRaisesRegex(worktree.WorktreeError, "imports napms from"):
            worktree.check_python(path)

    def test_missing_web_deps_and_denied_loopback(self):
        path = worktree.create_worktree(self.primary, 42, "feat/issue-42")
        with self.assertRaises(worktree.WorktreeError):
            worktree.check_web(path)
        with patch.object(worktree.socket, "socket", side_effect=PermissionError("blocked")):
            with self.assertRaisesRegex(worktree.WorktreeError, "loopback bind/listen unavailable"):
                worktree.check_loopback()

    def test_bind_succeeds_but_listen_denied(self):
        from unittest.mock import MagicMock

        sock = MagicMock()
        sock.__enter__.return_value = sock
        sock.listen.side_effect = PermissionError("listen EPERM")
        with patch.object(worktree.socket, "socket", return_value=sock):
            with self.assertRaisesRegex(worktree.WorktreeError, "listen EPERM"):
                worktree.check_loopback()
        sock.bind.assert_called_once_with(("127.0.0.1", 0))
        sock.listen.assert_called_once_with(1)

    def test_git_only_preflight_does_not_require_python_or_web(self):
        path = worktree.create_worktree(self.primary, 42, "feat/issue-42")
        with patch.object(sys, "argv", [
            "task_worktree.py", "preflight", "--issue", "42",
            "--branch", "feat/issue-42", "--path", str(path), "--base-sha",
            run_git(self.primary, "rev-parse", "origin/main"), "--scope", "git",
        ]), patch.object(worktree, "check_python", side_effect=AssertionError("unexpected Python check")), \
                patch.object(worktree, "check_web", side_effect=AssertionError("unexpected Web check")):
            self.assertEqual(worktree.main(), 0)



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


if __name__ == "__main__":
    unittest.main()
