# Experiment 01 — Native Codex GitHub delegation retest

- **Date:** 2026-11-22 UTC
- **Codex CLI:** `0.171.0`
- **Runs:** one fresh session per arm
- **Status:** completed with native journal measurements

## Protocol

The task scope followed the prior [Experiment 01 report](../2026-11-22-github-delegation/report.md): produce source-linked summaries for Issues #153, #155, and #156 covering purpose, accepted outcome, constraints, final documentation artifacts, merged PRs, and relationships. That report did not publish its original raw prompt, so the same issue scope and result fields were reused.

- **A:** one coordinator obtained GitHub data directly with GitHub CLI `gh`.
- **B:** a fresh coordinator assigned the GitHub retrieval to exactly one native Explorer. The spawn call explicitly set `agent_type=explorer`, `model=gpt-6-luna`, `reasoning_effort=medium`, and `fork_turns=none`. The Explorer returned evidence links and a compact synthesis. The coordinator made no additional GitHub request and did not repeat the Explorer's searches.
- Both coordinators used the native CLI overrides `--model gpt-6-luna` and `model_reasoning_effort="medium"`. Journal settings confirm `gpt-6-luna / medium` for A, the B coordinator, and the B Explorer. The Explorer journal records the B coordinator as its parent, `agent_role=explorer`, and a separate thread. It made no descendant spawn call.

The preliminary capability probe and report preparation are excluded from both experimental sessions. The probe used a separate thread and confirmed that explicit model/effort overrides and `fork_turns=none` are accepted by the native subagent interface. No permanent Codex configuration, Harness, or Skill was changed. Langfuse was not used.

## Results

Both arms returned source-linked coverage of all three issues and their final merged documentation PRs. The separate final answers are in [`result-a.md`](result-a.md) and [`result-b.md`](result-b.md).

The answers agree on the issue-to-artifact/PR mapping and on the limits of the accepted work. A includes the specific #153 limitation that no privacy-safe independently labelled sample was available to estimate false positives or false negatives. B does not mention that detail. B explicitly states that #156 was blocked by and consumes #151–#155. This is a qualitative comparison of one output per arm, not an independent accuracy adjudication.

## Native journal measurements

| Arm / participant | Initial prompt input | Maximum prompt input | Input | Cached input | Output | Reasoning output | Total tokens | Model calls | Codex tool calls | GitHub CLI calls | Duration |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A coordinator | 19,809 | 37,056 | 223,302 | 192,128 | 2,541 | 271 | 225,843 | 8 | 7 | 19 | 74.867 s |
| B coordinator | 19,922 | 21,099 | 81,586 | 53,760 | 871 | 0 | 82,457 | 4 | 3 | 0 | 57.344 s |
| B Explorer | 19,605 | 32,126 | 162,490 | 129,408 | 1,376 | 263 | 163,866 | 6 | 5 | 4 | 37.478 s |
| **B all participants** | — | **32,126** | **244,076** | **183,168** | **2,247** | **263** | **246,323** | **10** | **8** | **4** | **94.822 participant-seconds** |

B's experiment wall-clock duration was 57.344 seconds. The participant-seconds sum includes the Explorer's overlapping work. A's duration was 74.867 seconds.

### Measurement method and counting

- Each participant is identified by its own native journal thread. The B Explorer shares the B session ID but has its own thread ID and explicit parent link. The thread IDs are recorded in `measurements.csv` for local journal attribution.
- Initial and maximum prompt inputs use `info.last_token_usage.input_tokens` from the first and largest model request in that thread. These counts include the runtime and available tool context, not only the user task text. They are request sizes, not the model's context-window capacity.
- Model-call counts use distinct `token_usage_record.response_id` values. For each thread, the count exactly matches both `token_usage_record` count and `event_msg.token_count` count; each token-count event's `last_token_usage` matches its corresponding usage record. Thus the count is validated against request records rather than inferred from `token_count` events alone.
- Token totals use only the final cumulative `thread_token_usage` snapshot per participant. Intermediate cumulative snapshots are not added. `cached_input_tokens` is a subset of input, `reasoning_output_tokens` is a subset of output, and `total_tokens = input_tokens + output_tokens`. B's aggregate sums the three thread totals once each.
- Codex tool calls count journaled invocations: seven shell calls in A; B has one spawn and two wait calls at the coordinator, plus four shell calls and one message call at the Explorer. GitHub CLI counts are the underlying `gh` invocations within those shell calls. A's 19 count is reconstructed from compound command sequences and their recorded outcomes. The B coordinator made zero additional GitHub queries.
- Agent payload volume counts UTF-8 message-body bytes in the native handoff: 1,124 bytes from coordinator to Explorer, 696 bytes in an interim Explorer message, and 2,755 bytes in the Explorer's final response, totaling 4,575 bytes. Tool metadata and journals are not included in this payload count.

## Comparison and limits

B's coordinator maximum prompt was 21,099 tokens, 43.1% below A's 37,056. B's maximum across participants was 32,126, 13.3% below A's maximum. B's aggregate usage was 246,323 tokens, 9.1% above A's 225,843, and B used 10 model calls across its participants versus A's 8. B also completed its coordinator's GitHub retrieval through four Explorer shell calls; A made 19 `gh` invocations across seven shell tool calls.

These are single runs of one research task. They show the measured context and usage for these sessions only. They do not establish repeatability, general quality equivalence, or an architectural/Harness decision. No raw journals, raw prompts, or GitHub payload dumps are included.

## Sources

- [Issue #153](https://github.com/lehater/napms-2/issues/153), [Issue #155](https://github.com/lehater/napms-2/issues/155), and [Issue #156](https://github.com/lehater/napms-2/issues/156).
- Merged outcome PRs: [#160](https://github.com/lehater/napms-2/pull/160), [#162](https://github.com/lehater/napms-2/pull/162), and [#164](https://github.com/lehater/napms-2/pull/164).
- Measurements were derived locally from the completed Codex rollout journals for the three participants. Only derived values are published here.
