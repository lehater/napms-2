from pathlib import Path
import unittest


def valid(text):
    return text == "# Role smoke\n\nBounded Worker write.\n"


class SmokeTests(unittest.TestCase):
    def test_actual_artifact(self):
        self.assertTrue(valid(Path("/tmp/work/role-smoke.txt").read_text()))

    def test_reject_nonblank_separator(self):
        self.assertFalse(valid("# Role smoke\nx\nBounded Worker write.\n"))

    def test_reject_extra_content(self):
        self.assertFalse(valid("# Role smoke\n\nBounded Worker write.\nextra\n"))


if __name__ == "__main__":
    unittest.main()
