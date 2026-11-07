# SDLC-04B — frozen OpenSpec Harness A/B execution protocol

**State:** PREPARED / NOT RUN. No Codex A/B trials, DeepEval, cloud judges, local WSL2 checks, or Harness changes were performed in 04B preparation.
**Owner gate:** do not start agent runs until the owner explicitly authorizes the model and the six-run resource ceiling.
**Tracking:** [Issue #10](https://github.com/lehater/napms-2/issues/10), [SDLC-04A Draft PR #16](https://github.com/lehater/napms-2/pull/16) and its [full pre-registered study](https://github.com/lehater/napms-2/blob/research/sdlc-04-problem-selection/docs/engineering/sdlc-04-problem-selection.md).
**Repository base of this documentation:** `main@41606c8824bc1b8cf346fc5f86db516a731da682`. The **experimental input** is the different historical commit specified below. Do not mix them.
**Separate executable assignment:** [sdlc-04-codex-runner-task.md](sdlc-04-codex-runner-task.md). Protocol and runner must be reviewed together before any execution.

## 1. Aim, hypothesis, and sole treatment

Determine whether a single root `AGENTS.md` instruction makes an agent run OpenSpec strict preflight before review handoff and improves independent strict validity **without weakening the domain contract**. This is a six-run local engineering pilot on one historical challenge fixture, not a population-level estimate or a retrospective reconstruction of PR #4.

The **only candidate addition** is the following one bullet, appended to the seed's existing `AGENTS.md` without changing other bytes:

> - Before handing off OpenSpec artifacts for review, run `openspec validate --all --strict` in the project root; fix validation findings without dropping requirements or scenarios. If the validator is unavailable, report that validation was not performed and do not claim the change is validated.

This exact sentence is inherited from PR #16, with a Markdown bullet marker for `AGENTS.md`. It must never be injected through the user task, CLI flags or additional instructions. The baseline retains seed `AGENTS.md` byte for byte. No modifications to the main Harness, Skills, CI, product or OpenSpec configuration are proposed here.

H0: the instruction does not improve review-ready artifacts on the fixed task. H1: it increases strict-valid output prior to handoff while protecting the semantics and allowed scope.

## 2. Immutable inputs and verified repository inventory

| Field | Frozen value |
| --- | --- |
| Seed Git commit (all six runs) | `adbb2cfb6a525fd8a7c15155cb57b76a80288bbf` |
| Original root `AGENTS.md` blob | `15ba1fb8e48d42411a734261acf587b9417e95da` |
| Initially failing `policy-export/spec.md` blob | `b70195c0b28699dd194fa28a65255a34f667b7e3` |
| OpenSpec installation | **1.16.0**, same executable and PATH for all six trials |
| Historical error | requirement `Coherent single evaluation`, over 500 characters; `openspec validate --all --strict` fails at seed |
| Exact command oracle | `openspec validate --all --strict`, from worktree root, after agent has exited |
| Additional check | `git diff --check` plus path and semantic guardrail review |
| Agent setup | identical Codex CLI binary, explicit same available model ID, `model_reasoning_effort="medium"`, `workspace-write`, approval `never`, no web search, sandbox command network disabled, fresh ephemeral session per trial |
| Resource ceiling | **six** runs, each maximum **900 seconds** wall-clock, no retry, no resume, no extra generation; owner must approve this cap before launch |
| Outcome ordering | pair 1 A then B; pair 2 B then A; pair 3 A then B, run serially |
| Baseline/treated changes | A: unchanged root instructions; B: ONLY the candidate bullet above appended once to root instructions |
| Intermediate visibility | no prior run outputs in an agent workspace; no reference to the known correction in an agent prompt |

The original seed contains four spec deltas with **18 requirement headings and 39 named scenarios**: `access-decisions` (4/11), `access-requests` (4/8), `local-dev-runtime` (3/7), and `policy-export` (7/13). Other source artifacts are `proposal.md`, `design.md`, `tasks.md` and `.openspec.yaml`. Original spec headings and scenario names are immutable reference data, not disposable text.

**Exact agent user task** (UTF-8; do not add validation commands or evaluator hints):

> Проверь и доведи до готовности к review существующий OpenSpec change `first-access-policy-slice`. Согласуй описание `policy-export` с `design.md` и `tasks.md` в части единого snapshot, `evaluationAt`, проверки действительности grants, адресов и Rule state. Сохрани все нормативные гарантии, ограничение на исторический as-of и существующие сценарии. В этой задаче допустимы только изменения planning artifacts внутри `openspec/changes/first-access-policy-slice/`; продукт, CI, конфигурацию и Skills не изменяй. Заверши кратким handoff-резюме для review.

The task and the treatment sentence are separately written to frozen local files **before** making any worktrees. Save SHA-256 of both files and the seed SHA in a manifest; reuse the exact files for all runs. Never generate a prompt dynamically based on results.

## 3. Isolation and executable setup contract

**Important contamination risk:** a `git worktree add` attached to the normal current repository shares Git objects/refs, allowing an agent to inspect PR #4's later correction `270da74c68617a32bd725ffb4f508c4c5ce9da33`. It is unsuitable as-is. The runner instead creates **six independent shallow Git working trees**, each with its own `.git` directory, fetching **only the exact seed SHA** with `--depth=1 --no-tags`. Do not fetch branches, tags, modern `main`, the fix commit or PR content into these repositories. Do not mount reference files from another trial. Verify `HEAD` and original blobs in each tree, and verify the fix commit object is absent.

Preconditions, run only *after* permission to execute:
1. Git and authenticated Codex CLI are present in WSL2. Check actual `codex --version` (expected workstation baseline `0.164.0`), `codex exec --help` support for all used flags, and `openspec --version` (**1.16.0**). No silent upgrades or fallback flags. Use the same resolved `codex` and `openspec` binary paths throughout.
2. Owner supplies **one supported explicit model ID**, to be used literally with `--model` in every run; model reasoning effort, flags, timeout and CLI version do not change. If model unavailable or serving conditions cannot be kept comparable, **BLOCKED** before/between trials.
3. Use `--ignore-user-config` and `--ephemeral`; do not resume existing Codex threads. Check for global `AGENTS.md` / `AGENTS.override.md` under the effective `CODEX_HOME`; if either has content, **BLOCKED** until an owner-approved, equivalent, isolated authentication/configuration arrangement is available. No additional project `AGENTS.override.md`, custom `model_instructions_file`, MCP/tools, hooks or skill modifications. Project-root instruction discovery must resolve to the isolated tree's `AGENTS.md`.
4. Verify the target OpenSpec CLI resolves the seed's project root; a **non-agent** strict fixture smoke check must fail with the known oversized requirement. If it passes, fails for another cause, or CLI is missing, **BLOCKED**; do not start a trial.
5. Isolate evidence and reference material **outside every working tree**, with directory permissions 0700; no network fetches after setup. Run Codex from each tree root, `--sandbox workspace-write`, `--ask-for-approval never`, `-c 'sandbox_workspace_write.network_access=false'`, `-c 'web_search="disabled"'`. Disable on-device agents capable of changing external files and report any sandbox exception as a blocking protocol violation.
6. Prevent active worktrees from seeing their peers through agent-provided paths; outside files are not authorized agent targets. Each run has a fresh context and is executed serially. Standard `workspace-write` primarily restricts writes; it does **not guarantee that an agent cannot read other files available to its OS user**. This is residual information-contamination risk: the operator must not expose evidence paths, must monitor accessed paths in command events, and must stop as BLOCKED if cross-trial data are accessed. No manual fixes between agent exit and oracle. No run is repeated after timeout, quality failure or refusal.

These checks define an executable *preflight gate*, **not a claim that this chat has inspected local WSL2 binaries or sessions**. Local command and sandbox flags are checked again before launch against installed CLI help. References: [Codex CLI options](https://learn.chatgpt.com/docs/cli/reference), [Codex instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [OpenSpec validation](https://openspec.dev/docs/cli).

## 4. Observable outcomes (independent dimensions)

### M1 — Agent-initiated preflight BEFORE handoff

From `codex exec --json` event stream, inspect chronological command-execution/tool events and exit codes. **Observed PASS:** an agent-issued shell invocation of `openspec validate --all --strict` within its worktree completes with exit 0 **before** the last handoff message. Record every earlier failed validation and subsequent fix, not only the last success. **Observed FAIL:** trace is complete and no successful agent invocation exists, or agent falsely claims it ran. **UNKNOWN:** no trustworthy per-command event, truncated trace or ambiguous command/exit status. Mere final-message assertions and the **later independent oracle** never count as M1 evidence. A validator-unavailable disclosure is a truthful handoff but not a passing preflight.

### M2 — Independent strict validity AFTER agent

Outside Codex, immediately execute `openspec validate --all --strict` from the finished tree and save raw stdout/stderr and the process exit code in private evidence. `0` = strict PASS, nonzero = strict FAIL. No retries/fixes. Run `git diff --check` separately with its own exit code. Capture agent process exit code and timeout separately: a timed-out/errored run is **incomplete** even if its partial tree independently validates.

### M3 — Contract preservation and allowed changes

For ambiguous semantic rewrites, use a separate reviewer blind to group, reviewing the normalized spec/design diff; if blind independent review is unavailable or remains uncertain, classify INCONCLUSIVE. In all cases review the exact after-run diff and all untracked files against the *frozen* checklist below. This is **not** a machine-validated semantics oracle and must not be inferred from M2 or agent self-assessment. Classify each row `PASS / FAIL / UNCERTAIN` with file/line evidence. Reviewer sees a group-masked diff after the manifest's expected treatment `AGENTS.md` change is normalized; record unblinded group separately.

- **S1 Snapshot:** export's grants, Rule effectiveness, Endpoint address realization, traffic and provenance all come from the one pinned committed database snapshot; no mixed reads.
- **S2 Timestamp:** server chooses one UTC `evaluationAt` after snapshot pin, and ALL grant validity/effectiveness checks use it; `valid_from` inclusive / `valid_until` exclusive.
- **S3 Authorization:** `policy.export` is required on **both** selected Rule Resources, including Rule inspection; failed authorization exposes no rows, addresses or provenance.
- **S4 Domain/readiness:** ACTIVE, ALLOWED Rules only; INACTIVE yields no rows but remains inspectable; missing current address yields INCOMPLETE null row, never executable permit; address revisions never change domain/Rule identity.
- **S5 Provenance/formats:** maintain identities, request/decision evidence, JSON–CSV parity, evaluation metadata (including CSV headers), null-cell semantics.
- **S6 Temporal scope:** arbitrary historical/client-supplied as-of unsupported; `evaluationAt` is not historical commit ID; revocation **after** snapshot pin affects future exports, not necessarily an already started export.
- **S7 Scenarios:** preserve all 39 original named scenarios and their behavioral WHEN/THEN guarantees across the four specs, including AC-01..AC-08 cases; renaming/removal/weakening is FAIL, even if new requirements are split to meet the validator.
- **S8 Change scope:** only existing OpenSpec planning artifacts in `openspec/changes/first-access-policy-slice/`: `proposal.md`, `design.md`, `tasks.md`, `specs/*/spec.md`. `.openspec.yaml`, other `openspec` paths, project files, CI, code, Skills and config remain untouched. Candidate's **exact pre-agent appended** root bullet is an expected experimental input, not agent-authorized editing; post-agent `AGENTS.md` must match its pre-run hash.

All eight rows must PASS for a trial to satisfy guardrails. A hidden/unspecified artifact, changed `AGENTS.md`, or leaked secret is a protocol violation. `UNCERTAIN` makes the overall experiment INCONCLUSIVE unless a stronger stop rule applies. Preserve untracked-file inventory and `git diff --check` result.

## 5. Decision and stop logic (locked to PR #16)

**Denominators:** three independent completed, evaluable A trials and three independent completed, evaluable B trials. Count strict success as `M2=PASS`; display M1 and M3 separately. Never count two historical CI failures as A observations, and never infer extra attempts or cost from GitHub timing.

Apply precedence:

1. **BLOCKED:** runtime cannot satisfy fixed CLI/model/seed/isolation/trace requirements; a preflight oracle or sandbox becomes unavailable; inputs differ unexpectedly; secret exposure or environmental drift threatens comparison. Stop immediately, preserve only safe evidence. No statistical conclusion.
2. **REJECT:** any completed B trial loses a contractual guarantee, changes a protected path, falsely asserts validation, or otherwise violates a known guardrail; OR, with six valid trials and no candidate regression, B strict passes `<=` A strict passes (including both 3/3). No Harness patch.
3. **SUPPORT (pilot only):** six valid trials, B **3/3** strict PASS, A **0/3 or 1/3** strict PASS, all eight guardrails PASS on every B trial. Report M1 as a distinct metric even when it is UNKNOWN; do **not** claim confirmed preflight behavior without M1 evidence. SUPPORT authorizes proposing a **separate** minimal Harness Draft PR for human decision, not merging.
4. **INCONCLUSIVE:** six otherwise valid trials with an advantage of just one of three, B 2/3 despite an apparent advantage, unresolved semantic uncertainty, or recoverable individual execution/timeout failure under unchanged conditions. A timeout is never replaced, never scored as strict PASS, and suppresses any SUPPORT conclusion. No Harness patch.

**Stop now** on scope drift, untrusted model/CLI change, attempted changes outside the sandbox, material inconsistency, secret discovery, exceeded 900 s per run or six-run authorization ceiling. If a run ends in an agent-originated scope violation, record the candidate regression when attributable; do not execute later runs just to reach a favorable score. If the problem is environmental, BLOCKED; if remaining trials are incomplete without protocol compromise, INCONCLUSIVE. Do not change criteria in response to results. A baseline 3/3 is a **task-specific ceiling effect** and is not proof the instruction can never help.

No claims about general effectiveness, reliability, token economics, hidden retries or product correctness from six runs. No new judge/DeepEval and no mandatory CI gate.

## 6. Evidence manifest, integrity and safe publication

Local private directory (0700), never checked in: `manifest.txt`, `task.txt`, `candidate.txt`, `fixture-preflight.log`; for each of `p1-a,p1-b,p2-b,p2-a,p3-a,p3-b`: initial/final `HEAD`/hashes, `events.jsonl`, `stderr.txt`, `final.txt`, `agent-exit.txt`, `oracle.log`, `oracle-exit.txt`, `diff-check.txt`, `paths.txt`, `diff.patch`, `untracked.txt`, M1/M3 review record; consolidated result matrix and final decision.

Record model string, CLI versions and resolved binary locations, config flags, host OS/WSL details **without hostnames/usernames**, order, timestamp and precise timeouts, original `AGENTS.md` blob, SHA-256 of frozen task/treatment, initial and post-run `AGENTS.md` hash, each `policy-export/spec.md` hash, and every evidence file digest. Record event truncation or missing fields as UNKNOWN, not as success.

**Redaction before publication:** raw Codex JSON/events, stderr, environment, shell history, host paths, tokens, credentials, auth files, private URLs, exact user/machine identifiers and secret-looking strings stay local. Produce a separate curated Markdown summary with trial ID, A/B, command class, relative paths, numeric exit codes, checks/guardrails, aggregate counts, SHA-256 digests and the minimum non-sensitive supporting diff excerpts. Inspect it manually and scan for secrets (e.g. `git diff --check`, `rg` for token/password/key patterns); replace real values with `[REDACTED]`, not with fabricated example telemetry. If sanitization cannot be demonstrated, withhold the artifact and mark BLOCKED. GitHub public repository only receives the curated summary after an owner-approved execution stage.

For this SDLC-04B preparation PR, no runner logs/results exist or are claimed. GitHub PR must contain documentation only; do not merge it, close Issue #10, or automatically launch 04C.

## 7. Preparation acceptance and handoff

Verified by GitHub repository inspection: seed SHA and blob identity, candidate text, original 18 requirements/39 scenarios, PR #16's preregistration, main's instruction scope, presence of OpenSpec Skills. Verified by official public documentation: CLI command and option surfaces. **Not tested here:** actual WSL2 CLI versions/flags, model availability, Codex instruction ingestion, one-shot sandbox execution and six A/B outcomes; these have explicit fail-fast gates in the runner.

**Hand off:** owner decides whether to permit the fixed six-run envelope, the supported model ID and local WSL2 execution. After approval, delegate the [separate runner task](sdlc-04-codex-runner-task.md) to Codex CLI/local operator. Return sanitized observations to a new review Draft PR, without merging the candidate instruction.
