## Derived measurements

Selection was complete: 18 pages across four authorized session scopes, 1,583 rows fetched, and 1,335 retained after exact `issueId`/`runId` matching. No failures were reported. The Explorer used one sample GET within the authorized scope to check usage field semantics, then completed a fresh full traversal. It made **37 Langfuse GET requests** across three shell invocations; the final traversal took **3.075 seconds**. Whole-session elapsed time and per-session page counts were not retained.

Model observations were counted when `model` was non-empty. Operation durations exclude those observations. Duration tuples are count / median / p90 / max seconds; token tuples are input / cached input / output / reasoning output / total.

| Issue | Observations / model calls | Tokens | Max prompt estimate; cached share | Prompt sequence min–max |
|---|---:|---|---:|---:|
| 153 | 186 / 93 | 222,619 / 12,540,928 / 45,344 / 28,434 / 12,837,325 | 216,609; 98.26% | 21,284–216,609 |
| 126 | 470 / 235 | 584,230 / 31,485,952 / 46,523 / 99,831 / 32,216,536 | 244,436; 98.18% | 18,946–244,436 |
| 168 | 679 / 339 | 817,302 / 44,535,808 / 72,953 / 199,942 / 45,626,005 | 244,107; 98.20% | 19,008–244,107 |

Token totals reconcile as the sum of the four reported usage fields. Max prompt estimate is the maximum per model observation of input plus cached input; cached share is cached input divided by input plus cached input.

**Operation durations by type:**

- Issue 153: AGENT 5 / 328.162 / 636.31 / 636.31; TOOL 88 / 0.136 / 3.314 / 10.171.
- Issue 126: AGENT 3 / 467.536 / 2,914.903 / 2,914.903; TOOL 232 / 0.8475 / 5.01 / 30.009.
- Issue 168: AGENT 6 / 1,219.6045 / 2,189.325 / 2,189.325; TOOL 334 / 1.4555 / 30.016 / 31.01.

**Prompt reductions of at least 50,000 tokens:**

- Issue 153: none.
- Issue 126: 244,436→21,609 (−222,827); 243,985→20,188 (−223,797).
- Issue 168: 230,929→22,075 (−208,854); 232,202→23,175 (−209,027); 233,778→32,994 (−200,784); 234,348→34,089 (−200,259); 235,030→35,448 (−199,582); 240,932→21,605 (−219,327); 244,107→23,792 (−220,315).

Prompt reductions are observed; their cause is uncertain. No explicit compaction marker appeared in the approved fields, so compaction is only a hypothesis. The Explorer did not retain per-session page counts or whole-analysis elapsed time.

I used exactly one Explorer and made no Langfuse requests. Local journal metadata did not expose the active model or reasoning mode, so I could not independently verify the effective settings.