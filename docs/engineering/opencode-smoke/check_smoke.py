from pathlib import Path
import unittest


EXPECTED = b"# Role smoke\n\nBounded Worker write.\n"


def valid(content: bytes) -> bool:
    return content == EXPECTED


class SmokeTests(unittest.TestCase):
    def test_actual_artifact(self):
        self.assertTrue(valid(Path("/tmp/work/role-smoke.txt").read_bytes()))

    def test_reject_nonblank_separator(self):
        self.assertFalse(valid(b"# Role smoke\nx\nBounded Worker write.\n"))

    def test_reject_extra_content(self):
        self.assertFalse(valid(EXPECTED + b"extra\n"))

    def test_reject_missing_final_newline(self):
        self.assertFalse(valid(EXPECTED.rstrip(b"\n")))

    def test_reject_crlf_normalization(self):
        self.assertFalse(valid(EXPECTED.replace(b"\n", b"\r\n")))


if __name__ == "__main__":
    unittest.main()
