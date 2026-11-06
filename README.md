# NAPMS 2.0

New implementation of the Network Access Policy Management System.
The repository is currently at the tooling bootstrap stage; no product requirements or application code have been added.

## Workflow

1. Start from the current `main`, create a short-lived branch.
2. Use OpenSpec to manage product specifications and changes; Codex consumes OpenSpec Skills.
3. Validate locally, commit, push, and open a Pull Request.
4. After CI succeeds, review and squash-merge the Pull Request into protected `main`.

[Original NAPMS](https://github.com/lehater/napms) is a read-only knowledge source.
Do not migrate its Git history, code or custom Harness.

This repository is public: do not publish credentials or confidential infrastructure information.
