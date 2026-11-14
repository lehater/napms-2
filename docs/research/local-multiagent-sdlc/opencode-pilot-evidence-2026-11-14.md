# OpenCode multi-agent pilot evidence (2026-11-14)

## Scope

This is a local mode-A smoke run in one OpenCode root session. The pilot uses only a separate worktree based on `origin/main` at `e957bd4247d78847d70d7f92923e9cf1c1592f63`; it did not modify the accepted checkout, product code, Codex Harness, OpenSpec changes, or PR #68. ADR-001 and ADR-002 in PR #68 are still proposals. The run does not implement a durable Controller.

## Environment and model checks

| Item | Observed |
| --- | --- |
| OpenCode | `v2.2.0`, installed through npm; `opencode auth list` reports OpenAI stored |
| Node.js / npm | `v24.22.0` / `11.19.1` |
| Python | `3.12.3` |
| OpenSpec | `1.16.0` |
| Ollama client | `0.40.5` |
| OpenAI catalog | Includes `openai/gpt-6.1-sol` and other GPT-5.5/GPT-5.6/GPT-6 variants |
| Local catalog | `ollama/gpt-oss:20b`, `ollama/qwen3-coder:30b` |

A fresh read-only request via `opencode run --model openai/gpt-6.1-sol --agent plan --format json` returned `OpenAI ChatGPT model request passed.` No credentials or authorization configuration were read or copied. In a normal WSL user session, Ollama listed both local models. An HTTP `/api/tags` request from the pilot namespace also reached `127.0.0.1:11434` and returned both models.

## Pilot route

Root OpenCode session: `ses_e27c54de5ffe96ynAth31BQFcz`.

| Stage | Agent | Model | Result |
| --- | --- | --- | --- |
| Explorer | Built-in `explore` | `ollama/qwen3-coder:30b` | Read `AGENTS.md`, listed entries under `.agents/skills`, and loaded `openspec-explore`. |
| Planner | Pilot `planner` | `ollama/qwen3-coder:30b` | Produced the one-file task and exact acceptance criteria. |
| Worker | Built-in `general` configured as Worker | `ollama/qwen3-coder:30b` | Replaced the placeholder in `pilot/output.md`; the only writable project path was that file. |
| Test | Coordinator, inside offline bwrap | Python 3.12.3 | `python3 pilot/check_output.py` printed `PASS: bounded worker output matches the acceptance criteria`. |
| Reviewer | Pilot `reviewer` | `ollama/qwen3-coder:30b` | Independently read the file and returned PASS. |

The final artifact has exactly three lines: `# OpenCode pilot output`, a blank line, and `Worker wrote the bounded pilot artifact.`

## Access checks

The temporary bwrap namespace mounted the worktree read-only and bound only `pilot/output.md` writable for the Worker. OpenCode ran with a cleared environment, temporary HOME/XDG paths, and a temporary data directory; no authentication files were mounted into that profile or read/copied. The root filesystem itself was mounted read-only, so this run does not claim confidentiality isolation from all host files. The OpenCode permissions deny `edit`, `shell`, and `execute` by default; the Worker gets an `edit` allow only for `pilot/output.md`. Reviewer has `edit`, `shell`, `execute`, external-directory, and subagent access denied. The local Ollama run shared the network namespace only to reach the local Ollama HTTP endpoint; the acceptance check ran offline.

Observed probes:

- OpenCode denied the Worker's file-tool attempt at `pilot/unauthorized.md`.
- The Worker's shell tool was unavailable; the harmless dummy push command was not executed. No push or merge was attempted or performed.
- With the Worker mount shape, direct `touch /mnt/pilot/worker-unauthorized.md` failed with `Read-only file system`; the permitted `pilot/output.md` edit succeeded.
- The Reviewer returned PASS. Its extra write probe was interpreted as a read and therefore did not exercise OpenCode's write-deny rule. A direct `touch /mnt/pilot/reviewer-unauthorized.md` against the Reviewer read-only mount failed with `Read-only file system`. The configured OpenCode rule also denies `edit` for Reviewer.

This verifies the tested filesystem write boundary for this process namespace. bwrap shared the host network for Ollama, so this is not a general-purpose production sandbox or network-isolation proof. Keep shell and Code Mode denied for these roles and use a separately hardened runner for future untrusted code.

The role, tool, permission, skill, and provider setup follows the installed CLI's documented interfaces: [Agents](https://opencode.ai/docs/agents/), [Permissions](https://opencode.ai/docs/permissions/), [Tools](https://opencode.ai/docs/tools/), [Skills](https://opencode.ai/docs/skills/), and [Providers](https://opencode.ai/docs/providers/). In particular, V2 permissions use ordered rules and the last matching rule wins; `execute` exposes Code Mode and nested tools retain their own permission checks.

## Checks and limitations

- `opencode auth list`, `opencode models`, and `opencode --version`: passed.
- ChatGPT subscription model request (`openai/gpt-6.1-sol`): passed.
- Ollama normal-session and pilot-namespace reachability: passed.
- Ordered one-session route Explorer → Planner → Worker → test → Reviewer: passed, using local Qwen for all pilot agents.
- Pilot acceptance script: passed inside an offline, read-only bwrap worktree.
- `python3 scripts/check-fast.py --dry-run`: selected `FULL` because the pilot files have unknown change scope.
- `python3 scripts/check-fast.py` first reported missing worktree-local prerequisites. With existing compatible dependencies temporarily exposed from the accepted checkout, backend regression started but produced no output or progress for over five minutes at its first pytest temporary context; it was interrupted with exit 130. No project test result is claimed. The temporary dependency symlink was removed.
- `opencode debug agents` without `--print-logs` can still raise `UnsupportedContentType`; `--print-logs` is the observed workaround. This diagnostic issue did not prevent model calls or the pilot route.

## Follow-up

Review this pilot config and local evidence in the Draft PR. Before adopting these roles for regular work, verify the full project check on a clean runner, exercise the Reviewer write rule with a direct OpenCode write-tool denial in a controlled run, and choose the intended stronger OS/network sandbox boundary. No role catalog beyond this smoke route is approved by this pilot.
