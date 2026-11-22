# Experiment 02 — Deterministic filtering of GitHub results

- **Date:** 2026-11-22 UTC
- **Codex CLI:** `0.171.0`
- **Run:** one fresh session; one agent; no subagents
- **Configuration:** `gpt-6-luna / medium`
- **Status:** completed with native journal measurements

## Protocol

This single C run repeated the GitHub research task from [Experiment 01](../2026-11-22-github-delegation-retest/report.md): source-linked summaries for Issues #153, #155, and #156 covering purpose, accepted outcome, constraints, final documentation artifact, merged PR, issue relationships, and material unknowns. The three original issue links and outcome PRs #160/#162/#164 were queried directly with GitHub CLI. No A or B run was repeated.

The fresh `codex exec` session used `--model gpt-6-luna` and `model_reasoning_effort="medium"`. It made all GitHub requests itself. The session used Python 3 to apply a deterministic projection to `gh --json` results before printing them; selected fields included issue number/title/state/URL/close time/body/labels/project status and PR number/title/state/merge time/commit/URL/body/changed paths. The final issue projection retained selected headings and contract lines; PR output retained merge metadata, relevant paths, and selected summary lines. No repository files were changed by the measured session.

There were avoidable execution errors within this one run: the environment had no `python` executable (the `python3` retry worked); one PR query requested an unsupported JSON field; and an initial jq regular expression failed to compile. Those failed attempts and their returned tool text remain included in the measurements. A later projection completed the retrieval. The final result notes that #155 blocker details were not captured in this run; this is a completeness limitation relative to A/B.

## Results

The run returned linked summaries for all three issues and verified that PRs #160, #162, and #164 are merged, including each documentation path and merge commit. See [`result-c.md`](result-c.md) for the complete task result and evidence links.

## Native journal measurements

| Arm / participant | Initial prompt input | Maximum prompt input | Input | Cached input | Uncached input | Output | Reasoning output | Total tokens | Model calls | Codex tool calls | GitHub CLI calls | Tool output bytes | Duration |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C coordinator | 19,877 | 29,920 | 227,525 | 203,136 | 24,389 | 4,032 | 645 | 231,557 | 9 | 8 | 17 | 37,716 | 78.896 s |

Initial and maximum prompt input use `info.last_token_usage.input_tokens` from the first and largest model request. Input, cached input, output, and reasoning output are sums of the per-response `token_usage_record.usage` values; cached input is a subset of input, and uncached input is input minus cached input. Total tokens equal input plus output. Model calls are distinct response usage records. Codex tool calls count journaled tool invocations. GitHub CLI calls count `gh` invocations in the session, including the version and help queries and unsuccessful attempts. Tool output bytes are UTF-8 bytes across text blocks returned by the eight journaled tool calls, including shell wrapper text but excluding event metadata. Duration is the interval between the first and final journal timestamps. Only derived metrics are published; raw journals, prompts, and payloads are not.

## Comparison with A and B

| Measure | A coordinator | B coordinator | B all participants | C coordinator |
|---|---:|---:|---:|---:|
| Maximum prompt input | 37,056 | 21,099 | 32,126 | 29,920 |
| Input tokens | 223,302 | 81,586 | 244,076 | 227,525 |
| Cached input | 192,128 | 53,760 | 183,168 | 203,136 |
| Uncached input | 31,174 | 27,826 | 60,908 | 24,389 |
| Output tokens | 2,541 | 871 | 2,247 | 4,032 |
| Model calls | 8 | 4 | 10 | 9 |
| Codex tool calls | 7 | 3 | 8 | 8 |
| GitHub CLI calls | 19 | 0 | 4 | 17 |
| Duration | 74.867 s | 57.344 s | 94.822 participant-s | 78.896 s |

C's maximum prompt was 19.3% below A's coordinator maximum and 6.9% below B's maximum across participants, while exceeding B's coordinator maximum by 41.8%. C used 1.9% more input tokens than A, but 24.389k uncached input tokens versus A's 31.174k. C's total tokens were 231,557, 2.5% above A and 6.0% below B's aggregate 246,323. C made one more model call than A and took 5.4% longer than A. B's duration across all participants includes overlapping work; its wall-clock duration was 57.344 seconds. A/B did not publish comparable tool-output byte measurements, so the 37,716-byte C value has no A/B comparison.

These are one-run measurements. C returned the requested linked coverage, but had more failed retrieval attempts than A and did not capture #155's native blocker detail in its final result. The data do not establish repeatability, equivalent completeness, or a general advantage for deterministic filtering. They support no architecture or Harness decision.

## Sources

- [Issue #153](https://github.com/lehater/napms-2/issues/153), [Issue #155](https://github.com/lehater/napms-2/issues/155), and [Issue #156](https://github.com/lehater/napms-2/issues/156).
- Merged outcome PRs: [#160](https://github.com/lehater/napms-2/pull/160), [#162](https://github.com/lehater/napms-2/pull/162), and [#164](https://github.com/lehater/napms-2/pull/164).
- A/B measurements and method: [Experiment 01](../2026-11-22-github-delegation-retest/report.md) and [`measurements.csv`](../2026-11-22-github-delegation-retest/measurements.csv).
- C measurements were derived from the completed local Codex rollout journal for the single participant. No raw prompt or tool output is included.
