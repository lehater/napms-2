# OpenCode multi-agent pilot evidence (2026-11-14)

## Scope and checkout

- Draft PR: [#69](https://github.com/lehater/napms-2/pull/69); branch `experiment/opencode-multiagent-pilot-2026-11-14`.
- Accepted `main` base: `e957bd4247d78847d70d7f92923e9cf1c1592f63`.
- Feature branch HEAD before these P1 fixes: `29357ce5b2b0351d395ad086ab7307339a79abb9`.
- P1 implementation commit: `60185ee1eb1f3c537657d867dd6c0b176564311a`; the final route and focused checks ran against the identical pilot code/config tree before this commit (only this evidence file was updated afterward).
- This was a disposable worktree under `/tmp/napms-opencode-pilot`. The accepted checkout, `main`, product code, existing Codex Harness, OpenSpec changes, and PR #68 were not modified. No push or merge was attempted by the agents.

## Environment and model availability

| Item | Observed |
| --- | --- |
| OpenCode | `v2.2.0`, npm installation; `opencode auth list` reports OpenAI stored |
| Node.js / npm | `v24.22.0` / `11.19.1` |
| Python | `3.12.3` |
| OpenAI model | `openai/gpt-6.1-sol` is in the installed model catalog |
| Ollama models | `qwen3-coder:30b`, `gpt-oss:20b`; local `/api/tags` was reachable |

OpenAI authorization is present, and a prior read-only request to `openai/gpt-6.1-sol` succeeded. During this continuation, an isolated request first failed DNS because the temporary process had no proxy variables; after passing the inherited proxy variables privately, OpenCode returned `UnexpectedStatus: 503`. No credentials were displayed or copied. The verified route below therefore used local `ollama/qwen3-coder:30b` for all agents.

## Isolated pilot configuration

The former root `opencode.jsonc` was moved to `pilot/opencode.jsonc`. OpenCode does not auto-discover that location; the pilot selects it with `OPENCODE_CONFIG`. `pilot/README.md` documents a per-run invocation using temporary HOME/XDG config, data, state, cache, and temp paths. The disposable config explicitly points its local Ollama-compatible provider at `127.0.0.1:11434`; it does not load the persistent auth store. This isolates the pilot role configuration from normal project and user defaults.

Resolved configuration was inspected with `opencode --standalone debug agents`. The resulting agent IDs, models, modes, and permissions were present. The earlier `UnsupportedContentType` from the default diagnostic path was not reproduced by this isolated `--standalone` invocation; its original cause remains unestablished and it did not prevent the pilot.

## Acceptance check

`pilot/check_output.py` compares the complete `splitlines()` tuple with exactly:

1. `# OpenCode pilot output`
2. an empty line
3. `Worker wrote the bounded pilot artifact.`

`pilot/test_check_output.py` covers a passing artifact, a nonblank separator, and an extra trailing line. In the route, Validator ran these allowlisted commands; the shell tool metadata recorded exit 0 for both:

```text
python3 -m unittest discover -s pilot -p test_check_output.py && echo PASS_EXIT_0
Ran 3 tests ... OK
PASS_EXIT_0

python3 pilot/check_output.py && echo PASS_EXIT_0
PASS: bounded worker output matches all three acceptance lines
PASS_EXIT_0
```

The acceptance script and negative test also passed in the focused local check. Other shell commands are `ask` and are rejected in noninteractive mode; the Validator's Python checks and `echo PASS_EXIT_0` are the only allowed shell subcommands.

## One-session mode-A route

Root session: `ses_e276effdcffekIGzwQUutHpj7d` (`ollama/qwen3-coder:30b`). It completed five fresh child sessions in sequence:

| Stage | Agent | Child session | Model | Observed result |
| --- | --- | --- | --- | --- |
| Explorer | `explore` | `ses_e276db6e9ffewRdpkt1HBp70r1` | `ollama/qwen3-coder:30b` | Read `AGENTS.md` and the pilot README, loaded `openspec-explore`, and returned facts. Some glob discovery attempts were inconclusive, so this is not evidence that the full skills directory was enumerated. |
| Planner | `planner` | `ses_e276d8203ffe77QmDz5U7yYYnq` | `ollama/qwen3-coder:30b` | Returned the one-file task and exact three-line acceptance contract. |
| Worker | `worker` | `ses_e276d71a5fferoIjAyLIldKJcz` | `ollama/qwen3-coder:30b` | OpenCode `edit` changed only `pilot/output.md`, replacing `PLACEHOLDER` with the planned text. |
| Validator | `validator` | `ses_e276d59bdffejpQqM9lQgQssYU` | `ollama/qwen3-coder:30b` | Two actual shell events, each exit 0; 3 unit tests passed and acceptance printed PASS. |
| Reviewer | `reviewer` | `ses_e276d429affe0ctXY1btkKIK3a` | `ollama/qwen3-coder:30b` | Independently read all three lines and returned PASS. |

The route's serialized OpenCode session stream and the temporary OpenCode database were inspected. The Worker had one failed stale-text edit attempt followed by a successful `PLACEHOLDER` replacement, both scoped to `pilot/output.md`. The Validator's two successful shell events each recorded exit 0. The Reviewer attempted both forbidden operations: `edit` on `pilot/reviewer-write-probe.txt` and `shell touch pilot/reviewer-shell-probe.txt`. OpenCode returned `No tool named "edit"/"shell" is currently available` for those calls; both probe files remained absent. This is the actual deny result in v2.2.0's tool interface, not a claimed attempt or only a host filesystem error.

## Write and shell boundary checks

- During the route, bubblewrap mounted the checkout read-only and bound only `pilot/output.md` writable for the Worker. OpenCode permissions denied Reviewer `edit`, `shell`, `execute`, external-directory, and subagent access. The Validator had only its narrowly allowlisted checks.
- Separately, a bubblewrap shell probe mounted the checkout read-only and attempted `touch /mnt/pilot/reviewer-shell-probe.txt`; it failed with `Read-only file system`, and no probe file was created. This tests the OS-level mount boundary in addition to OpenCode tool denials. A Git worktree alone was not treated as OS isolation.
- No `git push` or merge command was made available to the pilot agents; neither was executed.

## Checks and status

- `python3 -m json.tool pilot/opencode.jsonc`: passed.
- `git diff --check`: passed.
- `python3 -m unittest discover -s pilot -p test_check_output.py`: 3 tests passed, including both negative cases.
- `python3 pilot/check_output.py`: passed for the Worker artifact.
- Continuous mode-A route Explorer → Planner → Worker → Validator → Reviewer: passed in one OpenCode root session; child-level tool metadata independently confirms Worker edit, both validator exit codes, and Reviewer tool denial.
- `python3 scripts/check-fast.py --dry-run`: selected FULL because the rename/delete and new pilot files are unknown scope. The local full profile was not repeated: a prior attempt on this same disposable worktree stalled at the first pytest temporary context for over five minutes and was interrupted with exit 130. The requested GitHub Verify FULL is the full-project check for this revision.
- GitHub Verify FULL: [run 43562990745](https://github.com/lehater/napms-2/actions/runs/43562990745), head `c54cab19f5c6316407f42ffa8c9e85ff43864223`, conclusion `success`. `semantic-contract`, `validate`, `application`, and `web` all passed, including the real FastAPI/SQLite browser tests. `changes` was skipped for this manual dispatch. The workflow's `Block required FULL status while Draft` step was skipped in `web` and `application`, as configured for Draft PRs; no test job failed. This run used `gh workflow run verify.yml --ref experiment/opencode-multiagent-pilot-2026-11-14` followed by `gh run watch 43562990745 --exit-status`.

The pilot does not implement a long-running Controller or establish a production-grade sandbox. The OpenAI 503 remains an external model connectivity issue for this run; local Ollama completed the bounded route.
