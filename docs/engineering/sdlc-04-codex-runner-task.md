# SDLC-04B — отдельное задание для локального Codex CLI / WSL2

**Execution state: NOT AUTHORIZED / NOT RUN.** Execute only after the owner authorizes **one explicit available model** and **max 6 Codex runs × 900 s each**. Read the [frozen protocol](sdlc-04-experiment-protocol.md) and [SDLC-04A](https://github.com/lehater/napms-2/blob/research/sdlc-04-problem-selection/docs/engineering/sdlc-04-problem-selection.md) first. Do not use this Codex session to rewrite the protocol, choose a new task, relax a condition, perform DeepEval, or change GitHub.

## Responsibility

Operator (outside evaluated agent): verify the environment; create six seed-only Git workspaces; inject treatment into B **before** launch; execute fresh and serial `codex exec` runs; then, **outside the agent**, run frozen strict oracle, capture diff/evidence, and apply the independent M1/M2/M3 reviews. The evaluated agent's only input is the unchanged task file plus the instruction chain naturally loaded from its workspace; it may edit only planning artifacts.

If any required option, environment or model pin is unavailable, **BLOCKED**. Do not substitute a new protocol.

## 1. Pre-approval parameters and environment checks

In WSL2, after owner approval, set exactly one supported model: `export MODEL='OWNER_APPROVED_MODEL_ID'`. Replace the placeholder **before** invoking any agent; record it in the manifest. Nothing else is to be tuned between trials.

Commands below are an operator runbook, **not a repo script**. They prepare shell variables that remain in the same session.

```bash
set -euo pipefail
: "${MODEL:?set approved explicit Codex model ID first}"
test "$MODEL" != OWNER_APPROVED_MODEL_ID
SEED=adbb2cfb6a525fd8a7c15155cb57b76a80288bbf
FIX=270da74c68617a32bd725ffb4f508c4c5ce9da33
REPO=https://github.com/lehater/napms-2.git
CODEX_BIN="$(command -v codex)"
OPENSPEC_BIN="$(command -v openspec)"
GIT_BIN="$(command -v git)"
"$CODEX_BIN" --version
"$OPENSPEC_BIN" --version
"$GIT_BIN" --version
"$CODEX_BIN" --version | grep -F '0.164.0'  # documented current workstation baseline
"$OPENSPEC_BIN" --version | grep -F '1.16.0'
"$CODEX_BIN" exec --help > /tmp/sdlc04-codex-exec-help.txt
for flag in --model --json --ephemeral --ignore-user-config --output-last-message --sandbox --cd; do
  grep -F -- "$flag" /tmp/sdlc04-codex-exec-help.txt >/dev/null || { echo "BLOCKED unsupported: $flag"; exit 1; }
done
CH="${CODEX_HOME:-$HOME/.codex}"
for doc in "$CH/AGENTS.md" "$CH/AGENTS.override.md"; do
  test ! -s "$doc" || { echo "BLOCKED global instructions: $doc"; exit 1; }
done
```

The installed CLI help may list global flags separately: if the `--ask-for-approval` or `--config` options are not listed under `exec --help`, verify them in `codex --help` too. **If the exact planned invocation cannot be established without agent calls, BLOCKED.** No extra config files, cached user guidance or credentials in the workspaces. Do not alter global Codex authentication just to satisfy this task.

## 2. Freeze one task and one treatment

```bash
umask 077
LAB="$(mktemp -d "$HOME/sdlc04-ab.XXXXXX")"
mkdir -p "$LAB/runs" "$LAB/evidence"
chmod 700 "$LAB" "$LAB/runs" "$LAB/evidence"

cat > "$LAB/task.txt" <<'TASK'
Проверь и доведи до готовности к review существующий OpenSpec change `first-access-policy-slice`. Согласуй описание `policy-export` с `design.md` и `tasks.md` в части единого snapshot, `evaluationAt`, проверки действительности grants, адресов и Rule state. Сохрани все нормативные гарантии, ограничение на исторический as-of и существующие сценарии. В этой задаче допустимы только изменения planning artifacts внутри `openspec/changes/first-access-policy-slice/`; продукт, CI, конфигурацию и Skills не изменяй. Заверши кратким handoff-резюме для review.
TASK
cat > "$LAB/candidate.txt" <<'RULE'
Before handing off OpenSpec artifacts for review, run `openspec validate --all --strict` in the project root; fix validation findings without dropping requirements or scenarios. If the validator is unavailable, report that validation was not performed and do not claim the change is validated.
RULE

{
  printf 'seed=%s\nmodel=%s\neffort=medium\ntimeout_seconds=900\n' "$SEED" "$MODEL"
  printf 'codex_path=%s\nopenspec_path=%s\n' "$CODEX_BIN" "$OPENSPEC_BIN"
  "$CODEX_BIN" --version
  "$OPENSPEC_BIN" --version
  sha256sum "$LAB/task.txt" "$LAB/candidate.txt"
  printf 'order=p1-a,p1-b,p2-b,p2-a,p3-a,p3-b\n'
} > "$LAB/evidence/manifest.txt"
sha256sum "$LAB/task.txt" "$LAB/candidate.txt" > "$LAB/evidence/frozen-inputs.sha256"
```

No more shell-generated instructions or dynamic edits to these files are permitted. Freeze SHA-256 before fetching workspaces. Never show the agent `FIX`, reference correction, past trial logs or the evaluator checklist.

## 3. Six independent shallow workspaces

```bash
for trial in p1-a p1-b p2-b p2-a p3-a p3-b; do
  d="$LAB/runs/$trial"
  git init -q "$d"
  git -C "$d" remote add origin "$REPO"
  git -C "$d" fetch -q --no-tags --depth=1 origin "$SEED"
  git -C "$d" checkout -q --detach FETCH_HEAD
  test "$(git -C "$d" rev-parse HEAD)" = "$SEED"
  test "$(git -C "$d" rev-parse HEAD:AGENTS.md)" = 15ba1fb8e48d42411a734261acf587b9417e95da
  test "$(git -C "$d" rev-parse HEAD:openspec/changes/first-access-policy-slice/specs/policy-export/spec.md)" = b70195c0b28699dd194fa28a65255a34f667b7e3
  if git -C "$d" cat-file -e "$FIX^{commit}" 2>/dev/null; then
    echo "BLOCKED: later correction accessible in $trial"; exit 1
  fi
  if [[ "$trial" == *-b ]]; then
    printf '\n- %s\n' "$(cat "$LAB/candidate.txt")" >> "$d/AGENTS.md"
  fi
  mkdir -p "$LAB/evidence/$trial"
  sha256sum "$d/AGENTS.md" > "$LAB/evidence/$trial/agents-before.sha256"
  git -C "$d" status --short > "$LAB/evidence/$trial/initial-status.txt"
done
sha256sum "$LAB/task.txt" "$LAB/candidate.txt" >> "$LAB/evidence/manifest.txt"
```

These are six **independent working trees** with separate `.git` stores, not attached `git worktree` entries. This prevents access to the accepted fix through shared history. A/B differ only in the pre-injected root bullet. The six independent Git stores do **not** make the entire OS filesystem unreadable. Standard `workspace-write` limits writes but may permit read access elsewhere. Do not disclose evidence paths to the evaluated agent; monitor tool-command events for cross-run reads and stop as BLOCKED if observed. If a stronger isolation guarantee is required, obtain owner approval for an externally isolated environment instead of silently introducing one.

## 4. Pre-agent fixture check (no Codex call)

```bash
set +e
(cd "$LAB/runs/p1-a" && openspec validate --all --strict)   > "$LAB/evidence/fixture-preflight.log" 2>&1
fixture_rc=$?
set -e
printf 'exit=%s\n' "$fixture_rc" >> "$LAB/evidence/manifest.txt"
test "$fixture_rc" -ne 0 || { echo "BLOCKED: seed unexpectedly validates"; exit 1; }
grep -F 'Coherent single evaluation' "$LAB/evidence/fixture-preflight.log" >/dev/null || {
  echo "BLOCKED: unexpected fixture failure"; exit 1;
}
```

This independent fixture check is **not** M1 and must stay outside every agent transcript.

## 5. Owner-approved six agent runs (execute only after sign-off)

```bash
for trial in p1-a p1-b p2-b p2-a p3-a p3-b; do
  d="$LAB/runs/$trial"
  e="$LAB/evidence/$trial"
  echo "RUN $trial"
  date -u +%FT%TZ > "$e/start-utc.txt"
  sha256sum --check --status "$LAB/evidence/frozen-inputs.sha256" || { echo "BLOCKED: frozen input changed"; break; }
  set +e
  timeout --signal=TERM --kill-after=15s 900s     "$CODEX_BIN" exec -C "$d"     --model "$MODEL"     -c 'model_reasoning_effort="medium"'     -c 'web_search="disabled"'     -c 'sandbox_workspace_write.network_access=false'     --sandbox workspace-write --ask-for-approval never     --ignore-user-config --ephemeral --json     --output-last-message "$e/final.txt"     - < "$LAB/task.txt" > "$e/events.jsonl" 2> "$e/stderr.txt"
  agent_rc=$?
  date -u +%FT%TZ > "$e/end-utc.txt"
  (cd "$d" && openspec validate --all --strict) > "$e/oracle.log" 2>&1
  oracle_rc=$?
  git -C "$d" diff --check > "$e/diff-check.txt" 2>&1
  diff_rc=$?
  set -e
  printf '%s\n' "$agent_rc" > "$e/agent-exit.txt"
  printf '%s\n' "$oracle_rc" > "$e/oracle-exit.txt"
  printf '%s\n' "$diff_rc" > "$e/diff-exit.txt"
  git -C "$d" status --short > "$e/paths.txt"
  git -C "$d" ls-files --others --exclude-standard > "$e/untracked.txt"
  git -C "$d" diff --no-ext-diff > "$e/diff.patch"
  sha256sum "$d/AGENTS.md" > "$e/agents-after.sha256"
  git -C "$d" rev-parse HEAD > "$e/head.txt"
  git -C "$d" hash-object openspec/changes/first-access-policy-slice/specs/policy-export/spec.md > "$e/policy-export-blob.txt"
  echo "$trial agent=$agent_rc strict=$oracle_rc diff=$diff_rc" | tee -a "$LAB/evidence/manifest.txt"
  if [[ "$agent_rc" -eq 124 || "$agent_rc" -eq 137 ]]; then echo "STOP: timeout; mark INCONCLUSIVE"; break; fi
  if ! cmp -s "$e/agents-before.sha256" "$e/agents-after.sha256"; then
    echo "STOP: AGENTS.md mutated by agent; guardrail violation"; break
  fi
  echo "Inspect this trial now: event chronology, exit/status, paths, diff, S1-S8 and secrets."
  if [[ "$trial" != p3-b ]]; then
    read -r -p "Type CONTINUE only if next trial remains authorized and no stop rule applies: " approval
    [[ "$approval" == CONTINUE ]] || { echo "STOP: operator review"; break; }
  fi
done
```

The `--output-last-message` destination is supplied by the operator, not to the agent as a task. The process is non-interactive and the run does not resume. If the command exits nonzero because of a changed model/CLI/auth or sandbox, **stop and classify BLOCKED** rather than silently iterating. Scope violations stop the run sequence and are recorded as candidate regression when attributable. Never edit finished trees before external oracle. Ensure `timeout`, `sha256sum`, `grep` and `git` are available before runs.

## 6. Independent audit after runs

For each trial, apply the protocol's M1/M2/M3 **independently**:

- **M1 (agent preflight):** inspect chronological `events.jsonl` tool-command events, precise command, exit code and handoff ordering. Mark PASS / FAIL / UNKNOWN. Search matches alone or the final claim do not prove execution.
- **M2 (external validator):** exact `oracle-exit.txt` (0 PASS, else FAIL), but timeouts/incomplete runs are **not valid completed observations**. Record `diff-exit.txt` separately.
- **M3 (guardrails):** compare four spec deltas and `design.md`/`tasks.md` against **S1–S8 in the frozen protocol**, with exactly 39 preserved original scenarios; check all tracked and untracked paths and unchanged `AGENTS.md` after start. A changed `AGENTS.md` by agent is a violation, even in group B. Review a group-blinded diff after masking the already-known candidate line.

Summarize the six rows as `trial | group | order | agent rc | M1 | M2 | diff check | S1..S8 | termination | evidence files`. Then apply **unchanged** `BLOCKED > REJECT > SUPPORT > INCONCLUSIVE` decision rules in protocol §5, preserving incomplete/negative rows. No retuning, cleanup of a failed run, optional judges or seventh run.

**Safe output**: keep raw JSON, logs and full diff in `$LAB/evidence` (private permissions); do not upload them to public GitHub. Produce a sanitized evidence summary with relative paths, numeric exits, group counts and reviewed diffs, run a secret scan, inspect manually, and only then present it for owner-controlled GitHub review. Do not create a product/Harness PR automatically; only the owner authorizes a separate patch and eventual merge.

**Stop point:** send the sanitized matrix and classification to the coordinating chat / separate reporting PR. No merge, no close of Issue #10.
