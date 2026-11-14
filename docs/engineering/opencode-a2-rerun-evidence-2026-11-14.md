# PR #70 — two new A2 segmented E2E runs: COMPLETE/PASS

Both new runs used runtime HEAD `95a788ecc672615d3146b907b191eb3233af9bfc`, branch `feat/opencode-role-catalog-stage1`, OpenCode 2.2.0, and the unchanged contract/configuration from [segmented-run.md](opencode-smoke/segmented-run.md). They follow [issuecomment-6874245580](https://github.com/lehater/napms-2/pull/70#issuecomment-6874245580). The earlier [BLOCKED diagnostic](opencode-a2-evidence-2026-11-14.md) remains historical evidence; its verdict has not been reclassified.

**New E2E №1: COMPLETE/PASS. New E2E №2: COMPLETE/PASS.** Run №2 began only after the first independent Reviewer completed PASS. Each run used fresh physical sessions and private runtimes, a clean baseline, and a new fixture-created placeholder. The host Explorer/Planner request was identical. No stage retry, repeat review, manual artifact repair, acceptance normalization, architecture change, or permanent OpenCode permission change occurred.

[Selected actual evidence](opencode-a2-rerun-evidence-2026-11-14.json) includes each complete handoff exactly as supplied before Reviewer launch, its checksum, recorded tool events, model/session identities, live Worker mounts/env keys, deterministic Validator command/result, and each independent review. Raw auth stores and host logs are not published. No cost measurements are claimed.

## Physical stages

| Stage | E2E №1 session | E2E №2 session | Actual result |
| --- | --- | --- | --- |
| Host Orchestrator | `ses_e26e98fdcffeXPhK9OvK6h0ijG` | `ses_e26dda9cdffewlXjrOiaW3F2nn` | Sol, CLI 0, succeeded; Explorer then Planner |
| Explorer | `ses_e26e954adffe7xwlA7urSo9Rrc` | `ses_e26dd67baffehYyiKGZmeY36sl` | Sol; actual AGENTS.md read and openspec-explore load |
| Planner | `ses_e26e8cbbfffeuxYYth9bVI9dXd` | `ses_e26dc5f7affeftNu2LeczdazL6` | Sol; actual Explorer observations and unchanged literal contract received |
| bwrap Worker | `ses_e26e7fa92ffeTy5ZBi2bWV11sV` | `ses_e26dbc7ecffeoH7JrxTy5gfn9r` | Qwen, CLI 0, succeeded; one read and one completed edit |
| bwrap byte Validator | No LLM/session | No LLM/session | Separate Python process per run, exit 0, five tests OK |
| Independent host Reviewer | `ses_e26de7839ffebO1zTU6j3wb3lE` | `ses_e26d9f5caffe7StyAxckR2f3CZ` | Sol, CLI 0, succeeded; actual read and COMPLETE/PASS |

Sol is `openai/gpt-6.1-sol`; Qwen is `ollama/qwen3-coder:30b`. Actual assistant-message and session model IDs agree. All six physical roots are unrelated; each Explorer/Planner pair belongs only to its own host root. The actual Explorer subagent call completed before Planner was called. Neither host stage used edit, shell, or execute. There were no recorded tool errors. A1's single-root `verify_route()` was not used.

## Complete handoff prepared before each Reviewer

| Evidence | E2E №1 | E2E №2 |
| --- | --- | --- |
| Handoff SHA256 | `59feae1228aaf76e206449d0a59d89337f93139c8807e2fdbc258c85a3c2f9d4` | `a2b0ca90a6aa03b43ad0fdef16d6cbf51c738e52fd4d1c806f9e13429ff34590` |
| Actual runtime base/current HEAD | `95a788ecc672615d3146b907b191eb3233af9bfc` / same | Same / same |
| GitHub PR base | `ab62ca13bb15a9f5dd26f2dca5dbef54d92bb8d0` | Same |
| Before stages | Clean tracked and untracked status | Clean tracked and untracked status |
| After Worker | Tracked diff empty; untracked `role-smoke.txt` only | Same |
| Real Worker edit | Replace `PLACEHOLDER` with the three literal lines; existing LF retained | Same |
| Deterministic Validator | `run.py segment-validate`; inner `python3 /tmp/fixture/check_smoke.py`; exit 0, `Ran 5 tests`, `OK` | Same, fresh process/runtime |

The handoffs also contain the actual new-file diff (`git diff --no-index -- /dev/null role-smoke.txt`, expected exit 1 for a difference), upstream session/tool records, live OS mount observations, launch arguments, env key names, temporary config delta, and exact-byte checksum. Timestamps establish that both handoffs were prepared before the corresponding Reviewer sessions existed. The exact UTF-8 JSON serialization used for their checksums is documented in the selected evidence.

Live observations of both Worker CLI/server processes in each run confirmed a read-only checkout/fixture/config, hidden `.git`, empty private `/home`, private `/tmp`, and writable `role-smoke.txt` as the sole writable path inside the checkout. The separate private runtime is also writable. The only temporary configuration delta was the runbook's single `worker edit role-smoke.txt allow` rule. Worker credential table count was zero in each runtime; no host auth store was mounted or forwarded. Only env key names were captured. `OPENCODE_PASSWORD` was present solely in the standalone server child as an internal variable, absent from launcher/CLI; its value was neither read nor published. Networking remains shared for localhost Ollama: this is a write boundary, not a universal network/privacy sandbox.

## Artifact and independent review

Both artifacts were exactly 36 bytes, including final LF, and remained unchanged after review:

```text
2320526f6c6520736d6f6b650a0a426f756e64656420576f726b65722077726974652e0a
```

SHA256: `d5a8dcb2e4882d7d3c0dc700e290e608d0ed5bc7edbd2915c47d307b57f46388`.

In each run the deterministic Validator tested the actual exact bytes and four negative cases: nonblank separator, extra content, missing final LF, and CRLF. Exit 0 and five tests OK were observed by the coordinator. Neither artifact was edited by the operator after Worker; outputs were preserved privately after each completed review to restore the clean baseline.

Each fresh Reviewer independently called read on the actual artifact and observed the heading, blank line, and `Bounded Worker write.`. Each assessed the supplied baseline/diff, Worker events, mounts, Validator result, and checksum and returned **COMPLETE/PASS**, with **no P0–P3 defects**. Both explicitly distinguished their observed file read from reported byte equality/final LF, Git state, and process isolation. The Reviewers performed no shell, edit, execute, delegation, or byte tests and claimed no such execution. Their complete original verdicts and actual read outputs are in the JSON evidence.

The earlier P2 handoff gap is resolved for these two new runs by complete reported evidence and independent assessment. The previous incomplete review remains unchanged. No Reviewer verdict was overridden or obtained by retrying prompts.

## Scope, verification and owner gate

These are two manually coordinated segmented E2E successes. They do not demonstrate a continuous OpenCode root, autonomous dispatch, or a durable Controller. The bounded run shows no additional need to implement an ephemeral sequencer; any future proposal needs a separate owner decision. No Controller/sequencer, runtime, product, Harness, dependency, or permanent permission changes are part of this follow-up. Main and PR #68 were not changed; merge was not performed.

The follow-up commit adds selected evidence and updates only the runbook status. Its exact final HEAD, selected local check results, matching Verify FULL run, blocking/advisory outcomes, and limitations are recorded in PR #70 after the commit. The prior FULL belongs to `95a788e` and is not used to claim CI on a new documentation SHA.

OpenSpec tasks: **N/A**; no specification changes. Reproduce via the existing [runbook](opencode-smoke/segmented-run.md), preserving its immutable contract and complete pre-Reviewer handoff. Owner acceptance is **pending**; PR remains **Draft**. COMPLETE/PASS is experiment evidence, not merge authorization.
