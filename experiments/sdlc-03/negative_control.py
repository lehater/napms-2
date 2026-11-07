"""SDLC-03 NEGATIVE CONTROL, constructed manually after Codex completed.

Deliberate defect: unlike policy_csv.py, this implementation DOES NOT prefix
formula-like CSV cells. It should pass check_public.py but fail the
test_formula_prefixes_all_exportable_text_fields independent contract check.
This is NOT Codex output or production code.
"""
from collections.abc import Mapping, Sequence
import csv
import io


def render_policy_csv(rows: Sequence[Mapping[str, str]]) -> str:
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
        writer.writerow(value for value in record)
    return output.getvalue()
