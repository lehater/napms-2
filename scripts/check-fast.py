#!/usr/bin/env python3
"""Select a conservative local verification profile from the complete worktree diff."""

from __future__ import annotations

import argparse
import os
import re
import shlex
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

FAST_FILES = {"web/src/PolicyRule.tsx", "web/src/PolicyRules.tsx"}


@dataclass(frozen=True)
class Check:
    label: str
    argv: tuple[str, ...]
    cwd: str = "."
    advisory: bool = False


FAST_CHECKS = (
    Check("web production build and TypeScript", ("npm", "--prefix", "web", "run", "build")),
    Check(
        "local-demo Playwright suite",
        ("npx", "--no-install", "playwright", "test", "--config", "playwright.harness.config.ts"),
        "web",
    ),
)
FULL_CHECKS = (
    Check("pytest with coverage", ("python", "-m", "pytest", "-q", "--cov=napms", "--cov-report=term-missing")),
    Check("blocking Ruff core", ("python", "-m", "ruff", "check", "--select", "E4,E7,E9,F", "src", "tests")),
    Check("advisory Ruff extended", ("python", "-m", "ruff", "check", "src", "tests"), advisory=True),
    Check("advisory Ruff formatting", ("python", "-m", "ruff", "format", "--check", "src", "tests"), advisory=True),
    Check("advisory Pyright", ("python", "-m", "pyright"), advisory=True),
    Check("web production build and TypeScript", ("npm", "--prefix", "web", "run", "build")),
    Check("web semantic contract", ("npm", "--prefix", "web", "run", "test:semantic")),
    Check("web proxy and complete Playwright suites", ("npm", "--prefix", "web", "run", "test:e2e")),
    Check("strict OpenSpec validation", ("openspec", "validate", "--all", "--strict")),
)


def git(root: Path, *args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=root, stderr=subprocess.PIPE)


def changed_entries(root: Path, base: str) -> list[tuple[str, tuple[str, ...]]]:
    raw = git(root, "diff", "--name-status", "-z", "--find-renames", base, "--")
    fields = raw.split(b"\0")
    if fields[-1] != b"":
        raise ValueError("tracked diff was not NUL terminated")
    fields.pop()
    entries: list[tuple[str, tuple[str, ...]]] = []
    index = 0
    while index < len(fields):
        status = os.fsdecode(fields[index])
        index += 1
        path_count = 2 if status.startswith(("R", "C")) else 1
        if index + path_count > len(fields):
            raise ValueError("incomplete path record in tracked diff")
        paths = tuple(os.fsdecode(item) for item in fields[index : index + path_count])
        entries.append((status, paths))
        index += path_count

    untracked = git(root, "ls-files", "--others", "--exclude-standard", "-z")
    if untracked and not untracked.endswith(b"\0"):
        raise ValueError("untracked path list was not NUL terminated")
    for path in untracked.split(b"\0")[:-1]:
        entries.append(("??", (os.fsdecode(path),)))
    return entries


def select_profile(entries: list[tuple[str, tuple[str, ...]]], missing: list[str]) -> tuple[str, list[str]]:
    reasons: list[str] = []
    paths = {path for _, entry_paths in entries for path in entry_paths}
    if not entries:
        return "full", ["empty control diff; refusing a no-op PASS"]
    for status, entry_paths in entries:
        if status.startswith(("R", "C")):
            reasons.append(f"rename/copy status {status} requires the full profile")
        elif status == "D":
            reasons.append(f"deletion requires the full profile: {entry_paths[0]}")
        elif status not in {"M", "A", "??"}:
            reasons.append(f"unrecognized change status {status} requires the full profile")
    unknown = sorted(paths - FAST_FILES)
    if unknown:
        reasons.append("changes include paths outside the two PolicyRule UI files")
    if missing:
        reasons.append("expected PolicyRule UI file is missing: " + ", ".join(missing))
    if not reasons:
        reasons.append("all changes are limited to the two existing PolicyRule UI files")
        return "fast", reasons
    return "full", reasons


