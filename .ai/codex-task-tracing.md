# Task-scoped Codex / Langfuse tracing

**Responsibility:** the Coordinator or human launching a Codex session prepares its task identity, regardless of whether the task uses `decompose`, `execute-task`, or another approved workflow. This is an **optional observability step**, not a new admission gate, runtime, hook, or wrapper.

The existing `tracing@codex-observability-plugin` Stop Hook reads `<cwd>/.codex/langfuse.json` when exporting each turn. To cover the **first** turn reliably, prepare the config in the target checkout/worktree **before** starting Codex. The trace experiment verified that project-local `metadata` propagates; no changes to the global Langfuse config are needed.

The Coordinator chooses the session boundary under [.ai/workflow.yaml](workflow.yaml). This procedure handles optional **attempt/runId correlation** only: a runId is not a session ID, resuming the same attempt reuses its runId, and a new attempt gets a new one. Do not use tracing setup as a reason to require an extra user-facing stage.

## Prepare task-scoped tracing

Prefer to prepare before launching Codex so the first trace carries the ID. If the Issue is selected **inside a running Codex session**, the Coordinator can run this same setup immediately in its checkout before the next Stop Hook, then continue; already-exported traces may remain untagged. This can tag subsequent turns only if the running Codex process has no conflicting `LANGFUSE_CODEX_METADATA` override. A running process cannot have its inherited environment changed from inside the session; if that override conflicts or its value is unknown, relaunch Codex with the override removed or corrected.

1. Choose the canonical **primary GitHub Issue** and target Git checkout/worktree. A session covering several independent Issues cannot yield reliable per-Issue costs; use distinct runs when task-level attribution matters.
2. From the checkout root, run the following **once per new attempt** (replace `131` with the actual Issue number). The empty `RUN_ID=` and `SOURCE_SHA=` values deliberately override any stale exports from an earlier experiment. To **resume the same attempt**, replace them with values from the existing Issue/PR handoff: `RUN_ID=<saved-uuid> SOURCE_SHA=<initial-commit-sha> ISSUE_NUMBER=131 python3 ...`. Never generate a second ID for the same attempt.

```bash
RUN_ID= SOURCE_SHA= ISSUE_NUMBER=131 python3 - <<'PY'
import json
import os
import subprocess
import uuid
from pathlib import Path

issue = os.environ["ISSUE_NUMBER"]
if not issue.isdecimal():
    raise SystemExit("ISSUE_NUMBER must be numeric")
root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()).resolve()
if Path.cwd().resolve() != root:
    raise SystemExit("Run from the target repository/worktree root")
codex_dir = root / ".codex"
if codex_dir.is_symlink():
    raise SystemExit("Use a local .codex directory, not a symlink to another workspace")
path = codex_dir / "langfuse.json"
if path.is_symlink():
    raise SystemExit("Use a local config, not a symlink to another workspace")
config = json.loads(path.read_text()) if path.exists() else {}
metadata = dict(config.get("metadata") or {})
old_run_id = metadata.get("runId")
run_id = uuid.UUID(os.environ["RUN_ID"]).hex if os.environ.get("RUN_ID") else uuid.uuid4().hex
if old_run_id == run_id and metadata.get("issueId") not in (None, issue):
    raise SystemExit("Existing runId belongs to another Issue")
source_sha = (
    os.environ.get("SOURCE_SHA")
    or (metadata.get("sourceSha") if old_run_id == run_id else None)
    or subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
)
metadata.update(repository="lehater/napms-2", issueId=issue, runId=run_id, sourceSha=source_sha)
config["metadata"] = metadata
os.umask(0o077)
codex_dir.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(config, indent=2) + "\n")
path.chmod(0o600)
print(f"issueId={issue} runId={run_id} sourceSha={source_sha}")
PY
```

3. Record the printed `runId` and initial `sourceSha` in the **existing GitHub Issue/PR handoff**, not in a second run database. The assigned checkout's `.codex/langfuse.json` is gitignored; leave it in place until the final Stop Hook export.
4. Start Codex **from that checkout**. The plugin treats `LANGFUSE_CODEX_METADATA` as an environment override of project metadata. Unless an explicit matching override is intended, run `env -u LANGFUSE_CODEX_METADATA codex`.
5. At handoff, add known `sessionId`/`traceId` values if available. Verify `issueId` and `runId` through Langfuse observations before declaring end-to-end attribution; GitHub/CI/Review remain the authority for task outcome.

**Existing Codex session:** because configuration is loaded at each Stop Hook, a task-local config written before a later export may tag that and subsequent turns only when the process environment does not override it. Previously exported traces are not guaranteed to receive metadata retroactively. Do not claim complete-run attribution if the first turns were untagged; if the override conflicts or is unknown, relaunch with a corrected environment or disclose missing correlation.

**New attempt / reused checkout:** the next run generates a fresh UUID and updates the same local task metadata. Remove task-specific metadata before using that checkout for unrelated interactive Codex work; prefer separate native Git worktrees for concurrent tasks. Keep local keys/credentials out of Git and handoff notes.

**Unavailable integration:** continue the approved task normally and report missing correlation. Do not add a mandatory setup gate or pretend a `runId` was captured.
