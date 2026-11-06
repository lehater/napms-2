# Agent instructions

- Use the installed OpenSpec Skills for managing specifications and their changes.
- GitHub `main` is the accepted project state. Use separate branches, PRs and squash merge; never push directly to `main`.
- Use `lehater/napms` only as a knowledge source. Do not copy its code, history or Harness.
- Prefer KISS, YAGNI, and minimal, verifiable changes.
- Do not add tools, processes, dependencies or product architecture without a demonstrated need.
- For SDLC-improvement work, follow `docs/engineering/sdlc-improvement-roadmap.md`; keep execution bounded to the assigned Issue and record evidence in GitHub. Do not invent agent cost/trace data or automatically change the Harness.
- Never commit secrets or confidential infrastructure details to this public repository.
