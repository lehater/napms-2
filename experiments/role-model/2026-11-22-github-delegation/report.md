# Role Model Experiment 01 — GitHub Delegation

**Run date:** 2026-11-22 UTC
**Arms:** one run each; model override requested as `gpt-5.6-luna`; reasoning effort set to `medium` where the runtime API exposed it.
**Outcome:** both arms produced source-linked summaries covering all three Issues. The experiment does not establish that delegation reduced the controller's maximum prompt: participant-level Langfuse attribution was unavailable, and B's controller performed additional direct verification.

## Findings

| Issue | Purpose and accepted decisions | Constraints and final artifacts | Relationship |
|---|---|---|---|
| [#153](https://github.com/lehater/napms-2/issues/153) | Define an evidence-first method for recording and classifying Findings. Keep deterministic and manual evidence as the initial approach; distinguish normal probe/TDD activity, execution failures, evidence-backed problems, and hypotheses. The result did not recommend a mandatory LLM judge or a new analyzer/taxonomy gate. | No synthetic or paid runs, raw/private trace publication, or unsupported FP/FN claims. Documentation artifact: [`sdlc-150-issue-153.md`](https://github.com/lehater/napms-2/blob/f26f16778b81eef63f0d67506620e49f48a3f219/docs/engineering/sdlc-150-issue-153.md), delivered in [merged PR #160](https://github.com/lehater/napms-2/pull/160) (merge commit `de05720f5aa16f9833897fc045acd8cf2509973a`). | Child of [#150](https://github.com/lehater/napms-2/issues/150); no native blockers reported. |
| [#155](https://github.com/lehater/napms-2/issues/155) | Define how to assess whether an accepted Harness change works: link a baseline to a defect and change/version, then compare ordinary post-change observations and classify the result as confirmed, mitigated, unknown, or regression. Separate delivery/CI evidence from evidence of effect. | No arbitrary run-count threshold, mandatory A/B, new telemetry/dashboard/gate, or Langfuse-based subscription-cost claims. Documentation artifact: [`sdlc-150-issue-155.md`](https://github.com/lehater/napms-2/blob/9b6d703909e1c95bc42ab6fb5de7e7b1e04ff55d/docs/engineering/sdlc-150-issue-155.md), delivered in [merged PR #162](https://github.com/lehater/napms-2/pull/162) (merge commit `c71c16edd698a6ec5f800c879d64ce7869107f0c`). | Child of #150; no native blockers reported. The result leaves the effect of earlier changes unknown where comparable observations are absent. |
| [#156](https://github.com/lehater/napms-2/issues/156) | Combine the upstream contracts into a minimal, on-demand, read-only analytics pilot. Analytics supplies evidence; it does not own product changes. Start with the least-cost safe approach and automate only after value is demonstrated. | No auto-write, scheduler, dashboard, new service/MCP, permission/network expansion, or publication of raw/private traces. Documentation artifact: [`sdlc-150-issue-156.md`](https://github.com/lehater/napms-2/blob/ddd11d9a2cdba12e089e6b4bc279f39700a133be/docs/engineering/sdlc-150-issue-156.md), delivered in [merged PR #164](https://github.com/lehater/napms-2/pull/164) (final head `ddd11d9a2cdba12e089e6b4bc279f39700a133be`, merge commit `bc17c3c5207f41ed52819aa06895898247fca2c9`). | Child of #150; initially blocked by upstream Issues #151–#155. It consumes their completed outcomes. |

All three are documentation outcomes under #150. Issues #153 and #155 provide upstream research/evaluation contracts; #156 combines those contracts with #151–#154 into a pilot plan. The artifacts explicitly defer product or automatic Harness changes.

## Run quality

Both arms returned findings for all 3/3 Issues, with purpose, decisions, constraints, artifact links, and relationships represented. The A and B summaries agree on the PR mapping and final artifact paths. This is a coverage and cross-run consistency check, not a formal accuracy score or independent adjudication of every sentence. A single run per arm is insufficient to estimate repeatability.

Arm B did use a separate helper for initial fact gathering. Its controller then made 12 additional GitHub connector calls to verify the Issues and PRs. Those calls are included in B's actual effort and mean B was not a pure delegated-only retrieval path. The helper returned six compact messages (4,720 UTF-8 bytes in the measured readback, including the wrapper). No secrets, raw traces, or raw prompts are included here.

## Measurements and limits

See [`measurements.csv`](measurements.csv) for arm-level and unattributed telemetry measurements.

- A reported 18 GitHub connector calls. B's helper reported 22 GitHub connector calls across 9 orchestration calls; B's controller added 12 GitHub connector calls. These are reported invocation counts, not Langfuse-attributed counts.
- The experiment participants' maximum prompt, summed tokens, model-call totals, and complete session duration are `Unknown`: the available Langfuse data could not be joined reliably to these specific participants. An unassigned trace appeared in the broad time window, so it is excluded from both arms.
- The orchestration call explicitly assigned `gpt-5.6-luna` and `medium` to A and B's controller. The helper session accepted a `gpt-5.6-luna` model override, but its creation interface had no separate reasoning-effort parameter. Effective helper effort is `Unknown`; therefore equal effective effort across every role was not verified.
- The requested pre-launch verification of every role's effective parameters was not completed for the helper. This is a protocol deviation; the measured comparison is exploratory and cannot establish the requested controlled result.
- A's start time was reported only approximately (19:14 UTC); its end was reported at 19:16:58 UTC. Its duration is approximate. B's helper duration was reported as 82.444 seconds; B controller wall-clock duration is `Unknown`.
- There was one delegated helper in B. A used no helper. B's helper's model-call count and token usage remain `Unknown`.

The result confirms that delegation can return a compact, source-linked fact set, but it cannot answer whether it reduces controller context while preserving quality. The required comparable prompt and token measurements are unavailable, and B incurred direct verification work. No architecture or Harness decision follows from this experiment.
