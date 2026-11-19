---
name: execute-task
description: Execute a prepared NAPMS GitHub Issue under the AI task workflow. Use for a Ready issue with an execution contract, from eligibility checks through a pull request and verification evidence.
---

1. Read [.ai/workflow.yaml](../../../.ai/workflow.yaml), the GitHub Issue and its Project item. Validate the saved Issue with `gh issue view <number> --json body --jq .body | python3 scripts/validate-task` (R2). Check contract freshness, executor capability, and unresolved decisions (R4, R5, R7). The optional `.[workflow]` dependencies are required. Use the Issue body from the GitHub connector when CLI access is unavailable.
2. The coordinator runs `python3 scripts/check-task-admission <number>` immediately before assignment. Use authenticated GitHub CLI with read access to the repository and Project #6 (for a classic token, `read:project`). The command checks Open/Ready, native blocker completion, and existing assignees (R1, R3, R6). Stop on `DENY`, a command failure, or missing evidence. An `ALLOW` covers those GitHub checks. Confirm no other executor is working, including work started outside GitHub.
3. One coordinator handles assignments at a time. After all R1–R7 checks pass, record the executor as the issue assignee and set Project Status to Running. Confirm both writes before starting the Worker in a dedicated branch or worktree. If either write fails, reconcile the issue and project state before retrying.
4. Start on a dedicated Git branch; when concurrent work needs isolation, use the **native** worktree facility: Codex `--worktree` if supported by the installed version, or `git worktree add`. Codex-managed worktrees retain their own locations. Do not require a canonical path or run a separate worktree creation/preflight script. Confirm the selected checkout with `git status -sb` and its intended base before changing code. Reuse existing project dependencies when `pyproject.toml` / Web package manifests match: configure ignored-directory symlinks using the editor's native worktree settings, or create ordinary OS symlinks with `ln -s` if needed. No `pip install`/`npm ci` through shared links; use an isolated environment when dependencies differ. To use the primary Python environment, pass `PYTHON=/absolute/path/to/primary/.venv/bin/python` to `make`; Makefile guarantees that Python imports the **active** checkout's `src`.
5. For Codex Worker attempts with the existing Langfuse tracing integration, establish task correlation **in the assigned checkout before starting Codex**, after confirming the branch/worktree in step 4. Generate one UUID `runId` for a new assignment; reuse the recorded `runId` (and `sourceSha`) when resuming the same attempt. Set `ISSUE_NUMBER` to the assigned Issue; optionally set `RUN_ID` and `SOURCE_SHA` from the existing Issue/PR handoff before running:
   ```bash
   python3 - <<'PY'
   import json
   import os
   import subprocess
   import uuid
   from pathlib import Path

   issue = os.environ["ISSUE_NUMBER"]
   path = Path(".codex/langfuse.json")
   config = json.loads(path.read_text()) if path.exists() else {}
   metadata = dict(config.get("metadata") or {})
   run_id = os.environ.get("RUN_ID") or uuid.uuid4().hex
   source_sha = (
       os.environ.get("SOURCE_SHA")
       or (metadata.get("sourceSha") if metadata.get("runId") == run_id else None)
       or subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
   )
   metadata.update(repository="lehater/napms-2", issueId=str(issue), runId=run_id, sourceSha=source_sha)
   config["metadata"] = metadata
   path.parent.mkdir(parents=True, exist_ok=True)
   path.write_text(json.dumps(config, indent=2) + "\n")
   path.chmod(0o600)
   print(f"Langfuse runId={run_id} issueId={issue} sourceSha={source_sha}")
   PY
   ```
   This untracked, worktree-local file preserves the other Langfuse settings; do not put credentials or execution identifiers into Git. `LANGFUSE_CODEX_METADATA` takes precedence over project metadata if set: unset it for this Codex launch or ensure it carries the same identifiers. Keep the metadata until the final Stop Hook export, then remove task-specific identifiers before reusing the checkout for another task. Do not introduce an admission/CI gate: if Langfuse is unavailable, execute normally and report the missing correlation.
6. Implement only the execution contract. Prefer targeted tests and `make check` for local feedback; `make check-full` is for integration/diagnosis, while Ready CI remains authoritative. The Makefile selects the Python interpreter (local by default, explicitly shared if requested) and exports `PYTHONPATH` for the current checkout plus `NAPMS_PYTHON` for Web E2E. Browser E2E needs usable Node dependencies and loopback permissions; check those only when actually running browser tests. A timeout or environmental failure requires diagnosis, not repeated FULL runs. On unresolved architectural decisions, return to Preparing.

7. Open and link the pull request, record verification evidence and the `runId` plus any known session/trace references in the existing Issue/PR handoff, and set Project Status to Review. Record owner acceptance and required integration before closing the Issue as completed and setting Done. After merge, check `git status --porcelain` inside the worktree, preserve any uncommitted/unique data, and only then remove it with `git worktree remove <path>` (no `--force`). Never delete a worktree still used by an agent or server. Record owner acceptance and required integration before closing the Issue as completed and setting Done. After merge, check `git status --porcelain` inside the worktree, preserve any uncommitted/unique data, and only then remove it with `git worktree remove <path>` (no `--force`). Never delete a worktree still used by an agent or server.
