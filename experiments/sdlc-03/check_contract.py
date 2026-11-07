"""Post-run independent contract oracle for SDLC-03.

Revealed only AFTER the first Codex implementation was committed.
Usage:
    python3 experiments/sdlc-03/check_contract.py experiments/sdlc-03/policy_csv.py
    python3 experiments/sdlc-03/check_contract.py experiments/sdlc-03/negative_control.py
"""
from __future__ import annotations

import csv
import importlib.util
import io
import pathlib
import sys
import unittest

if len(sys.argv) != 2:
    raise SystemExit("Usage: python3 check_contract.py path/to/policy_csv.py")
module_path = pathlib.Path(sys.argv.pop()).resolve()
spec = importlib.util.spec_from_file_location("sdlc03_candidate", module_path)
if spec is None or spec.loader is None:
    raise SystemExit("Cannot load candidate module")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
render = module.render_policy_csv


def record(**kwargs):
    return {
        "request_id": "r1", "decision": "ALLOW",
        "source": "north", "destination": "south", **kwargs,
    }


def parse(s):
    return list(csv.reader(io.StringIO(s, newline="")))


class ContractOracle(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(render([]), "request_id,decision,source,destination\n")

    def test_header_and_sorted_order(self):
        self.assertEqual(
            parse(render([record(request_id="z"), record(request_id="a")])),
            [["request_id", "decision", "source", "destination"],
             ["a", "ALLOW", "north", "south"],
             ["z", "ALLOW", "north", "south"]],
        )

    def test_strips_unlisted_fields_without_leak(self):
        out = render([record(token="never-emit-token-91", credential="never-emit-secret-92")])
        self.assertNotIn("never-emit-token-91", out)
        self.assertNotIn("never-emit-secret-92", out)
        self.assertEqual(len(parse(out)[1]), 4)

    def test_formula_prefixes_all_exportable_text_fields(self):
        rows = [
            record(request_id="=cmd", source="+sum()", destination="@call()"),
            record(request_id="-x", source="=HYPERLINK()", destination="-2"),
        ]
        self.assertEqual(parse(render(rows)), [
            ["request_id", "decision", "source", "destination"],
            ["'-x", "ALLOW", "'=HYPERLINK()", "'-2"],
            ["'=cmd", "ALLOW", "'+sum()", "'@call()"],
        ])

    def test_formula_prefix_is_only_at_start(self):
        self.assertEqual(
            parse(render([record(request_id="r=x", source=" ok+1", destination="Z@")]))[1],
            ["r=x", "ALLOW", " ok+1", "Z@"],
        )

    def test_delimiter_quote_linebreak_roundtrip(self):
        row = record(request_id='Q"1', source="a,b", destination="first\nsecond\rthird")
        out = render([row])
        self.assertEqual(
            parse(out)[1],
            ['Q"1', "ALLOW", "a,b", "first\nsecond\rthird"],
        )
        self.assertTrue(out.endswith("\n"))
        self.assertNotIn("\r\n", out)

    def test_does_not_mutate_records_or_order(self):
        rows = [record(request_id="b"), record(request_id="a")]
        original = [x.copy() for x in rows]
        ids = [id(x) for x in rows]
        render(rows)
        self.assertEqual(rows, original)
        self.assertEqual([id(x) for x in rows], ids)

    def test_missing_required_field(self):
        for missing in ("request_id", "decision", "source", "destination"):
            with self.subTest(missing=missing):
                item = record()
                del item[missing]
                with self.assertRaises(ValueError):
                    render([item])

    def test_non_string_value(self):
        for key in ("request_id", "decision", "source", "destination"):
            with self.subTest(key=key):
                item = record()
                item[key] = 17
                with self.assertRaises(ValueError):
                    render([item])

    def test_invalid_decision(self):
        for value in ("allow", "MAYBE", "DENY ", "", "=ALLOW"):
            with self.subTest(decision=value):
                with self.assertRaises(ValueError):
                    render([record(decision=value)])

    def test_failure_message_must_not_expose_field_value(self):
        secret = "PRIVATE_value_never_publish_7123"
        for key in ("request_id", "decision", "source", "destination"):
            item = record()
            item[key] = 123
            with self.assertRaises(ValueError) as context:
                render([item])
            self.assertNotIn(str(item[key]), str(context.exception))
        with self.assertRaises(ValueError) as context:
            render([record(decision=secret)])
        self.assertNotIn(secret, str(context.exception))

    def test_trailing_lf_for_multiple_rows(self):
        out = render([record(request_id="b"), record(request_id="a")])
        self.assertEqual(out.count("\n"), 3)
        self.assertFalse(out.endswith("\n\n"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
