> **АРХИВ / исследовательский материал, не принятый продуктовый контракт.** Исходник: [PR #39](https://github.com/lehater/napms-2/pull/39), [commit `990e17eff64e`](https://github.com/lehater/napms-2/commit/990e17eff64e3d5368ffeeaeea542bcc02e65e09). Текст и выводы относятся к состоянию исследования 7–9 ноября 2026 года. Приведённые ссылки на отсутствующие в архиве бинарные доказательства ведут к исходному коммиту; исходные ветки пока сохраняются.

# Execution provenance

- Protocol read from PR #39 head `a13073eef1c6cae2d64337950d15f1611e23a247`.
- Both implementation worktrees created at `642a6f8f5d7e903641068887bd5a32ae6ea466d3` and verified with `git rev-parse HEAD` before edits.
- Branches: `exp/ui-application-A`, `exp/ui-application-B`; evidence stays on the existing Draft PR branch.
- Execution began 2026-11-08 UTC (2026-11-09 Europe/Moscow).
- Implementations run in fresh delegated Codex sessions with no conversation history, the same inherited model/effort and tool permissions. No model override was supplied. Both received the same protocol and shared task, with arm-specific skill instructions and separate paths/ports.
- Installed CLI reports `codex-cli 0.167.0`. These are delegated sessions, **not `codex exec` invocations**. The CLI version does not identify the model serving these sessions. Exact serving model/effort, token usage and monetary cost are not independently exposed in the collected evidence and are not claimed.
- A and B cannot be fully blinded to their own treatment. The independent auditor is a separate read-only delegated session and sees branch labels; this is not a blinded human audit.
- E2E uses port 5173 sequentially; screenshot servers use A 5174, B 5175, unchanged baseline 5176.
- No main push or merge is authorized. No changes to OpenSpec, backend, domain model, fixtures, contracts or existing CI are authorized.

Interpret results as a one-task pilot. Session provenance and lack of blinding limit causal and general productivity claims.
