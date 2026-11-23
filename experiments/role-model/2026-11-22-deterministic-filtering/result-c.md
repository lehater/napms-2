# Result C — deterministic GitHub result filtering

Configuration C used one fresh `gpt-6-luna / medium` session and no subagents. The coordinator retrieved GitHub data directly and used Python 3/jq projections to pass selected fields and concise evidence lines to the model.

- **#153 — Findings methodology:** define an evidence-based method for turning real execution signals into verifiable Findings, with useful symptom groupings and explicit uncertainty. The accepted documentation recommends evidence-first manual review with deterministic facts. It does not introduce an analyzer, mandatory taxonomy, judge gate, paid model, or synthetic runs. No privacy-safe independently labelled sample supported a false-positive/false-negative estimate. The artifact is [`docs/engineering/sdlc-150-issue-153.md`](https://github.com/lehater/napms-2/blob/de05720f5aa16f9833897fc045acd8cf2509973a/docs/engineering/sdlc-150-issue-153.md), added by [merged PR #160](https://github.com/lehater/napms-2/pull/160) at `de05720f5aa16f9833897fc045acd8cf2509973a`. Issue #153 names #150 as its parent and reports no native blockers.

- **#155 — measuring effects of accepted improvements:** link a confirmed problem to its baseline, the accepted change/version, and ordinary follow-up observations; report outcomes such as confirmed, mitigated, unknown, or regression with sample coverage and uncertainty. The result does not establish effects without comparable evidence and avoids arbitrary run counts, mandatory A/B tests, new telemetry, and unsupported causal claims. The artifact is [`docs/engineering/sdlc-150-issue-155.md`](https://github.com/lehater/napms-2/blob/c71c16edd698a6ec5f800c879d64ce7869107f0c/docs/engineering/sdlc-150-issue-155.md), added by [merged PR #162](https://github.com/lehater/napms-2/pull/162) at `c71c16edd698a6ec5f800c879d64ce7869107f0c`. The issue names #150 as its parent. This C retrieval did not capture #155's native blocker detail; consult the linked issue/Project record rather than infer blockers from this summary.

- **#156 — minimal analytics pilot plan:** prepare an on-demand, read-only pilot that connects available evidence with Findings and GitHub outcomes, with privacy, quality, cost, and stop criteria. It defers live Langfuse access until version, Viewer access, permitted route/recipient, and a limit are confirmed. It authorizes no runtime automation, schedule, dashboard, auto-write, permission change, or product/Harness change. The artifact is [`docs/engineering/sdlc-150-issue-156.md`](https://github.com/lehater/napms-2/blob/bc17c3c5207f41ed52819aa06895898247fca2c9/docs/engineering/sdlc-150-issue-156.md), added by [merged PR #164](https://github.com/lehater/napms-2/pull/164) at `bc17c3c5207f41ed52819aa06895898247fca2c9`. Issue #156 names #150 as its parent and blockers #151–#155. The record does not establish that a live pilot ran or that effects were measured.

All three Issues are closed and marked Done in Project #6. These findings are based on the Issue records, linked PR metadata and summaries, and the accepted documentation paths. PRs #160/#162/#164 confirm merged status and file paths; their metadata summaries alone do not independently prove every acceptance detail.

## Evidence links

- [Issue #153](https://github.com/lehater/napms-2/issues/153) · [PR #160](https://github.com/lehater/napms-2/pull/160)
- [Issue #155](https://github.com/lehater/napms-2/issues/155) · [PR #162](https://github.com/lehater/napms-2/pull/162)
- [Issue #156](https://github.com/lehater/napms-2/issues/156) · [PR #164](https://github.com/lehater/napms-2/pull/164)

## Retrieval and coverage limits

The run encountered a missing `python` executable, an unsupported field in an initial PR query, and a jq regular-expression compile error before completing the reads with Python 3 and a simpler projection. These attempts are counted in the measurements. The result has linked coverage of all three outcomes, but #155 native blocker details were not captured in the measured run. The reports document #155 as a child of #150 with no native blockers based on the preceding A/B research; that relationship was not independently re-established by C.
