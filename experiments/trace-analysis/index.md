# Agent Trace Analysis Capability Map — v0.6
Status: experimental; owner authorized initial pilot 2026-11-22. Context: #150, accepted #153 and #156; #169 aggregate review is separate and unchanged. This is a catalog of capabilities, not an accepted Harness policy.

| ID | Capability | Source lead | Pilot order | Local result |
|---|---|---|---|---|
| F02 | Pattern detection | [Graphectory](https://arxiv.org/html/2512.02393), §3.4 | 1 | [run-001](F02-pattern-detection/run-001.md): PARTIAL, patterns unknown; [run-002](F02-pattern-detection/run-002.md): PARTIAL; 0 eligible reads, 22/36 command events unknown. RV/SC paused; [run-003](F02-pattern-detection/run-003.md) PASS exact-repeat prefilter: 35/35 eligible, 0 candidates; [run-004 plan](F02-pattern-detection/run-004-plan.md) larger attempt (not RV/SC) |
| F15 | Skill discovery | [SKILL-DISCO](https://aclanthology.org/2026.findings-emnlp.2260/), [Agent Workflow Memory](https://proceedings.mlr.press/v267/wang25bx.html) | High, after F02 | Not tested |
| F16 | Deterministic offloading | [FlashScript](https://arxiv.org/abs/2610.33876), [TraceCompiler](https://www.alphaxiv.org/abs/2608.02680) | Candidate discovery | [run-001](F16-deterministic-offloading/run-001.md): BLOCKED (not isolated); [run-002](F16-deterministic-offloading/run-002.md): PARTIAL, three report-derived candidates; [run-003](F16-deterministic-offloading/run-003.md) native review; [run-005](F16-deterministic-offloading/run-005.md) PASS native retrieval, effect unmeasured |
| F17 | Existing skill utilization analysis | Source/method to be researched | High, after F02 | Not tested |
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

## F02 review and decision (2026-11-22)

Both pilots were reviewed by the coordinator. Run-001 stopped during preparation; run-002 paired all 35 wrapper calls and linked all 36 command events, but 22/36 remained unknown and no eligible read pairs were evaluated. Three synthetic range-predicate checks passed; this is not validation of the detector on real traces. The main observed bottleneck is extraction/classification coverage (the cohort may also lack applicable reads). Pause F02 rather than build a general parser. Retain both reports and resume only with a low-cost route to recognized actions and an appropriate cohort. CI status on final report head remains unknown. No defect or efficiency claim. F16 source review and candidate discovery continued in F16 run-001/run-002; F02 overhead is not proven savings.

## Procedure reuse and deterministic offloading

Owner approved adding F15–F17 on 2026-11-22. These are candidates for analysis on existing successful and failed executions, not a decision to create skills or scripts.

| ID | Question / input | Output / validation |
|---|---|---|
| F15 | Which recurring successful procedures have stable intent, inputs/outputs and reusable steps? Input: multiple comparable trajectories. | Candidate skill with evidence of recurrence, boundaries and exceptions; distinguish existing skills from missing ones. |
| F16 | Which segments have explicit inputs, deterministic transformations or checks, and verifiable outputs? Input: tool/action sequences and dependencies. | Candidate script or existing native command; identify semantic decisions, verification oracle, expected savings and maintenance cost. Verify behavioral equivalence before adoption. |
| F17 | Where did the agent reconstruct an available applicable skill rather than use it? Input: trace plus skill catalog/instructions at execution time. | Evidence-backed missed-use candidate; verify applicability, availability, invocation evidence and legitimate reasons for non-use; missing evidence remains unknown. |

F02 run-001 preparation overhead is a lead for F16, not evidence of recurrence or measured savings. Further source verification, algorithm selection and adaptation are pending; F17 is a proposed capability, not an established published algorithm. F16 report-based candidate discovery produced C1–C3; C1 official CLI now demonstrated on one exact attempt (run-005); direct trace-level candidate discovery and measured effect remain pending. Order of F15/F17 remains provisional; these high-priority candidates are considered before other unstarted pilots. Existing F05/F04/F10/F13 order remains relative to one another. No automatic generation or deployment of skills/scripts.

Source leads and ordering beyond F02 are provisional, not verified local evidence. F02: Liu et al., OOPSLA 2026, DOI 10.1145/3798271; authors studied 4,000 trajectories on SWE-agent/OpenHands, not Codex. Combined monitoring/interventions improved resolution rates by 6.9–23.5% on selected problematic cases; this does not validate our adapted detector. Original catalog has nine patterns, first pilot limits itself to two. See [method](F02-pattern-detection/method.md).

Coordinator (ChatGPT) owns method, evidence review and decisions; local Codex CLI executes prescribed data operations and records findings; owner relays handoff. Do not change product, Harness, policies or dependencies. Store only privacy-safe evidence in this public repo; keep raw traces local. Git versions methods and reports. No automation or global ranking claims before pilot review.
