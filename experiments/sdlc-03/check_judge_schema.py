"""Offline strict-schema regression checks. No Codex call, no network.

Run in the existing DeepEval venv:
  /tmp/napms-sdlc03-venv/bin/python -m unittest discover \
    -s experiments/sdlc-03 -p 'check_judge_schema.py' -v
"""
import json
import unittest

from pydantic import BaseModel

from codex_cli_judge import strict_output_schema


class NestedEvidence(BaseModel):
    observation: str
    detail: str | None = None


class EvaluationReply(BaseModel):
    score: float
    reason: str | None = None
    evidence: list[NestedEvidence] = []


class StrictSchemaChecks(unittest.TestCase):
    def test_requires_all_fields_and_closes_nested_objects(self):
        converted = strict_output_schema(EvaluationReply)
        self.assertEqual(converted["type"], "object")
        self.assertEqual(converted["required"], ["score", "reason", "evidence"])
        self.assertFalse(converted["additionalProperties"])
        self.assertEqual(
            converted["$defs"]["NestedEvidence"]["required"],
            ["observation", "detail"],
        )
        self.assertFalse(
            converted["$defs"]["NestedEvidence"]["additionalProperties"]
        )

    def test_removes_defaults_but_preserves_nullable_fields_and_refs(self):
        converted = strict_output_schema(EvaluationReply)
        self.assertNotIn("default", json.dumps(converted))
        self.assertIn(
            {"type": "null"},
            converted["properties"]["reason"]["anyOf"],
        )
        self.assertEqual(
            converted["properties"]["evidence"]["items"]["$ref"],
            "#/$defs/NestedEvidence",
        )
        # DeepEval can still validate structured output against its own model.
        candidate = EvaluationReply.model_validate_json(
            '{"score":0.7,"reason":null,"evidence":[]}'
        )
        self.assertEqual(candidate.score, 0.7)

    def test_rejects_non_object_root(self):
        class NotAnObject:
            @staticmethod
            def model_json_schema():
                return {"type": "array", "items": {"type": "string"}}

        with self.assertRaisesRegex(ValueError, "root must be"):
            strict_output_schema(NotAnObject)


if __name__ == "__main__":
    unittest.main()
