# PR #70 — role catalog verification, 2026-11-14

Scope: permanent OpenCode mode-A roles, documentation, structural tests and an opt-in reproducible smoke fixture. Accepted main baseline: `ab62ca13bb15a9f5dd26f2dca5dbef54d92bb8d0`; initial PR head: `2f106e2e6d527c8d8a6b2c7511593ebf813235aa`. Separate PR worktree; main, PR #68, product code, Codex Harness and OpenSpec artifacts were not edited. No merge. Architecture source: [PR #68 decision record](https://github.com/lehater/napms-2/blob/9dd4a1a4d3ec033aebc752c43af8a16d03bf3b9d/docs/research/local-multiagent-sdlc/decision-2026-11-14.md); pilot source: [merged PR #69](https://github.com/lehater/napms-2/pull/69).

## Verified environment and defects

- Installed OpenCode `v2.2.0`; clean HOME/XDG, no persistent auth store. Local Ollama lists `qwen3-coder:30b`. No cloud model or paid API was needed.
- Initial five unittest passed; real `debug agents` loaded the catalog. This did **not** prove runtime availability: a clean-HOME model request failed `provider.no-route: Model unavailable: ollama/qwen3-coder:30b`. **P1 fixed:** explicit local provider declaration. Regression test now checks provider/model registration.
- A first route completed Worker edit and actual Validator tests, but Validator reported hypothetical exit 0 for denied `true`. **P1 fixed:** denied/unavailable calls must have `exit_code=null`, never a hypothetical code. Repeat session `ses_e273e3b57ffepaMTRGTFLLJe4l` reported `DENIED | null`, matching `permission.rejected`; both real checks have tool metadata exit 0.
- Reviewer initially substituted an execute attempt and prose for the three requested probes. **P1 evidence gap fixed:** clarify the harmless denial-test exception in the role instruction and require exact tool names. Orchestrator/Reviewer now deny workflow Skill loading; Explorer retains OpenSpec Skills. Separate repeat confirmed actual `edit`, `shell`, `execute` tool-unavailable errors, then independent artifact read. No permission was broadened in the permanent catalog.
- Independent project Reviewer found **P2 fixed:** structural tests did not prevent a future Orchestrator shell allowance. Added exact Orchestrator grant-set and non-Validator shell assertions. Seven structural tests now pass.

## Runtime and OS evidence before final commit

First corrected route root: `ses_e2742b54dffeh6q3pnDHmopU7j`, five distinct children, each actual model `ollama/qwen3-coder:30b`. Explorer read `AGENTS.md` and loaded `openspec-explore`; Worker changed only `role-smoke.txt`; Validator executed the three-case unittest fixture and profile dry-run, each exit 0; unapproved `true` returned `permission.rejected`. The later route root `ses_e273ebdd9ffeeUT7jjoglWgO16` repeated those stages with corrected Validator reporting. These runs exposed the Reviewer probe gap; their narrative PASS was **not accepted as proof** of all criteria.

Permanent Worker probe `ses_e273fa967ffeB520ofJZfLX6MR`: real edit call rejected because the noninteractive run cannot ask for approval; no write. Corrected Reviewer probe uses unchanged deny permissions and actual errors for all three tools. Final sessions on the committed HEAD are recorded in PR #70, together with CI, to avoid invalidating a verified SHA by another evidence-only commit.

bwrap probes confirmed hidden host `/home` and `/tmp`; a real attempted write to `AGENTS.md` failed `EROFS` (errno 30). The fixture mounts the repository read-only, masks Git metadata, binds only `role-smoke.txt` writable during route, uses a clean environment and private HOME/XDG/runtime directories, and drops capabilities with separate user/PID/IPC/UTS namespaces. It does **not** unshare the network: localhost Ollama is required. This is a bounded smoke sandbox, not a production security claim. The repo includes no credentials, raw auth data or private host logs.

## Sequential-route regression

A subsequent route `ses_e273a09f8ffeVYkxIWEHne7VF0` incorrectly batched Explorer/Planner and Worker/Validator/Reviewer. Validator read `PLACEHOLDER` before Worker wrote; actual test exit was 1, while root narrated success. This run was rejected. **P1 fixed:** Orchestrator explicitly permits one dependent subagent call per response, waits for completion, and stops BLOCKED on a failed check. Planner cannot load implementation/archive Skills or claim completed implementation.

Repeat root `ses_e273828a6ffeu0GY179ugU9Kvs` completed all five stages sequentially; observed child IDs are `ses_e27381d35ffeztaGiSr3Hpi7He`, `ses_e2737e272ffetdovEJyTOqhN4x`, `ses_e27378e6cffegK5JJWkHHhGWk6`, `ses_e27377742ffe2qj3UARWveAgPD`, `ses_e273751ebffezBnTyByw076V0H`. The offline fixture verifier passed: no stage overlaps, Explorer reads/Skill load, Worker edit, both Validator exits 0 and denied `true`, Reviewer read and all three real tool errors. The same verifier rejected the earlier raced route with `Dependent stages overlapped` (exit 1). This is an acceptance check over recorded events, not a runtime Controller or a production gate.

