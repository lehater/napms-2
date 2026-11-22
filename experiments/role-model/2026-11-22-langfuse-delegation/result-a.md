## Facts

Selection used the supplied session filters. I retained rows only when `metadata.issueId` and `metadata.runId` exactly matched the corresponding scope. All cursor pages were followed to completion. The same query was run twice to correct a local usage-field mapping; that was 36 Langfuse GET requests total: 18 per pass, covering 2 pages for Issue 153, 5 for Issue 126, and 11 for Issue 168 on each pass. The scoped query passes took **6.192 seconds** combined; this is query time, not the full conversation duration.

| Issue | Observations | Model calls¹ | Input | Cached input | Output | Reasoning output | Total | Max prompt estimate² | Cached share² |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 153 | 186 | 93 | 222,619 | 12,540,928 | 45,344 | 28,434 | 12,837,325 | 216,609 | 98.26% |
| 126 | 470 | 235 | 584,230 | 31,485,952 | 46,523 | 99,831 | 32,216,536 | 244,436 | 98.18% |
| 168 | 679 | 339 | 817,302 | 44,535,808 | 72,953 | 199,942 | 45,626,005 | 244,107 | 98.20% |

Token totals are sums of the corresponding Langfuse `usageDetails` fields. Each of the five fields was present on every model observation. Cached share is cached input ÷ (input + cached input).

**Operation durations** are in seconds; model observations are excluded. Distributions are grouped by observation type.

| Issue | Type | Count | Median | P90 | Max |
|---|---|---:|---:|---:|---:|
| 153 | TOOL | 88 | 0.136 | 3.287 | 10.171 |
| 153 | AGENT | 5 | 328.162 | 544.352 | 636.310 |
| 126 | TOOL | 232 | 0.847 | 5.010 | 30.009 |
| 126 | AGENT | 3 | 467.536 | 2,425.430 | 2,914.903 |
| 168 | TOOL | 334 | 1.456 | 30.016 | 31.010 |
| 168 | AGENT | 6 | 1,219.604 | 1,995.473 | 2,189.325 |

**Prompt estimates** are ordered by model-observation start time and calculated as input + cached input. Counts were 93, 235, and 339 respectively; the table gives each issue’s minimum and maximum.

- **153:** no adjacent reduction of at least 50,000 tokens.
- **126:** 244,436 → 21,609 (−222,827); 243,985 → 20,188 (−223,797).
- **168:** 230,929 → 22,075 (−208,854); 232,202 → 23,175 (−209,027); 233,778 → 32,994 (−200,784); 234,348 → 34,089 (−200,259); 235,030 → 35,448 (−199,582); 240,932 → 21,605 (−219,327); 244,107 → 23,792 (−220,315).

¹ Model-call criterion: observation `type` is exactly `GENERATION` (case-normalized).
² Prompt estimate and cached share use the reported `input` and `input_cached_tokens` values.

All requested sessions were fully paginated and all selected rows matched the exact issue/run metadata. The two sessions for Issue 168 contributed 60 and 619 observations. One observation in that scope had WARNING level and a nonempty status message; its text is not included here. The other observations were DEFAULT level. No input/output payloads were requested.

## Hypotheses and limitations

The large prompt estimate drops are observed changes in successive estimates. They may be consistent with compaction, but without an explicit compaction marker, the cause is only a hypothesis. The duration percentiles use linear interpolation. Effective model/reasoning settings were not observable to me; **gpt-6-luna / medium** is the requested setting, not a verified runtime setting.