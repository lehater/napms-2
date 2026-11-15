"""Contract tests for the additive, fail-closed ci-required job."""

import unittest

from ci_required import evaluate


class GateTests(unittest.TestCase):
    def setUp(self):
        self.base = {
            "EVENT": "pull_request", "IS_DRAFT": "false",
            "CHANGES": "success", "PLAN_MODE": "FULL",
            "CANDIDATE_SHA": "sha", "GITHUB_SHA": "sha",
            "DOCS_ONLY": "false", "APPLICATION": "success",
            "WEB": "success", "VALIDATE": "success", "SEMANTIC": "success",
        }

    def check(self, **changes):
        return evaluate({**self.base, **changes})

    def test_regular_ready_pr_passes(self):
        self.assertEqual(self.check(), (True, []))

    def test_ready_docs_only_with_explicit_skips_passes(self):
        self.assertTrue(self.check(
            DOCS_ONLY="true", APPLICATION="skipped", WEB="skipped",
            PLAN_MODE="SELECTED",
        )[0])

    def test_failed_test_job_blocks(self):
        self.assertFalse(self.check(APPLICATION="failure")[0])
        self.assertFalse(self.check(WEB="failure")[0])

    def test_cancelled_test_job_blocks(self):
        self.assertFalse(self.check(APPLICATION="cancelled")[0])
        self.assertFalse(self.check(WEB="cancelled")[0])

    def test_unexpected_skipped_job_blocks(self):
        self.assertFalse(self.check(APPLICATION="skipped")[0])
        self.assertFalse(self.check(WEB="skipped")[0])

    def test_docs_only_unexpectedly_ran_test_is_rejected(self):
        self.assertFalse(self.check(DOCS_ONLY="true", WEB="success",
                                    APPLICATION="skipped")[0])

    def test_failed_classifier_blocks_even_if_tests_pass(self):
        self.assertFalse(self.check(CHANGES="failure")[0])

    def test_missing_plan_blocks(self):
        self.assertFalse(self.check(PLAN_MODE="")[0])
        self.assertFalse(self.check(PLAN_MODE="UNKNOWN")[0])

    def test_stale_candidate_blocks(self):
        self.assertFalse(self.check(CANDIDATE_SHA="outdated")[0])
        self.assertFalse(self.check(CANDIDATE_SHA="")[0])

    def test_draft_always_blocks_including_docs_only(self):
        self.assertFalse(self.check(IS_DRAFT="true")[0])
        self.assertFalse(self.check(
            IS_DRAFT="true", DOCS_ONLY="true", APPLICATION="skipped", WEB="skipped"
        )[0])

    def test_missing_or_malformed_inputs_block(self):
        self.assertFalse(self.check(DOCS_ONLY="")[0])
        self.assertFalse(self.check(DOCS_ONLY="something")[0])
        self.assertFalse(self.check(EVENT="")[0])

    def test_semantic_and_validate_are_mandatory(self):
        self.assertFalse(self.check(SEMANTIC="failure")[0])
        self.assertFalse(self.check(VALIDATE="cancelled")[0])

    def test_manual_full_success(self):
        self.assertTrue(self.check(
            EVENT="workflow_dispatch", CHANGES="skipped",
            CANDIDATE_SHA="", PLAN_MODE="", DOCS_ONLY=""
        )[0])

    def test_manual_full_missing_test_or_unexpected_classifier_blocks(self):
        self.assertFalse(self.check(EVENT="workflow_dispatch", CHANGES="skipped",
                                    APPLICATION="skipped")[0])
        self.assertFalse(self.check(EVENT="workflow_dispatch",
                                    CHANGES="success")[0])


if __name__ == "__main__":
    unittest.main()
