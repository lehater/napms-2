# Langfuse delegation experiment

- **Date:** 2026-11-22 UTC
- **Repository / PR:** `lehater/napms-2`, [PR #176](https://github.com/lehater/napms-2/pull/176)
- **Runs:** one fresh `codex exec` session per configuration; B used one native Explorer
- **Codex CLI / Langfuse CLI:** `0.171.0` / `1.4.0`
- **Status:** completed; one material prompt-sequence error in both participant reports is corrected below using a deterministic post-session audit

## Protocol and sample boundary

Both measured coordinators were launched with `gpt-6-luna / medium`. Their local journals record that model and effort. B's coordinator explicitly spawned one `explorer` with `gpt-6-luna`, `medium`, and `fork_turns=none`; its journal records the matching parent thread. The Explorer had no descendants. A and B had hooks disabled for these invocations so the measured sessions made no telemetry writes. A queried Langfuse itself; B's coordinator made no Langfuse request and left retrieval and calculations to the Explorer.

Only Langfuse Observations API GET requests were used. Queries were bounded to the supplied session IDs, paginated to completion, and then filtered locally on **both exact** `metadata.issueId` and `metadata.runId`. No input/output payload fields were selected. The `--all` reads returned 186 rows for #153, 470 for #126, and 927 across the two #168 session scopes; exact metadata matching retained 186, 470, and 679 rows. Thus 248 rows under the #168 session IDs were outside the requested issue/run pair and excluded. This confirms why session ID alone is not a sufficient sample boundary.

| Issue | Work type | Run ID | Session ID(s) | Selected observations |
|---|---|---|---|---:|
| #153 | Research | `db02fc391bb2432b870be9feedba5d63` | `01a1f974-533f-7a40-9fe0-092bfced4837` | 186 |
| #126 | Implementation | `b4263d71cb3a4d50965d29dd35b8d249` | `01a1f919-4dc5-71b2-8717-3dbd4ce42cd5` | 470 |
| #168 | Telemetry analysis | `748165e4c8d2423f8819f57e4d0e25b9` | `01a1fec0-d859-7ef3-a3d5-b51dd9d7ece5`; `01a1fee2-4bfe-7282-98d7-26381e04757f` | 679 |

## Metric definitions

- An observation is one selected row. Model calls are `GENERATION` observations; B's Explorer used a non-empty model field, which yields the same counts for these rows.
- Langfuse `usageDetails` values are mutually exclusive buckets. Total tokens are `input + input_cached_tokens + output + output_reasoning_tokens`. The prompt estimate is `input + input_cached_tokens`; cached share is `input_cached_tokens / (input + input_cached_tokens)`. This matches Langfuse's current usage-bucket definition ([token and cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking)).
- Operation durations are `endTime - startTime` for non-generation observations, grouped by Langfuse observation type. Model observations are excluded. The canonical P90 uses linear interpolation; the audit reproduced this calculation. The B report did not state its percentile convention.
- Prompt estimates are ordered **within each session** by observation start time. A reduction is a decrease of at least 50,000 tokens between adjacent model observations. A reduction is an observation only; without an explicit marker, attributing it to compaction is a hypothesis.

## Telemetry measurements

| Issue | Observations (GENERATION / TOOL / AGENT) | Model calls | Input / cached / output / reasoning output | Total tokens | Max prompt estimate | Cached input share | TOOL duration: median / P90 / max (s) | AGENT duration: median / P90 / max (s) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| #153 | 186 (93 / 88 / 5) | 93 | 222,619 / 12,540,928 / 45,344 / 28,434 | 12,837,325 | 216,609 | 98.26% | 0.136 / 3.287 / 10.171 | 328.162 / 544.352 / 636.310 |
| #126 | 470 (235 / 232 / 3) | 235 | 584,230 / 31,485,952 / 46,523 / 99,831 | 32,216,536 | 244,436 | 98.18% | 0.848 / 5.010 / 30.009 | 467.536 / 2,425.430 / 2,914.903 |
| #168 | 679 (339 / 334 / 6) | 339 | 817,302 / 44,535,808 / 72,953 / 199,942 | 45,626,005 | 244,107 | 98.20% | 1.456 / 30.016 / 31.010 | 1,219.605 / 1,995.473 / 2,189.325 |

All selected #153 and #126 observations had `DEFAULT` level and no status message. In #168, 678 were `DEFAULT`; one was `WARNING` with a non-empty status message. Its text is intentionally omitted. No selected observation had `ERROR` level.

### Prompt sequences and observed reductions

| Issue / session | Model calls | Prompt estimate range | Reductions ≥50,000 tokens |
|---|---:|---:|---|
| #153 | 93 | 21,284–216,609 | None |
| #126 | 235 | 18,946–244,436 | 244,436 → 21,609 (−222,827); 243,985 → 20,188 (−223,797) |
| #168, `01a1fec0…` | 30 | 22,075–243,724 | 243,724 → 22,075 (−221,649) |
| #168, `01a1fee2…` | 309 | 19,008–244,107 | 240,932 → 21,605 (−219,327); 244,107 → 23,792 (−220,315) |

No explicit compaction marker was present in the approved fields. The prompt reductions are observed; compaction/reset is a possible explanation, not a confirmed cause.

## Local Codex journal measurements

The local journal checks found matching counts for `token_usage_record`, distinct response IDs, and `event_msg.token_count` in every participant. Token totals use each participant's final cumulative `thread_token_usage` snapshot. Cached input is a subset of input; uncached input is `input - cached`. Tool-result volume is the UTF-8 byte count of top-level tool outputs in the local participant journal. Durations use each journal's first-to-last event timestamp.

| Configuration / participant | Initial → max prompt; growth | Input / cached / uncached | Output / reasoning output / total | Model calls | Tool calls (exec / coordination) | Langfuse GETs | Tool-result bytes | Duration |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A coordinator | 20,280 → 40,234; +19,954 | 226,582 / 185,216 / 41,366 | 6,679 / 1,861 / 233,261 | 7 | 6 (6 / 0) | 36 | 64,482 | 136.447 s |
| B coordinator | 17,102 → 27,621; +10,519 | 292,659 / 274,944 / 17,715 | 2,620 / 409 / 295,279 | 12 | 11 (4 / 7) | 0 | 24,624 | 227.811 s |
| B Explorer | 19,768 → 35,845; +16,077 | 450,980 / 412,288 / 38,692 | 8,894 / 2,249 / 459,874 | 16 | 14 (10 / 4) | 37 | 28,230 | 193.092 s |
| **B, all participants** | **separate participant prompts; max 35,845** | **743,639 / 687,232 / 56,407** | **11,514 / 2,658 / 755,153** | **28** | **25 (14 / 11)** | **37** | **52,854** | **420.903 participant-seconds; 227.811 s wall clock** |

B's aggregate sums each participant's final totals once. Its participant-seconds include overlapping Explorer work; wall-clock duration is the B coordinator session duration. The inter-agent messages are encrypted in the local journal: 8,988 logged ciphertext bytes (4,256 coordinator-to-Explorer and 4,732 Explorer-to-coordinator). Plaintext message-body volume cannot be recovered from these journals and is reported as unavailable in `measurements.csv`.

A reported 36 GETs for two complete 18-page passes after correcting a local usage-field mapping. B's Explorer reported 37 GETs across three shell invocations, a sample read, and a final 18-page traversal; its report does not reconcile every request to a page/pass. The organizer's deterministic audit was outside A and B and used eight additional scoped GETs. Those audit requests are excluded from the participant metrics above.

## A/B quality comparison and independent audit

- **Completeness:** both arms reported complete pagination and exact issue/run metadata filtering. A/B selected row totals match the independent deterministic audit. The audit also confirmed 248 out-of-scope #168 rows were removed by the exact metadata filter.
- **Counts and tokens:** A, B, and the independent audit agree on all observation/model-call counts, usage sums, total tokens, max prompt estimates, and cached shares.
- **Durations:** medians and maxima agree. A's stated linear-interpolation P90 matches the audit. B did not state its quantile method and reports different P90 values where there are few observations (for example, its AGENT P90 equals the maximum for #153, #126, and #168). Use the canonical values in this report.
- **Prompt reductions:** both participant reports list seven reductions for #168 by combining calls from two sessions. That misses the real reduction in the 30-call session and adds five transitions across session boundaries. Sorting separately within each session yields the three reductions in the table above. This is the material analysis error in both runs.
- **Anomaly evidence:** A reported the #168 warning; B omitted it. The external GET-only audit confirmed one `WARNING` observation with a non-empty status message. The message is not published.
- **Limitations:** the observed prompt changes do not identify their cause. Observation-level duration includes the interval represented by each Langfuse observation and does not measure active operator time. B's encrypted inter-agent journal prevents a plaintext payload-size measurement. The experiment has one run per arm, so it does not establish repeatability or general quality equivalence.

The raw participant summaries are preserved in [`result-a.md`](result-a.md) and [`result-b.md`](result-b.md). This report records the post-session deterministic correction; the participant sessions were not resumed or given each other's results.

## Interpretation

B reduced the coordinator's maximum prompt from 40,234 to 27,621 tokens (31.3%); the maximum across B participants was 35,845 (10.9% below A's maximum). Its coordinator used 295,279 tokens, 26.6% more than A's entire 233,261-token session. Summing B's coordinator and Explorer once each gives 755,153 tokens, 3.24 times A, with 28 versus 7 model calls. B used 37 Langfuse GETs versus A's 36; its 420.903 participant-seconds overlapped to 227.811 seconds wall clock, versus A's 136.447 seconds.

For this single analysis, delegation lowered the coordinator's peak prompt while increasing aggregate token use and session time. Both arms made the same cross-session prompt-sequence error, and B omitted the warning anomaly. These observations describe only this run and do not support a general process or architecture decision.

## Sources and reproducibility

- Historical sample boundary and baseline: [`2026-11-22-baseline`](../2026-11-22-baseline/codex-role-model-trace-analysis-2026-11-22.md).
- Read procedure: [`.ai/langfuse-read-access.md`](../../../.ai/langfuse-read-access.md).
- Langfuse API selective-field and cursor-pagination guidance: [Observations API](https://langfuse.com/docs/api-and-data-platform/features/observations-api).
- Usage-bucket semantics: [Token and cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking).
- Participant-level journal measurements and formulas: [`measurements.csv`](measurements.csv).
