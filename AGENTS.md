# Agent instructions

- Use the installed OpenSpec Skills for managing specifications and their changes.
- GitHub `main` is the accepted project state. Use separate branches, PRs and squash merge; never push directly to `main`.
- Use `lehater/napms` only as a knowledge source. Do not copy its code, history or Harness.
- Prefer KISS, YAGNI, and minimal, verifiable changes.
- Do not add tools, processes, dependencies or product architecture without a demonstrated need.
- For SDLC-improvement work, follow `docs/engineering/sdlc-improvement-roadmap.md`; keep execution bounded to the assigned Issue and record evidence in GitHub. Do not invent agent cost/trace data or automatically change the Harness.
- For local iterations, inspect and run the selected profile with `python3 scripts/check-fast.py --dry-run` and `python3 scripts/check-fast.py`; use `--full` for diagnosis. Draft PR checks are FAST where safe, while Ready PR runs FULL on the merge candidate. Refer to `docs/engineering/quality-gates-baseline.md` §7.
- Before handing off OpenSpec changes for review, run `openspec validate --all --strict` on the final files when the CLI is available. If unavailable, disclose the missing local check and use the PR's `Verify / validate` result; never claim a check that was not run.
- Implementation handoff must identify the exact PR head SHA, matching CI run and blocking/advisory outcomes, OpenSpec task status, and outstanding limitations. Include a reproducible user smoke scenario when applicable; record owner acceptance in the PR before squash merge. Recheck CI on the final head after substantive fixes.
- Never commit secrets or confidential infrastructure details to this public repository.

- REAL UI changes must follow [`docs/ux/real-ui-conformance.md`](docs/ux/real-ui-conformance.md). Before handoff, identify the shared components reused by each REAL screen and inspect one actual desktop render; screenshots alone and green CI do not establish conformance.

## Codex subagents

- Use one executor by default for short tasks.
- For substantial independent work, the main agent may delegate up to three scoped tasks to built-in `explorer` (fact gathering), built-in `worker` (implementation), and project `reviewer` (diff review). Use only the agents needed; exploration and review may run in parallel, while review of implementation follows the changes.
- Give each subagent its inputs, file boundary, and expected concise response. Share only the history it needs; the coordinator combines results into one handoff.
- Assign one owner to edit each file because agents may share a working directory. Do not promise file or database isolation between agents.
- Subagents do not decide architecture, merge, or run optional expensive checks. They return questions to the coordinator when requirements are unclear.
- Use the existing Fast/Full process without duplicating checks. Do not create new Skills, gates, test frameworks, or OpenSpec tasks unless needed.
