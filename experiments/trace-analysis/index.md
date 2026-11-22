# Agent Trace Analysis Capability Map — v0.1
Status: experimental; owner authorized initial pilot 2026-11-22. Context: #150, accepted #153 and #156; #169 aggregate review is separate and unchanged. This is a catalog of capabilities, not an accepted Harness policy.

| ID | Capability | Source lead | Pilot order | Local result |
|---|---|---|---|---|
| F02 | Pattern detection | [Graphectory](https://arxiv.org/html/2512.02393), §3.4 | 1 | Planned: run-001 |
| F05 | Evidence–action analysis | [ImpasseBench](https://arxiv.org/html/2610.31895) | 2 | Not tested |
| F04 | Conformance checking | [AgentRx](https://github.com/microsoft/AgentRx) | 3 | Not tested |
| F10 | Flaw consolidation | [HarnessFix](https://arxiv.org/html/2606.06324) | 4 | Not tested |
| F13 | Harness responsibility mapping | HarnessFix | 5 | Not tested |
| F03 | Phase flow analysis | Graphectory | Later | Not tested |
| F07 | Outcome evaluation | [Anthropic Evals](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) | Later | Not tested |
| F14 | Failure classification | MAST / TRAIL | Later | Not tested |
| F08 | Failure attribution | AgentRx / Who&When | Later | Not tested |
| F09 | Dependency analysis | HarnessFix | Later | Not tested |
| F06 | Retrospective analysis (composite) | Retrospective Adaptation / GEPA | Later | Not tested |
| F11 | Comparative analysis (supporting method) | Graphectory | Later | Not tested |
| F01 | Statistical anomaly detection | log mining | Later | Not tested |
| F12 | Counterfactual analysis | causal replay | Later | Not tested |

Source leads and ordering beyond F02 are provisional, not verified local evidence. F02: Liu et al., OOPSLA 2026, DOI 10.1145/3798271; authors studied 4,000 trajectories on SWE-agent/OpenHands, not Codex. Combined monitoring/interventions improved resolution rates by 6.9–23.5% on selected problematic cases; this does not validate our adapted detector. Original catalog has nine patterns, first pilot limits itself to two. See [method](F02-pattern-detection/method.md).

Coordinator (ChatGPT) owns method, evidence review and decisions; local Codex CLI executes prescribed data operations and records findings; owner relays handoff. Do not change product, Harness, policies or dependencies. Store only privacy-safe evidence in this public repo; keep raw traces local. Git versions methods and reports. No automation or global ranking claims before pilot review.
