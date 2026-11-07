"""SDLC-03 synthetic exercise; see contract.md.

This fixture is intentionally incomplete until the bounded Codex run.
It is not imported by production code or the repository's normal test suite.
"""

from collections.abc import Mapping, Sequence
import csv
import io


def render_policy_csv(rows: Sequence[Mapping[str, str]]) -> str:
    """Render synthetic policy decisions as a restricted CSV export."""
    columns = ("request_id", "decision", "source", "destination")
    records = []
    for row in rows:
        if (
            not isinstance(row, Mapping)
            or any(column not in row for column in columns)
            or any(not isinstance(value, str) for value in row.values())
        ):
            raise ValueError("Invalid policy record")
        if row["decision"] not in ("ALLOW", "DENY"):
            raise ValueError("Invalid policy decision")
        records.append(tuple(row[column] for column in columns))

    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(columns)
    for record in sorted(records, key=lambda record: record[0]):
        writer.writerow(
            "'" + value if value.startswith(("=", "+", "-", "@")) else value
            for value in record
        )
    return output.getvalue()
