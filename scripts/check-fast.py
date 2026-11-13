#!/usr/bin/env python3
"""Run fast checks for changed areas locally; reserve full regression for integration."""

from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Check:
    label: str
    argv: tuple[str, ...]
    cwd: str = "."
    advisory: bool = False


@dataclass(frozen=True)
class Change:
    status: str
    paths: tuple[str, ...]


PY_FAST = (
    Check("Python syntax and names (Ruff core)", ("python", "-m", "ruff", "check", "--select", "E4,E7,E9,F", "src", "tests")),
)
WEB_FAST = (
    Check("TypeScript and production build", ("npm", "--prefix", "web", "run", "build")),
    Check("Web semantic boundary", ("npm", "--prefix", "web", "run", "test:semantic")),
)
FULL = (
    Check("Backend regression and coverage", ("python", "-m", "pytest", "-q", "--cov=napms", "--cov-report=term-missing")),
    *PY_FAST,
    Check("Ruff extended (advisory)", ("python", "-m", "ruff", "check", "src", "tests"), advisory=True),
    Check("Ruff formatting (advisory)", ("python", "-m", "ruff", "format", "--check", "src", "tests"), advisory=True),
    Check("Pyright (advisory)", ("python", "-m", "pyright"), advisory=True),
    *WEB_FAST,
    Check("Web proxy and Playwright E2E", ("npm", "--prefix", "web", "run", "test:e2e")),
    Check("OpenSpec strict", ("openspec", "validate", "--all", "--strict")),
)


def git(root: Path, *args: str) -> bytes:
    return subprocess.check_output(("git", *args), cwd=root, stderr=subprocess.PIPE)


def parse_diff(raw: bytes) -> list[Change]:
    if not raw:
        return []
    if not raw.endswith(b"\0"):
        raise ValueError("git diff result was not NUL terminated")
    fields = raw.split(b"\0")[:-1]
    result: list[Change] = []
    pos = 0
    while pos < len(fields):
        status = os.fsdecode(fields[pos])
        pos += 1
        count = 2 if status.startswith(("R", "C")) else 1
        if pos + count > len(fields):
            raise ValueError("incomplete git diff status/path record")
        result.append(Change(status, tuple(os.fsdecode(p) for p in fields[pos:pos + count])))
        pos += count
    return result


def changed_entries(root: Path, base: str) -> list[Change]:
    entries = parse_diff(git(root, "diff", "--cached", "--name-status", "-z", "--find-renames", base, "--"))
    entries += parse_diff(git(root, "diff", "--name-status", "-z", "--find-renames", "--"))
    untracked = git(root, "ls-files", "--others", "--exclude-standard", "-z")
    if untracked and not untracked.endswith(b"\0"):
        raise ValueError("untracked entries are not NUL terminated")
    entries += [Change("??", (os.fsdecode(p),)) for p in untracked.split(b"\0")[:-1]]
    return entries


def choose(entries: list[Change]) -> tuple[str, str]:
    if not entries:
        return "full", "empty diff"
    if any(c.status not in {"M", "A", "??"} or len(c.paths) != 1 for c in entries):
        return "full", "rename/delete/unknown change status"
    paths = {p for c in entries for p in c.paths}
    if any(p.startswith((".github/", "web/e2e/", "web/e2e-harness/", "web/dev/")) or p.startswith("web/playwright") or p in {"pyproject.toml", "web/package.json", "web/package-lock.json"} for p in paths):
        return "full", "CI or dependency configuration"
    if any(not (p.startswith(("web/", "src/", "tests/", "docs/", "openspec/")) or p in {"README.md", "AGENTS.md"}) for p in paths):
        return "full", "unknown change scope"
    py = any(p.startswith(("src/", "tests/")) for p in paths)
    web = any(p.startswith("web/") for p in paths)
    spec = any(p.startswith("openspec/") for p in paths)
    if py and web:
        return "mixed", "Python and Web"
    if py:
        return "python", "Python"
    if web:
        return "web", "Web"
    return ("docs-spec" if spec else "docs"), "documentation"


