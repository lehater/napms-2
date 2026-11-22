# Agent instructions

- Use the installed OpenSpec Skills for managing specifications and their changes.
- GitHub `main` is the accepted project state. Use separate branches, PRs and squash merge; never push directly to `main`.
- Use `lehater/napms` only as a knowledge source. Do not copy its code, history or Harness.
- Prefer KISS, YAGNI, and minimal, verifiable changes.
- When preparing, selecting, or updating tasks under the AI task workflow, read [the workflow policy](.ai/workflow.yaml) first and verify the relevant Issue and Project data in GitHub. Use `decompose` for preparation and `execute-task` for a Ready issue.
- For a task-scoped Codex run with enabled Langfuse tracing (including refinement), the Coordinator/launcher prepares its Issue/Run identity using [the task tracing procedure](.ai/codex-task-tracing.md): preferably before launch, or as soon as an Issue is selected inside an active session, before its next Stop Hook. Missing tracing is not an execution gate.
- For authorized Langfuse telemetry reads, use the separate [read-access procedure](.ai/langfuse-read-access.md); do not use task tracing/export setup as the API read path.
- When asked what to do next without an issue number, start in [GitHub Project #6](https://github.com/users/lehater/projects/6). For planning, filter **Product Structure** by `is:open status:Preparing` and inspect the native blockers in the requested workstream or parent issue. Use `decompose` for the open prerequisite that must be resolved first. For execution, start from **Ready Queue** and use `execute-task` to check eligibility before assignment. Use recorded priorities to choose among candidates in scope. If scope or priority is unclear, report the candidates and their blockers so the owner can choose.
- Do not add tools, processes, dependencies or product architecture without a demonstrated need.
- For SDLC-improvement work, follow `docs/engineering/sdlc-improvement-roadmap.md`; keep execution bounded to the assigned Issue and record evidence in GitHub. Do not invent agent cost/trace data or automatically change the Harness.
- Before assigning or handing off a task, follow the Coordinator guidance in `.ai/workflow.yaml` to select the runtime from verified capabilities, choose a suitable model/reasoning mode, and set the session boundary in the existing GitHub handoff. For optional run correlation, use `.ai/codex-task-tracing.md`.
- Use Git/Codex native branches and worktrees when isolation is needed; do not require a custom worktree manager, fixed path, or universal preflight. Reuse existing dependencies when compatible (native OS or VS Code worktree symlinks); use isolated installs only when necessary. For Python/Web local iterations, use `make check` and `make check-full` only for integration/diagnosis. From another worktree, optionally pass `PYTHON=/absolute/path/to/primary/.venv/bin/python` to `make`; Makefile sets `PYTHONPATH` to the active `src` and `NAPMS_PYTHON` for Web E2E. For docs-only changes, use `git diff --check` and applicable OpenSpec checks.
- Before handing off OpenSpec changes for review, run `openspec validate --all --strict` on the final files when the CLI is available. If unavailable, disclose the missing local check and use the PR's `Verify / validate` result; never claim a check that was not run.
- Implementation handoff must identify the exact PR head SHA, matching CI run and blocking/advisory outcomes, OpenSpec task status, and outstanding limitations. Include a reproducible user smoke scenario when applicable; record owner acceptance in the PR before squash merge. Recheck CI on the final head after substantive fixes.
- Never commit secrets or confidential infrastructure details to this public repository.

- REAL UI changes must follow [`docs/ux/real-ui-conformance.md`](docs/ux/real-ui-conformance.md). Before handoff, identify the shared components reused by each REAL screen and inspect one actual desktop render; screenshots alone and green CI do not establish conformance.

## Codex subagents

- Use one executor by default for short tasks.
- For substantial independent work, the main agent may delegate up to three scoped tasks. Choose `explorer` for fact gathering and predefined checks, `worker` for implementation under a prepared contract, and `reviewer` for independent diff review of behavior, contracts, or invariants. Use only the agents needed. Review implementation after the changes are available.
- Give each subagent its inputs, file boundary, and expected concise response. Share only the history it needs; the coordinator combines results into one handoff.
- Assign one owner to edit each file because agents may share a working directory. Do not promise file or database isolation between agents.
- Subagents do not decide architecture, merge, or run optional expensive checks. They return questions to the coordinator when requirements are unclear.
- Use the existing Fast/Full process without duplicating checks. Do not create new Skills, gates, test frameworks, or OpenSpec tasks unless needed.