Independent follow-up review found one **P2 fixed** in the offline verifier: unrelated tool errors could count as denials. It now requires the exact unavailable-tool error and intended harmless edit/shell/execute inputs, plus the exact artifact read path. The previously successful sequential route still passes this stricter verifier. Reviewer rechecked the fix and reported no new P0/P1 findings.

## Local checks

`python3 scripts/check-fast.py --dry-run` selected FULL because root `opencode.jsonc` is unknown scope. The first execution lacked the `python` command; rerun used the existing project virtualenv and Web dependencies in the disposable worktree. The selected FULL finished with **no blocking failures**:

- Backend: 247 passed, four subtests, coverage collected (before two additional structural regression tests).
- Ruff core passed; Web build and semantic check passed; browser suites 40 + 18 passed.
- OpenSpec strict: 16 passed, 0 failed. OpenSpec task status **N/A**, no OpenSpec change created or modified.
- Advisory findings were retained: Ruff extended 71 findings, formatting 22 files, Pyright 34 errors. These are not reported as blocking failures or silently fixed in product code.

Focused final tests, exact final head, Verify FULL run/jobs and remaining advisory outcomes are recorded in the PR after commit. Reproduction commands and event locations: [runbook](opencode-harness.md#воспроизводимый-pr-70-smoke-linuxwsl).

## Limits and acceptance

Actual tool events, not an LLM's final PASS or CLI exit alone, establish denials and test results. Qwen sometimes attempts unavailable tools or redundant Skills; the permission engine rejected the observed forbidden calls. This smoke does not establish general task fidelity, model superiority, provider privacy outside the local sandbox, or production readiness. The temporary smoke config adds only one file edit allowance and one exact test-command allowance; permanent Worker remains `edit: ask`, shell/execute denied.

ADR-001 staged OpenCode adoption and ADR-002 one active root session are respected. No mode-B Controller, new dependency, permanent daemon, automatic publisher or GitHub merge was added. Owner acceptance remains pending; PR #70 stays Draft. The final acceptance verdict is in PR #70 after checks on its final HEAD.


## Literal-content handoff regression

Final-head repeats on `a84af04` remained fail-closed but exposed model handoff limits: one Validator rewrote the exact allowlisted fixture path (check NOT RUN); another Worker copied surrounding plan instructions into the artifact (actual fixture exit 1). Neither run was accepted. The task handoff now separates literal `expected_lines` and `expected_final_newline` JSON fields from instructions, with corresponding reusable Orchestrator/Worker guidance. The fixture still checks exact bytes, including the final newline; no acceptance or permanent write permission was relaxed. Final-head rerun results are recorded in the PR.

## Sol diagnostic after review comment 6873431227

Verdict remains **BLOCKED**; this is an auth/isolation prerequisite blocker, not evidence that Sol cannot orchestrate. Source request: [independent review](https://github.com/lehater/napms-2/pull/70#issuecomment-6873431227). Tested runtime/config tree: `0647ef172266251b24d275645bb991f463e74380`; permanent configuration and fixture acceptance were not changed. [Selected actual events and usage counters](opencode-sol-diagnostic-2026-11-14.json) contain no auth-store contents or credentials.

The first host invocation returned `UnexpectedStatus: 503` before creating a session. One diagnostic retry bypassed the inherited proxy **only for localhost** (`NO_PROXY=127.0.0.1,localhost`, and lowercase equivalent), retaining the external provider environment. That invocation created and completed a real Sol session. The successful retry establishes a localhost-bootstrap workaround; it does not establish the original 503's upstream cause or general cloud reliability.

Read-only root `ses_e272629f7ffeaoqaipX9Comz2M` used actual `openai/gpt-6.1-sol`; it created exactly two distinct children in order:

| Role | Child session | Actual model | Observed result |
| --- | --- | --- | --- |
| explore | `ses_e2725f223ffecnbb5uvg33sPmN` | `openai/gpt-6.1-sol` | Read AGENTS.md, loaded openspec-explore, returned observed facts; access to external Git metadata was rejected. |
| planner | `ses_e27248568ffekcLjPeMxO8shwG` | `openai/gpt-6.1-sol` | Received the Explorer's concrete facts and returned the bounded read-only plan with allowed_paths=[], OpenSpec N/A. |

An offline check of `session_v2`/`session_message` confirmed parent linkage, exact two-call order, non-overlapping tool-call timestamps, actual model IDs, completed Explorer read/Skill load, and no successful edit/write/patch/shell/execute tools. Runtime state/log writes by OpenCode itself are separate from repository changes. Root elapsed time (creation to idle): **134.611 seconds**, including children. The run used the existing host account and deny-first role permissions; it was **not an OS-isolated write test**. No credentials were exported or copied into bwrap.

Reported counters (OpenCode session counters; not inferred billing):

| Session | Input | Output | Reasoning | Cache read | Recorded cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| Orchestrator | 6866 | 1213 | 0 | 3968 | 0 |
| Explorer | 22928 | 1243 | 42 | 30592 | 0 |
| Planner | 2719 | 458 | 0 | 0 | 0 |

Recorded cost 0 does **not** establish free execution, subscription usage, monetary cost or provider billing. Those values are unavailable. No efficiency comparison is claimed.

### Isolated provider prerequisite

Before any mixed write route, the same clean bwrap read-mode fixture was invoked with **only the CLI model overridden to Sol**. The unchanged sandbox masks host HOME/tmp/Git, uses private HOME/XDG state, and receives no auth store, account DB or tokens. Actual result: session `ses_e2721dd52ffeUEUd1kPYiLS5Vc`, `provider.no-route`, `Model unavailable: openai/gpt-6.1-sol`, CLI exit **1**. No successful model response or child delegation occurred there. This error proves that no usable Sol route was resolved in that unchanged isolated configuration; it does not by itself distinguish missing user provider configuration, account registration and authentication. No authenticated provider boundary for this sandbox has been demonstrated.

The authenticated host run therefore does not demonstrate an authenticated provider inside the Worker sandbox. Connecting a sandbox client to the authenticated host OpenCode server does not establish that server-side tool execution is inside the verified bwrap boundary; that is not accepted as an equivalent test. Copying/mounting the auth store into the shared runtime would violate the requested credential boundary. Neither workaround was used.

**Full Sol Orchestrator / Qwen Worker route: NOT RUN. Two independent successful mixed runs: NOT RUN.** Their isolation/provider prerequisite failed. No random retries, LF normalization, permission changes, acceptance relaxation, default model change or controller implementation was used. Previous FULL remains valid only for its recorded SHA; a new final documentation HEAD gets its own required checks.

### Minimal alternative for architectural evaluation — not implemented

Two separate concerns need decisions: provider authentication outside the Worker environment, and enforcement of stage order. The successful host read-only route reduces uncertainty about Sol's tool delegation; it does not solve authentication in the current isolated runtime.

If retaining local Qwen while removing LLM control of the fixture's sequence, the smallest candidate is an **ephemeral mode-A stage runner** with the fixed in-memory order `explore → planner → worker → validator → reviewer`. It would pass a literal immutable task contract, use fresh child contexts under one logical root, dispatch one stage at a time through a verified OpenCode session/tool interface, and advance only after observed completion. Validator failure, missing evidence, failed exact-byte acceptance or reviewer failure would stop the run; no automatic retries or FAIL-to-PASS reinterpretation. For real tasks, the authorized stage list comes from the task contract; five stages are specific to this fixture.

This candidate needs no persistence, daemon, scheduler, DAG recovery, restart journal or mode-B Controller. Tradeoff: stage progression leaves the LLM, but a small API adapter and its compatibility tests would become maintained code. The installed API's ability to preserve the required root/child relationship while dispatching without LLM choice is **not yet verified**; no unsupported endpoint is assumed. A credential-owning provider outside Worker would require its own assessed request boundary (model inference only, no filesystem/tool authority or credential transfer); a stage queue alone does not solve cloud auth.

Before implementing either boundary: short ADR delta/owner review must select the interface and auth responsibility, preserve the existing OS/tool/byte acceptance, define failure semantics and approve the bounded validation. This is a proposal for review, not an adopted architecture or an excuse to weaken the present gate. PR #68 and OpenSpec artifacts remain untouched.

### Reproduction of the bounded diagnostic

On the PR70 worktree, use the existing host account without auth export:

```sh
NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost \
  opencode --standalone run --agent orchestrator --model openai/gpt-6.1-sol --format json \
  'Read-only PR70-SOL-READ: call subagent explore to read AGENTS.md and load openspec-explore; wait for completion, copy its actual facts into one fresh planner prompt with allowed_paths=[], OpenSpec N/A, acceptance=read-only plan. Exactly these two child calls, one per response. No edit/shell/execute/push/merge. Stop after both.'
```

For the credential-free bwrap prerequisite, the executed temporary launcher reused the checked-in fixture unchanged except its CLI model argument:

```python
from pathlib import Path
import sys
path = Path('/tmp/napms-pr70/docs/engineering/opencode-smoke/run.py')
source = path.read_text()
old = '        "ollama/qwen3-coder:30b",'
assert source.count(old) == 1
source = source.replace(old, '        "openai/gpt-6.1-sol",')
sys.argv = [str(path), 'read']
exec(compile(source, str(path), 'exec'), {'__file__': str(path), '__name__': '__main__'})
```

Inspect saved events, not CLI success or a model catalog. Raw host logs/account DB stay private; the selected event report records only this diagnostic's sessions, tool names, safe path/role/Skill arguments, errors, timing and usage counters.
