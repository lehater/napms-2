from pathlib import Path
import sys

EXPECTED_LINES = (
    "# OpenCode pilot output",
    "",
    "Worker wrote the bounded pilot artifact.",
)


def matches_contract(content: str) -> bool:
    return tuple(content.splitlines()) == EXPECTED_LINES


def main() -> int:
    content = Path("pilot/output.md").read_text(encoding="utf-8")
    if not matches_contract(content):
        print(f"FAIL: expected exactly {EXPECTED_LINES!r}; got {tuple(content.splitlines())!r}", file=sys.stderr)
        return 1
    print("PASS: bounded worker output matches all three acceptance lines")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
