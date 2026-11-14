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