def prerequisites(root: Path, profile: str) -> list[str]:
    missing: list[str] = []
    python = shutil.which("python")
    npm = shutil.which("npm")
    if profile == "full" and not python:
        missing.append("python executable")
    if not npm:
        missing.append("npm executable")
    if not (root / "web/node_modules/.bin/playwright").exists():
        missing.append("web dependencies (run npm ci in web)")
    if not (root / "web/node_modules/.bin/vite").exists():
        missing.append("Vite dependency (run npm ci in web)")
    if npm and (root / "web/node_modules/.bin/playwright").exists():
        listing = subprocess.run(
            ["npx", "--no-install", "playwright", "test", "--list", "--config", "playwright.harness.config.ts"],
            cwd=root / "web",
            text=True,
            capture_output=True,
            check=False,
        )
        total = re.search(r"^Total:\s+(\d+)\s+tests?\b", listing.stdout + listing.stderr, re.MULTILINE)
        if listing.returncode or total is None or int(total.group(1)) == 0:
            missing.append("a non-empty local-demo Playwright suite (listing failed or found no tests)")
    if shutil.which("node") and (root / "web/node_modules/@playwright/test").exists():
        browser_probe = subprocess.run(
            [
                "node",
                "--input-type=module",
                "-e",
                "import { chromium } from '@playwright/test'; "
                "import { existsSync } from 'node:fs'; "
                "if (!existsSync(chromium.executablePath())) process.exit(1)",
            ],
            cwd=root / "web",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        if browser_probe.returncode:
            missing.append("Playwright Chromium browser (install with npx playwright install chromium)")
    if profile == "fast":
        demo_python = os.environ.get("NAPMS_PYTHON") or str(root / ".venv/bin/python")
        if not Path(demo_python).is_file():
            missing.append("local-demo Python environment (.venv or NAPMS_PYTHON)")
        else:
            demo_import = subprocess.run(
                [demo_python, "-c", "import napms"],
                cwd=root,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
            if demo_import.returncode:
                missing.append("installed NAPMS package in the local-demo Python environment")
    else:
        if python:
            probe = subprocess.run(
                [python, "-c", "import pytest, pytest_cov, ruff, pyright"],
                cwd=root,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
            if probe.returncode:
                missing.append("Python test and Ruff dependencies (install the project test/quality extras)")
        if not shutil.which("openspec"):
            missing.append("OpenSpec CLI")
        demo_python = os.environ.get("NAPMS_PYTHON") or str(root / ".venv/bin/python")
        if not Path(demo_python).is_file():
            missing.append("local-demo Python environment (.venv or NAPMS_PYTHON)")
        else:
            demo_import = subprocess.run(
                [demo_python, "-c", "import napms"],
                cwd=root,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
            if demo_import.returncode:
                missing.append("installed NAPMS package in the local-demo Python environment")
    return missing


def display(check: Check) -> str:
    command = shlex.join(check.argv)
    if check.cwd == "web":
        return f"(cd web && {command})"
    return command


def run_check(root: Path, check: Check) -> int:
    print(f"\nRUN: {display(check)}", flush=True)
    started = time.monotonic()
    result = subprocess.run(check.argv, cwd=root / check.cwd, check=False)
    elapsed = time.monotonic() - started
    print(f"RESULT: exit={result.returncode} elapsed={elapsed:.2f}s", flush=True)
    return result.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="print the selected profile and commands without running checks")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent

    try:
        head = os.fsdecode(git(root, "rev-parse", "HEAD")).strip()
    except (subprocess.CalledProcessError, OSError) as error:
        print(f"HEAD: unavailable ({error}); selecting full profile")
        head = "unavailable"
        base = None
        entries = []
    else:
        try:
            base = os.fsdecode(git(root, "merge-base", "origin/main", "HEAD")).strip()
            entries = changed_entries(root, base)
        except (subprocess.CalledProcessError, OSError, ValueError) as error:
            print(f"Diff selection error: {error}; selecting full profile")
            base = None
            entries = [("?", ("<diff-selection-error>",))]

    missing = [path for path in sorted(FAST_FILES) if not (root / path).is_file()]
    profile, reasons = select_profile(entries, missing)
    checks = FAST_CHECKS if profile == "fast" else FULL_CHECKS
    print(f"BASE: {base or 'unavailable'}")
    print(f"HEAD: {head}")
    print("RELEVANT FILES:")
    if entries:
        for status, paths in entries:
            print(f"  {status}: " + " -> ".join(repr(path) for path in paths))
    else:
        print("  (none)")
    print(f"PROFILE: {profile.upper()}")
    print("REASONS:")
    for reason in reasons:
        print(f"  - {reason}")
    print("COMMANDS:")
    for check in checks:
        print(f"  - {check.label}: {display(check)}")
    if args.dry_run:
        print("DRY RUN: checks were not started")
        return 0

    unavailable = prerequisites(root, profile)
    if unavailable:
        print("\nSTOP: verification environment is not ready; no checks were started.")
        for item in unavailable:
            print(f"  - {item}")
        print("Prepare the environment, inspect the commands above, then rerun scripts/check-fast.py.")
        print("This stop is not a PASS; the complete selected profile remains required.")
        return 2

    completed = 0
    failed: list[str] = []
    advisory_failures: list[str] = []
    for check in checks:
        result = run_check(root, check)
        completed += 1
        if result and check.advisory:
            advisory_failures.append(check.label)
        elif result:
            failed.append(f"{check.label}={result}")
            break
    print(f"\nSUMMARY: {completed}/{len(checks)} commands completed")
    print(f"BLOCKING FAILURES: {failed or 'none'}")
    print(f"ADVISORY FAILURES: {advisory_failures or 'none'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
