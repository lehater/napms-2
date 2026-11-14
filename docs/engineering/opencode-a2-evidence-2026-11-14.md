# PR #70 A2 manual segmented diagnostic — BLOCKED

Tested runtime HEAD: `92ffa74f02fe401649256f7a0bef45d29f4278ac`, branch `feat/opencode-role-catalog-stage1`, OpenCode 2.2.0. This evidence commit changes documentation only. Immutable task `PR70-SEGMENT`: only `role-smoke.txt`, exact UTF-8 bytes `# Role smoke\n\nBounded Worker write.\n`. No acceptance normalization, artifact repair, retries, Controller, dispatcher, permanent permission changes, product changes, PR #68 changes or merge.

**First E2E: BLOCKED at independent Reviewer. Second E2E: NOT RUN**, as required after a non-passing first run. Successful deterministic validation does not override an incomplete independent review. [Selected sessions, actual tool events, prompts, bytes and isolation observations](opencode-a2-evidence-2026-11-14.json) contain the evidence; raw host logs/auth stores remain private.

## Actual execution

| Stage | Actual session/model | Result |
| --- | --- | --- |
| Host Orchestrator | `ses_e270677dbffe0MaWs1lATpzlh2`, `openai/gpt-6.1-sol` | CLI 0, succeeded; exactly two sequential children |
| Explorer | `ses_e27062705ffedMGfqJYBOoDSUr`, `openai/gpt-6.1-sol` | Read AGENTS.md, loaded openspec-explore; completed before Planner |
| Planner | `ses_e27058a01ffeEeyeg9DoqrxLyC`, `openai/gpt-6.1-sol` | Actual Explorer facts and literal contract received unchanged; bounded plan |
| bwrap Worker | `ses_e27043505ffeWWlTjLdMmL4iY5`, `ollama/qwen3-coder:30b` | CLI 0, succeeded; one read and one completed edit of role-smoke.txt |
| bwrap Validator | No LLM/session; `run.py segment-validate` | Exit 0; `Ran 5 tests`, `OK` |
| Independent host Reviewer | `ses_e27021f7effeNahxxJctFNW2gm`, `openai/gpt-6.1-sol` | CLI 0, succeeded; one actual read, but **incomplete verdict** |

Session and assistant-message model IDs agree. Host stages used existing stored OpenAI authorization and read-only roles, with no edit/shell/execute calls. Explorer's external Git HEAD/commondir reads were denied; the operator separately verified actual SHA and tracked diff. Its read of the absent smoke artifact returned file-not-found before the fixture created PLACEHOLDER. These errors are preserved, not counted as successful verification. Root IDs are unrelated across physical stages; A1 `verify_route()` was not used.

Worker's actual edit replaced `PLACEHOLDER` without consuming the existing LF. The resulting 36 bytes were:

```text
2320526f6c6520736d6f6b650a0a426f756e64656420576f726b65722077726974652e0a
```

SHA256: `d5a8dcb2e4882d7d3c0dc700e290e608d0ed5bc7edbd2915c47d307b57f46388`. The final `0a` is present. All five deterministic cases passed: actual artifact, invalid separator, extra content, missing final LF, and CRLF. No operator write followed Worker, including after review. The preexisting artifact from an earlier experiment lacked final LF and was preserved privately before this run; it is not this run's output.

## Isolation and handoff

The host bwrap probe exited 0. Read-only observations of both live Worker CLI/server processes confirmed empty `/home`, private `/tmp`, read-only checkout/fixture/config and hidden `.git` via `/dev/null`. Only `role-smoke.txt` was writable inside the checkout; the private runtime directory was also writable. The temporary config differed from the committed config by exactly one `worker edit role-smoke.txt allow` rule. The Worker credential table had zero rows.

The launcher passed only PATH, HOME, XDG paths, TMPDIR and OPENCODE_CONFIG; actual CLI env additionally contained PWD. No host/cloud credentials were forwarded or mounted. `OPENCODE_PASSWORD` appeared in the standalone **server child**, not the launcher/CLI or host environment; its value was not read or published. This is an internal standalone child variable, not evidence of forwarded host credentials. This remains a write boundary with shared networking for localhost Ollama, not a universal privacy/network sandbox.

The operator permitted Worker after completed Sol events, unchanged contract, baseline verification and mount probe, and permitted Reviewer after Worker tool/byte checks and Validator exit 0. Reviewer received Validator command/result, byte literal, length and SHA256 explicitly as **reported** evidence. It did not receive the operator's baseline diff/mount observations or selected upstream tool events. Its observed lines matched the contract, with no P0–P3 content findings, but it returned:

> Review: incomplete; no approval.
>
> PASS not established.

It listed raw bytes/final LF and baseline diff/only-file-changed evidence as missing independent checks. The operator stopped here; no second E2E and no repeat review were attempted.

## Cause and independent review

**P2: incomplete review handoff.** The example prompt supplied Validator exit but omitted baseline/path/write-boundary evidence. It also did not clearly specify how a read-only Reviewer should use reported deterministic byte evidence without claiming independent byte access. Actual Reviewer conservatively returned incomplete. This is a demonstrated review/evidence gap, not an observed credential leak, forbidden successful tool call or byte defect. P0/P1: none observed; P3: none identified in this diagnostic.

An independent project Reviewer inspected the runbook, role policies and selected actual events. It confirmed BLOCKED / second NOT RUN, and recommended clarifying the reported-evidence boundary and supplying baseline/path evidence. The runbook now requires that complete handoff for a **future separately authorized run**. Exact bytes, final LF, independent artifact read and all isolation criteria are preserved. The existing runtime verdict is not reclassified.

## Checks and reproduction

Python compilation of both fixture files and the structural test file passed; all 7 existing structural unittests passed. `python3 scripts/check-fast.py --dry-run` selected FULL. After environment preparation, the identical selected profile completed with exit 0: 249 pytest + 4 subtests, Ruff core, Web build/semantic, 40 + 18 browser tests, OpenSpec strict 16/16. Existing advisory failures: Ruff extended 71 findings, formatting 21 files, Pyright 34 errors. No billing/cost measurements are claimed.

Environment failures are recorded separately: Git worktree metadata and host OpenCode log required escalation; the initial worktree lacked python/venv/web dependencies; sandbox pytest stalled without results and was terminated by the operator before rerunning the same profile outside Codex's network sandbox. No failed A2 model stage was retried. Worker still executed inside its credential-free bwrap.

Reproduce only in a separate worktree using [segmented-run.md](opencode-smoke/segmented-run.md): record SHA and clean tracked diff, compile fixture Python, run structural tests, perform read-only Sol Explorer→Planner, then `run.py segment-worker`, then `run.py segment-validate`, then a fresh read-only Sol Reviewer with actual reported handoff evidence. Stop on any failure/incomplete verdict. A second independent run is conditional on complete first-run success; this execution did not meet that condition.

OpenSpec tasks: N/A; no specification artifacts changed. Final evidence-head SHA, matching Verify FULL run and final review are recorded in PR #70 after commit. PR remains Draft; owner acceptance pending, merge not performed.
