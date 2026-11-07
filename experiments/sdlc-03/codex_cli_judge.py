"""Experimental DeepEval model adapter backed by the installed Codex CLI.

Uses Codex's existing authentication (including ChatGPT sign-in); it does not
expose authentication tokens or use the OpenAI API directly. This adapter is
NOT an officially supported DeepEval/Codex integration.

Each DeepEval generate() is a NEW, read-only ephemeral Codex turn in a new
temporary directory. It receives only the DeepEval prompt through stdin.
"""

import json
import subprocess
import tempfile
from pathlib import Path
from typing import Type

from deepeval.models import DeepEvalBaseLLM
from pydantic import BaseModel



class CodexCliInvocationError(RuntimeError):
    """Expose only classified CLI failure metadata; never raw stderr."""

    def __init__(self, category: str, exit_code: int | None = None):
        self.category = category
        self.exit_code = exit_code
        super().__init__(f"Codex CLI judge failure: {category}")


def classify_failure(stderr: str) -> str:
    text = stderr.lower()
    if any(term in text for term in (
        "invalid_json_schema", "invalid schema for response_format",
        "additionalproperties", "text.format.schema",
    )):
        return "output_schema_rejected"
    if any(term in text for term in (
        "unexpected argument", "unrecognized option", "unknown option",
        "invalid value for", "found argument",
    )):
        return "cli_argument_rejected"
    if any(term in text for term in (
        "usage limit", "rate limit", "quota exceeded", "insufficient quota",
    )):
        return "usage_limit"
    if any(term in text for term in (
        "unauthorized", "authentication", "not logged in",
    )):
        return "authentication"
    if any(term in text for term in ("model_not_found", "model not found")):
        return "model_unavailable"
    if any(term in text for term in ("permission denied", "sandbox violation")):
        return "permission"
    if any(term in text for term in (
        "connection refused", "connection failed", "proxy error",
        "certificate verify failed", "tls handshake",
    )):
        return "connectivity"
    return "unclassified_cli_error"


class CodexCliJudge(DeepEvalBaseLLM):
    def __init__(self, timeout_seconds: int = 120):
        self.timeout_seconds = timeout_seconds
        self.model = "codex-cli"

    def load_model(self):
        return self.model

    def get_model_name(self) -> str:
        return "codex-cli (configured ChatGPT sign-in/model)"

    def generate(
        self, prompt: str, schema: Type[BaseModel] | None = None
    ) -> str | BaseModel:
        with tempfile.TemporaryDirectory(prefix="napms-sdlc03-judge-") as directory:
            root = Path(directory)
            output = root / "codex-response.txt"
            cmd = [
                "codex", "exec",
                "--sandbox", "read-only",
                "--skip-git-repo-check",
                "--ephemeral",
                "--cd", str(root),
                "--output-last-message", str(output),
            ]
            if schema is not None:
                schema_path = root / "schema.json"
                schema_path.write_text(
                    json.dumps(schema.model_json_schema()), encoding="utf-8"
                )
                cmd += ["--output-schema", str(schema_path)]
            cmd.append("-")  # read user-supplied evaluation prompt from stdin
            try:
                completed = subprocess.run(
                    cmd,
                    input=(
                        "You are a code-evaluation judge, not a developer. "
                        "Only evaluate the provided prompt. Do not run tools, "
                        "inspect the filesystem or change any files. "
                        "Return only the requested answer, obeying the supplied "
                        "JSON schema when present.\n\n" + prompt
                    ),
                    text=True,
                    capture_output=True,
                    timeout=self.timeout_seconds,
                    check=False,
                )
            except subprocess.TimeoutExpired as exc:
                raise TimeoutError(
                    f"Codex CLI judge exceeded {self.timeout_seconds}s"
                ) from exc
            if completed.returncode != 0:
                # Only a bounded category and numeric exit code leave this adapter.
                # Stderr can include prompts, paths, tokens, or private config.
                raise CodexCliInvocationError(
                    classify_failure(completed.stderr),
                    exit_code=completed.returncode,
                )
            if not output.is_file():
                raise CodexCliInvocationError("missing_final_output")
            answer = output.read_text(encoding="utf-8")
            if schema is None:
                return answer
            return schema.model_validate_json(answer)

    async def a_generate(
        self, prompt: str, schema: Type[BaseModel] | None = None
    ) -> str | BaseModel:
        # GEval is explicitly instantiated with async_mode=False in this spike.
        return self.generate(prompt, schema)
