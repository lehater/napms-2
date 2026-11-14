import unittest
from pathlib import Path

from check_output import matches_contract


class AcceptanceContractTests(unittest.TestCase):
    def test_worker_output_matches_all_three_lines(self) -> None:
        content = Path("pilot/output.md").read_text(encoding="utf-8")
        self.assertTrue(matches_contract(content))

    def test_nonblank_separator_is_rejected(self) -> None:
        content = "# OpenCode pilot output\nnot blank\nWorker wrote the bounded pilot artifact.\n"
        self.assertFalse(matches_contract(content))

    def test_extra_line_is_rejected(self) -> None:
        content = "# OpenCode pilot output\n\nWorker wrote the bounded pilot artifact.\nunexpected\n"
        self.assertFalse(matches_contract(content))


if __name__ == "__main__":
    unittest.main()
