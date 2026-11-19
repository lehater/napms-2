# Task-scoped Codex / Langfuse tracing

**Responsibility:** the Coordinator or human launching a Codex session prepares its task identity, regardless of whether the task uses `decompose`, `execute-task`, or another approved workflow. This is an **optional observability step**, not a new admission gate, runtime, hook, or wrapper.

The existing `tracing@codex-observability-plugin` Stop Hook reads `<cwd>/.codex/langfuse.json` when exporting each turn. To cover the **first** turn reliably, prepare the config in the target checkout/worktree **before** starting Codex. The trace experiment verified that project-local `metadata` propagates; no changes to the global Langfuse config are needed.

## Start a task-scoped session

1. Choose the canonical **primary GitHub Issue** and target Git checkout/worktree. A session covering several independent Issues cannot yield reliable per-Issue costs; use distinct runs when task-level attribution matters.
2. From the checkout root, run the following **once per new attempt** (replace `131` with the actual Issue number). To **resume the same attempt**, provide `RUN_ID` and `SOURCE_SHA` from the existing Issue/PR handoff, for example `RUN_ID=<saved-uuid> SOURCE_SHA=<initial-commit-sha> ISSUE_NUMBER=131 python3 ...`. Never generate a second ID for the same attempt.

```bash
ISSUE_NUMBER=131 python3 - <<'PY'
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
path = root / ".codex/langfuse.json"
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
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(config, indent=2) + "\n")
path.chmod(0o600)
print(f"issueId={issue} runId={run_id} sourceSha={source_sha}")
PY
```

3. Record the printed `runId` and initial `sourceSha` in the **existing GitHub Issue/PR handoff**, not in a second run database. The assigned checkout's `.codex/langfuse.json` is gitignored; leave it in place until the final Stop Hook export.
4. Start Codex **from that checkout**. The plugin treats `LANGFUSE_CODEX_METADATA` as an environment override of project metadata. Unless an explicit matching override is intended, run `env -u LANGFUSE_CODEX_METADATA codex`.
5. At handoff, add known `sessionId`/`traceId` values if available. Verify `issueId` and `runId` through Langfuse observations before declaring end-to-end attribution; GitHub/CI/Review remain the authority for task outcome.

**Existing Codex session:** because configuration is loaded at each Stop Hook, a task-local config written before a later export may tag that and subsequent turns. Previously exported traces are not guaranteed to receive metadata retroactively. Do not claim complete-run attribution if the first turns were untagged.

**New attempt / reused checkout:** the next run generates a fresh UUID and updates the same local task metadata. Remove task-specific metadata before using that checkout for unrelated interactive Codex work; prefer separate native Git worktrees for concurrent tasks. Keep local keys/credentials out of Git and handoff notes.

**Unavailable integration:** continue the approved task normally and report missing correlation. Do not add a mandatory setup gate or pretend a `runId` was captured.
