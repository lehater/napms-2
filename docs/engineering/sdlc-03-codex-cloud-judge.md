# SDLC-03 — минимальная облачная проверка DeepEval через Codex CLI

**Status:** experimental integration, unverified on owner WSL2. **Date:** 2026-11-07.  
**Context:** [Issue #9](https://github.com/lehater/napms-2/issues/9); [first Ollama run](sdlc-03-geval-results.md) had 3 candidate timeouts and 3 negative-control scores at 0.5.

## Goal and responsibilities

- **DeepEval GEval** retains the rubric, test case and metric implementation.
- **Codex CLI** provides the *cloud judge model*, using its already configured ChatGPT login rather than direct OpenAI API keys.
- **Adapter** `experiments/sdlc-03/codex_cli_judge.py` implements DeepEval's official `DeepEvalBaseLLM` interface; every `generate()` starts one ephemeral Codex CLI session in a separate temporary directory with `--sandbox read-only`, `--output-schema` when requested and a per-call timeout. The code under test is passed as prompt content, not executed by the judge.
- **Verifier** remains the deterministic [12-case independent oracle](../../experiments/sdlc-03/check_contract.py). A judge's natural-language explanation is separate from binary test success.

## Limits

1. **This is not a pre-existing officially supported DeepEval/Codex integration.** It is a small proof-of-concept adapter built on *documented* extension points, and must first pass a smoke test. Do not add it as a permanent gate without demonstrating utility.
2. A ChatGPT-authorized Codex CLI turn consumes applicable **Codex plan allowances / credits**; it is not the same as direct OpenAI API usage. Direct `deepeval` OpenAI provider requires an API key and separately billed API account.
3. Actual Codex model comes from CLI config and is **not explicitly frozen in this adapter**. The result records this limitation; capture `codex --version` and the active configured model without sharing tokens. No guarantee of numeric `temperature=0` for Codex CLI; results record temperature `null`.
4. The agent has read-only sandbox and a temporary working directory, but it is still an agent rather than a simple LLM endpoint. We instruct no tool use; **we do not claim that tools are structurally disabled**. Judge prompts contain only synthetic public fixtures. The CLI may see user-level MCP/config; keep untrusted/private material out of the prompt.
5. `GEval` may call `generate()` more than once per trial. The adapter timeout is **per Codex CLI subprocess**, not total experiment. Errors are recorded by type; no automatic retries; original local Ollama outputs remain unchanged.

## First minimal smoke test — only one saved positive sample

Check first that no previous local judge run remains active. In WSL2:

~~~bash
cd /home/alex/projects/napms-2
git fetch origin
git pull --ff-only
codex login status
python3 experiments/sdlc-03/check_contract.py experiments/sdlc-03/policy_csv.py

# No Ollama, no API key, no new pip packages. At most one GEval sample.
DEEPEVAL_DISABLE_DOTENV=1 DEEPEVAL_TELEMETRY_OPT_OUT=1 \
/tmp/napms-sdlc03-venv/bin/python experiments/sdlc-03/run_geval.py \
  --judge codex-cli --model codex-cli --judge-timeout 120 \
  --only candidate_codex --repeats 1 \
  --candidate experiments/sdlc-03/policy_csv.py \
  --negative experiments/sdlc-03/negative_control.py \
  --out /tmp/napms-sdlc03-geval-codex-candidate.json
~~~

Inspect the local JSON, including `items[0].trials[0].score`, `reason`, `error_type`, `elapsed_seconds`. If an exception occurs, **stop and report the error type**; do not spend more turns automatically.

**Only if smoke succeeds**, evaluate one saved negative sample under the identical conditions, changing `--only negative_control_manual` and `--out /tmp/napms-sdlc03-geval-codex-negative.json`.

### Acceptance for proof of concept

Both samples produce a score and reason, and reasons correctly distinguish the fixed verified contract from the deliberate formula-injection omission. Assess the **binary threshold** separately: `threshold=0.5` incorrectly accepted a defective Ollama score at 0.5, so judge verbosity alone is insufficient. Compare run latency and availability, but do not compare numerical scores across judge models as if calibrated to one scale.

## Sources

- [DeepEval custom LLM interface](https://deepeval.com/guides/guides-using-custom-llms)
- [Codex exec structured responses and saved authentication](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Codex CLI reference](https://learn.chatgpt.com/docs/cli/reference)
- [Separate ChatGPT and OpenAI API billing](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform)
