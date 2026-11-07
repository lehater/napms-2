"""Run the local DeepEval GEval pilot against saved implementation files.

Usage (isolated venv, explicit installed Ollama model):
    python experiments/sdlc-03/run_geval.py \
        --candidate /path/to/policy_csv.py \
        --negative /path/to/known-defective-policy_csv.py \
        --model <installed-ollama-model> \
        --out /tmp/napms-sdlc03-geval.json

This script does not execute either implementation or call any hosted LLM.
The negative control MUST be separately labeled; never pretend it was Codex output.
"""

import os

# Must be set before importing DeepEval; avoid loading project secrets.
os.environ["DEEPEVAL_DISABLE_DOTENV"] = "1"
os.environ["DEEPEVAL_TELEMETRY_OPT_OUT"] = "1"

import argparse
import hashlib
import json
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path


def digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="SDLC-03 offline GEval pilot")
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--negative", type=Path, required=True)
    parser.add_argument("--model", required=True, help="Explicit locally installed Ollama model")
    parser.add_argument("--out", type=Path, required=True, help="Local JSON output (not a repository path)")
    parser.add_argument("--repeats", type=int, default=3)
    args = parser.parse_args()

    if args.repeats < 2 or args.repeats > 10:
        parser.error("--repeats must be between 2 and 10")
    if not args.candidate.is_file() or not args.negative.is_file():
        parser.error("Both implementation files must exist")
    if args.out.resolve().is_relative_to(Path.cwd().resolve()):
        parser.error("Write the result outside the working repository")

    contract = (Path(__file__).parent / "contract.md").read_text(encoding="utf-8")
    sources = {
        "candidate_codex": args.candidate.read_bytes(),
        "negative_control_manual": args.negative.read_bytes(),
    }
    if sources["candidate_codex"] == sources["negative_control_manual"]:
        parser.error("Control and candidate must differ")

    # Imports are kept inside main so --help works in a clean checkout.
    from deepeval.metrics import GEval
    from deepeval.models import OllamaModel
    from deepeval.test_case import LLMTestCase, SingleTurnParams

    model = OllamaModel(
        model=args.model, base_url="http://localhost:11434", temperature=0
    )
    steps = [
        "Read actual_output as the source code of render_policy_csv; analyze its executable behavior, not its docstrings or claims.",
        "Compare actual_output to expected_output: header, column order, sorting, newline and standard CSV escaping.",
        "Check validation of all four required fields, string types, allowed decision values, ValueError and no raw value leakage in error messages.",
        "Check that every exported cell beginning with = + - @ is prefixed with one apostrophe, including request_id, and that additional keys never appear.",
        "Give a high score only when all contractual obligations hold; explain specific likely violations with evidence from the code. If uncertain, state uncertainty explicitly.",
    ]
    results = {
        "protocol": "SDLC-03 GEval / final Python source only; not a Codex trajectory",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "model": args.model,
        "temperature": 0,
        "deepeval_version": version("deepeval"),
        "repeats": args.repeats,
        "metric": "GEval with fixed evaluation_steps",
        "contract_sha256": digest(contract.encode("utf-8")),
        "items": [],
    }
    failed = False
    for label, raw in sources.items():
        result = {
            "label": label,
            "sha256": digest(raw),
            "trials": [],
        }
        case = LLMTestCase(
            input="Evaluate a Python implementation of the specified synthetic CSV policy exporter.",
            actual_output=raw.decode("utf-8"),
            expected_output=contract,
        )
        for trial_index in range(args.repeats):
            metric = GEval(
                name="SDLC03ContractReview",
                evaluation_steps=steps,
                evaluation_params=[
                    SingleTurnParams.INPUT,
                    SingleTurnParams.ACTUAL_OUTPUT,
                    SingleTurnParams.EXPECTED_OUTPUT,
                ],
                model=model,
                async_mode=False,
                threshold=0.5,
            )
            try:
                metric.measure(case)
                trial = {
                    "trial": trial_index + 1,
                    "score": metric.score,
                    "reason": metric.reason,
                }
            except Exception as exc:
                failed = True
                # Avoid accidentally recording secret-bearing exception details.
                trial = {
                    "trial": trial_index + 1,
                    "error_type": type(exc).__name__,
                }
            result["trials"].append(trial)
        results["items"].append(result)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(results, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "result_path": str(args.out),
        "deepeval_version": results["deepeval_version"],
        "model": args.model,
        "trial_count": sum(len(item["trials"]) for item in results["items"]),
        "failed_trials": sum(
            "error_type" in trial
            for item in results["items"]
            for trial in item["trials"]
        ),
    }, ensure_ascii=False))
    return 2 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
