"""Pure invariants; addresses never participate in access identity."""
from dataclasses import dataclass
from datetime import datetime, timezone


class Problem(Exception):
    def __init__(self, status, code, message):
        self.status, self.code, self.message = status, code, message


def now():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def effective(grant, at):
    instant = datetime.fromisoformat(at)
    return ((grant["valid_from"] is None or datetime.fromisoformat(grant["valid_from"]) <= instant)
            and (grant["valid_until"] is None or instant < datetime.fromisoformat(grant["valid_until"])))


@dataclass(frozen=True)
class Subject:
    source: str
    destination: str
    revision: str


def validate_subject(source, destination, revision, need, source_component, destination_component):
    if (source["component_id"] != revision["source_component_id"]
            or destination["component_id"] != revision["destination_component_id"]
            or source_component["application_id"] != destination_component["application_id"]
            or source_component["application_id"] != revision["application_id"]
            or need["interaction_id"] != revision["interaction_id"]
            or need["component_id"] != source["component_id"]):
        raise Problem(400, "INVALID_SUBJECT", "Deployments, revision and Need do not correspond")
    return Subject(source["id"], destination["id"], revision["id"])
