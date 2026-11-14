from pathlib import Path

output = Path("pilot/output.md").read_text(encoding="utf-8").splitlines()
assert output[0] == "# OpenCode pilot output", "heading changed"
assert output[2] == "Worker wrote the bounded pilot artifact.", "worker content mismatch"
assert len(output) == 3, "unexpected extra content"
print("PASS: bounded worker output matches the acceptance criteria")
