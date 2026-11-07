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
                raise RuntimeError(
                    f"Codex CLI judge failed with exit code {completed.returncode}"
                )
            if not output.is_file():
                raise RuntimeError("Codex CLI judge produced no final output file")
            answer = output.read_text(encoding="utf-8")
            if schema is None:
                return answer
            return schema.model_validate_json(answer)

    async def a_generate(
        self, prompt: str, schema: Type[BaseModel] | None = None
    ) -> str | BaseModel:
        # GEval is explicitly instantiated with async_mode=False in this spike.
        return self.generate(prompt, schema)
