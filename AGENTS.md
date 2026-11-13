# Agent instructions

- Use the installed OpenSpec Skills for managing specifications and their changes.
- GitHub `main` is the accepted project state. Use separate branches, PRs and squash merge; never push directly to `main`.
- Use `lehater/napms` only as a knowledge source. Do not copy its code, history or Harness.
- Prefer KISS, YAGNI, and minimal, verifiable changes.
- Do not add tools, processes, dependencies or product architecture without a demonstrated need.
- For SDLC-improvement work, follow `docs/engineering/sdlc-improvement-roadmap.md`; keep execution bounded to the assigned Issue and record evidence in GitHub. Do not invent agent cost/trace data or automatically change the Harness.
- For suitable PolicyRule-only iterations, inspect the profile with `python3 scripts/check-fast.py --dry-run` and run FAST when selected. For other changes, choose local checks by affected area; use FULL for unknown impact or diagnosis. FAST is limited to `web/src/PolicyRule.tsx` and `web/src/PolicyRules.tsx` when both exist in the merge-base and worktree. The complete GitHub Verify remains required before integration.
- Before handing off OpenSpec changes for review, run `openspec validate --all --strict` on the final files when the CLI is available. If unavailable, disclose the missing local check and use the PR's `Verify / validate` result; never claim a check that was not run.
- Implementation handoff must identify the exact PR head SHA, matching CI run and blocking/advisory outcomes, OpenSpec task status, and outstanding limitations. Include a reproducible user smoke scenario when applicable; record owner acceptance in the PR before squash merge. Recheck CI on the final head after substantive fixes.
- Never commit secrets or confidential infrastructure details to this public repository.
