#!/usr/bin/env python3
"""Create and verify manually managed NAPMS issue worktrees (stdlib only)."""

from __future__ import annotations

import argparse
import os
import shutil
import socket
import subprocess
import sys
from pathlib import Path


class WorktreeError(Exception):
    """A worktree is unsafe or its execution environment is incomplete."""


def git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], text=True, capture_output=True, check=False,
    )
    if check and result.returncode:
        raise WorktreeError(f"git {' '.join(args)}: {result.stderr.strip()}")
    return result


def primary_checkout(location: Path) -> Path:
    location = location.resolve()
    raw = git(location, "rev-parse", "--git-common-dir").stdout.strip()
    common = Path(raw)
    if not common.is_absolute():
        common = location / common
    common = common.resolve()
    if common.name != ".git" or not (common / "HEAD").is_file():
        raise WorktreeError("expected a non-bare repository with a primary .git directory")
    return common.parent


def issue_path(primary: Path, issue: int) -> Path:
    if issue <= 0:
        raise WorktreeError("issue number must be positive")
    return primary.parent / ".worktrees" / primary.name / f"issue-{issue}"


def validate_branch(primary: Path, branch: str) -> None:
    if not branch or branch.startswith("-") or git(
        primary, "check-ref-format", "--branch", branch, check=False,
    ).returncode:
        raise WorktreeError(f"invalid branch name: {branch!r}")


def create_worktree(primary: Path, issue: int, branch: str) -> Path:
    validate_branch(primary, branch)
    target = issue_path(primary, issue)
    if target.exists() or target.is_symlink():
        raise WorktreeError(f"destination already exists: {target}; inspect it, do not overwrite")
    if git(
        primary, "rev-parse", "--verify", "--quiet",
        "refs/remotes/origin/main^{commit}", check=False,
    ).returncode:
        raise WorktreeError("origin/main missing; run git fetch origin --prune first")
    target.parent.mkdir(parents=True, exist_ok=True)
    base_sha = git(primary, "rev-parse", "origin/main").stdout.strip()
    git(primary, "worktree", "add", "-b", branch, str(target), base_sha)
    print(f"BASE_SHA: {base_sha}")
    return target


def check_identity(primary: Path, location: Path, issue: int, branch: str, base_sha: str) -> None:
    validate_branch(primary, branch)
    expected = issue_path(primary, issue).resolve()
    location = location.resolve()
    if location != expected:
        raise WorktreeError(f"wrong worktree path: {location}; expected {expected}")
    actual = Path(git(location, "rev-parse", "--show-toplevel").stdout.strip()).resolve()
    if actual != expected:
        raise WorktreeError(f"Git root mismatch: {actual}; expected {expected}")
    checked_out = git(location, "symbolic-ref", "--quiet", "--short", "HEAD", check=False)
    if checked_out.returncode or checked_out.stdout.strip() != branch:
        raise WorktreeError(f"wrong branch: {checked_out.stdout.strip() or '(detached)'}; expected {branch}")
    base = git(location, "merge-base", "origin/main", "HEAD", check=False)
    if base.returncode:
        raise WorktreeError("branch and origin/main have no shared base")
    if base.stdout.strip() != base_sha:
        raise WorktreeError(f"wrong base SHA: {base.stdout.strip()}; expected {base_sha}")
    print(f"PASS git: {location} [{branch}]")


def matching_manifest(primary: Path, location: Path, name: str) -> None:
    """Shared dependencies are safe only for identical manifests."""
    left, right = primary / name, location / name
    if not left.is_file() or not right.is_file() or left.read_bytes() != right.read_bytes():
        raise WorktreeError(f"{name} differs from primary; use an isolated environment")


def check_shared_link(primary: Path, location: Path, name: str, manifests: tuple[str, ...]) -> None:
    link = location / name
    if not link.is_symlink():
        return  # An explicit, locally installed environment is also supported.
    if link.resolve() != (primary / name).resolve():
        raise WorktreeError(f"{name} links outside the primary environment")
    for manifest in manifests:
        matching_manifest(primary, location, manifest)


