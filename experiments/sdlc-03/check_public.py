"""Intentionally limited public checks for the SDLC-03 synthetic exercise."""

import unittest

from policy_csv import render_policy_csv


class PublicChecks(unittest.TestCase):
    def test_empty_export(self) -> None:
        self.assertEqual(
            render_policy_csv([]),
            "request_id,decision,source,destination\n",
        )

    def test_order_and_standard_csv_quoting(self) -> None:
        rows = [
            {
                "request_id": "r2",
                "decision": "DENY",
                "source": "east,zone",
                "destination": "west",
                "token": "DO_NOT_EXPORT",
            },
            {
                "request_id": "r1",
                "decision": "ALLOW",
                "source": "north",
                "destination": "south",
            },
        ]
        self.assertEqual(
            render_policy_csv(rows),
            "request_id,decision,source,destination\n"
            "r1,ALLOW,north,south\n"
            'r2,DENY,"east,zone",west\n',
        )


if __name__ == "__main__":
    unittest.main()
