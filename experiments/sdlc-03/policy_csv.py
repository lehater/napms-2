"""SDLC-03 synthetic exercise; see contract.md.

This fixture is intentionally incomplete until the bounded Codex run.
It is not imported by production code or the repository's normal test suite.
"""

from collections.abc import Mapping, Sequence


def render_policy_csv(rows: Sequence[Mapping[str, str]]) -> str:
    """Render synthetic policy decisions as a restricted CSV export."""
    raise NotImplementedError("SDLC-03 experiment: implement using contract.md")