def link_shared_env(primary: Path, location: Path, scope: str) -> None:
    """Link existing shared dependencies; never install, replace or delete them."""
    if location.resolve() == primary.resolve():
        raise WorktreeError("link-env requires a separate worktree, not the primary checkout")
    links = []
    if scope != "git":
        links.append((".venv", ("pyproject.toml",), (".venv/bin/python",)))
    if scope in ("web", "mixed"):
        links.append(("web/node_modules", ("web/package.json", "web/package-lock.json"),
                      ("web/node_modules/.bin/vite", "web/node_modules/.bin/playwright")))
    # Validate every input before mutating any destination.
    for name, manifests, executables in links:
        dest = location / name
        if dest.exists() or dest.is_symlink():
            raise WorktreeError(f"{name} already exists in worktree; inspect it, do not overwrite")
        for manifest in manifests:
            matching_manifest(primary, location, manifest)
        for executable in executables:
            if not (primary / executable).is_file():
                raise WorktreeError(f"primary dependency missing: {executable}; set up primary first")
    for name, _, _ in links:
        target, link = (primary / name).resolve(), location / name
        link.parent.mkdir(parents=True, exist_ok=True)
        link.symlink_to(target, target_is_directory=True)
        print(f"LINKED: {link} -> {target}")


def check_python(location: Path, primary: Path | None = None) -> None:
    if primary is not None:
        check_shared_link(primary, location, ".venv", ("pyproject.toml",))
    interpreter = location / ".venv" / "bin" / "python"
    if not interpreter.is_file():
        raise WorktreeError(
            "missing .venv; link shared dependencies with task_worktree.py link-env "
            "or create an isolated environment when dependencies differ"
        )
    result = subprocess.run(
        [str(interpreter), "-c", "import napms; print(napms.__file__)"],
        cwd=location, env={**os.environ, "PYTHONPATH": str(location / "src")},
        text=True, capture_output=True, check=False,
    )
    if result.returncode:
        raise WorktreeError(f"Python cannot import napms: {result.stderr.strip()}")
    origin = Path(result.stdout.strip()).resolve()
    source = (location / "src" / "napms").resolve()
    if not origin.is_relative_to(source):
        raise WorktreeError(f"Python imports napms from {origin}, expected under {source}")
    print(f"PASS Python: {origin}")


def check_web(location: Path, primary: Path | None = None) -> None:
    if primary is not None:
        check_shared_link(primary, location, "web/node_modules",
                          ("web/package.json", "web/package-lock.json"))
    for command in ("node", "npm"):
        if not shutil.which(command):
            raise WorktreeError(f"missing {command} executable")
    for filename in ("vite", "playwright"):
        if not (location / "web" / "node_modules" / ".bin" / filename).exists():
            raise WorktreeError(f"missing web dependency {filename}; run cd web && npm ci")
    print("PASS web dependencies")


def check_loopback() -> None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
            server.bind(("127.0.0.1", 0))
            server.listen(1)
    except OSError as exc:
        raise WorktreeError(
            f"loopback bind/listen unavailable ({exc}); run E2E in an approved environment "
            "with server-start permission, not by silently retrying"
        ) from exc
    print("PASS loopback bind/listen")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="action", required=True)
    for name in ("create", "link-env", "preflight"):
        command = subparsers.add_parser(name)
        command.add_argument("--issue", type=int, required=True)
        command.add_argument("--branch", required=True)
        if name != "create":
            command.add_argument("--path", type=Path, default=Path.cwd())
            command.add_argument("--base-sha", required=True, help="full commit SHA captured when creating the worktree")
            command.add_argument("--scope", choices=("git", "python", "web", "mixed"), default="mixed")
    args = parser.parse_args()
    try:
        location = args.path if args.action != "create" else Path.cwd()
        primary = primary_checkout(location)
        if args.action == "create":
            target = create_worktree(primary, args.issue, args.branch)
            print(f"CREATED: {target} [{args.branch}]")
            print("Use link-env for shared dependencies (default), or isolated setup when needed.")
        else:
            check_identity(primary, location, args.issue, args.branch, args.base_sha)
            if args.action == "link-env":
                link_shared_env(primary, location, args.scope)
                print("SHARED ENV LINKS READY")
            else:
                if args.scope != "git":
                    check_python(location, primary)
                if args.scope in ("web", "mixed"):
                    check_web(location, primary)
                    check_loopback()
                print("PREFLIGHT PASS")
    except (WorktreeError, OSError) as exc:
        print(f"PREFLIGHT DENY: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