def checks_for(root: Path, profile: str, entries: list[Change], base: str | None) -> tuple[Check, ...]:
    if profile == "full":
        return FULL
    checks: list[Check] = []
    if profile in {"python", "mixed"}:
        checks.extend(PY_FAST)
        targeted_tests = sorted({
            p for change in entries for p in change.paths
            if p.startswith("tests/") and p.endswith(".py") and (root / p).is_file()
        })
        if targeted_tests:
            checks.append(Check("Changed Python tests", ("python", "-m", "pytest", "-q", *targeted_tests)))
    if profile in {"web", "mixed"}:
        checks.extend(WEB_FAST)
    if profile in {"docs", "docs-spec"}:
        checks.append(Check("Changed documentation whitespace", ("git", "diff", "--check", base or "HEAD")))
    if profile == "docs-spec":
        checks.append(Check("OpenSpec strict", ("openspec", "validate", "--all", "--strict")))
    return tuple(checks)


def prerequisites(root: Path, checks: tuple[Check, ...]) -> list[str]:
    missing = []
    commands = {c.argv[0] for c in checks}
    for command in sorted(commands):
        if shutil.which(command) is None:
            missing.append(f"{command} executable")
    if "python" in commands:
        imports = sorted({
            module for check in checks for module in ("ruff", "pytest", "pytest_cov", "pyright")
            if (module == "ruff" and "ruff" in check.argv)
            or (module == "pytest" and "pytest" in check.argv)
            or (module == "pytest_cov" and "--cov=napms" in check.argv)
            or (module == "pyright" and "pyright" in check.argv)
        })
        if imports:
            test = subprocess.run(["python", "-c", "import " + ",".join(imports)], cwd=root, capture_output=True)
            if test.returncode:
                missing.append("Python tools: " + ", ".join(imports))
    if any(c.argv[:2] == ("npm", "--prefix") for c in checks):
        if not (root / "web/node_modules/.bin/vite").exists():
            missing.append("web dependencies (cd web && npm ci)")
    if any("test:e2e" in c.argv for c in checks):
        if not (root / "web/node_modules/.bin/playwright").exists():
            missing.append("Playwright dependency (cd web && npm ci)")
        demo_python = os.environ.get("NAPMS_PYTHON") or str(root / ".venv/bin/python")
        if not Path(demo_python).is_file():
            missing.append("local-demo Python (.venv or NAPMS_PYTHON)")
    return missing


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="print profile and commands without running them")
    parser.add_argument("--full", action="store_true", help="force all regression checks")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    try:
        head = git(root, "rev-parse", "HEAD").decode().strip()
        base = git(root, "merge-base", "origin/main", "HEAD").decode().strip()
        entries = changed_entries(root, base)
        profile, reason = choose(entries)
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        head, base, entries = "unknown", None, []
        profile, reason = "full", f"failed to classify diff: {exc}"
    if args.full:
        profile, reason = "full", "explicit --full"
    checks = checks_for(root, profile, entries, base)
    print(f"BASE={base or 'unavailable'} HEAD={head} PROFILE={profile.upper()} REASON={reason}")
    for change in entries:
        print("CHANGE", change.status, *change.paths)
    for check in checks:
        print("CHECK", ("(cd web && " + shlex.join(check.argv) + ")") if check.cwd == "web" else shlex.join(check.argv))
    if args.dry_run:
        return 0
    missing = prerequisites(root, checks)
    if missing:
        print("STOP: environment not ready:", *missing, sep="\n  ")
        return 2
    failures = []
    for check in checks:
        print("RUN:", check.label, flush=True)
        start = time.monotonic()
        result = subprocess.run(check.argv, cwd=root / check.cwd, check=False)
        print(f"RESULT: {result.returncode} ({time.monotonic()-start:.1f}s)", flush=True)
        if result.returncode:
            if check.advisory:
                print("ADVISORY failure:", check.label)
            else:
                failures.append(check.label)
                break
    print("BLOCKING FAILURES:", failures or "none")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
