"""Issue #75: schema-level directed uniqueness and transactional legacy deduplication."""
import sqlite3
from uuid import uuid4

import pytest

from conftest import auth
from napms.dev import DEMO_REQUEST, IDS
from test_acceptance import decide


def legacy_duplicate(env, protocol="UDP", source_start=None, source_end=None, port=123):
    """Emulate a genuine v7 database with two Interactions for the same pair."""
    alias_id, revision_id = str(uuid4()), str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute("DROP INDEX unique_interaction_pair")
        c.execute("DROP TRIGGER register_interaction_revision")
        c.execute("""INSERT INTO interaction_meta
            (interaction_id,application_id,source_component_id,destination_component_id,purpose)
            VALUES (?,?,?,?,?)""",
            (alias_id, IDS["application"], IDS["sender"], IDS["receiver"], "legacy reason"))
        c.execute("""INSERT INTO interaction_revisions(
            id,interaction_id,application_id,source_component_id,destination_component_id,
            protocol,port_start,port_end,source_port_start,source_port_end)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (revision_id, alias_id, IDS["application"], IDS["sender"], IDS["receiver"],
             protocol, port, port, source_start, source_end))
    return alias_id, revision_id


def test_v7_duplicate_pair_consolidation_preserves_need_and_policy_provenance(env):
    db, _, _, client, _ = env
    alias_id, revision_id = legacy_duplicate(env)
    process_id = str(uuid4())
    with db.transaction(write=True) as c:
        c.execute("INSERT INTO processes(id,name) VALUES (?,?)", (process_id, "Legacy purpose"))
    requester, exporter = auth(env, "requester"), auth(env, "exporter")
    need = client.post(f"/business-processes/{process_id}/needs",
                       json={"interactionRevisionId": revision_id, "businessBasis": "Duplicate pair test"}, headers=requester)
    assert need.status_code == 201, need.text
    need_id = need.json()["connectivityNeedId"]
    request = client.post("/access-requests", json={
        **DEMO_REQUEST, "interactionRevisionId": revision_id, "connectivityNeedId": need_id,
    }, headers=requester)
    assert request.status_code == 201, request.text
    rule_id = decide(env, request.json())["policyRuleId"]
    before = client.get("/policy/export", params={"ruleId": rule_id}, headers=exporter).json()["rows"]
    assert len(before) == 1 and before[0]["ipProtocol"] == "UDP"

    with db.connect() as c:
        c.execute("PRAGMA user_version=7")
    db.initialize()
    db.initialize()
    with db.transaction() as c:
        assert c.execute("PRAGMA user_version").fetchone()[0] == 10
        assert c.execute("PRAGMA foreign_key_check").fetchall() == []
        assert c.execute("""SELECT COUNT(*) FROM interaction_meta WHERE application_id=?
            AND source_component_id=? AND destination_component_id=?""",
            (IDS["application"], IDS["sender"], IDS["receiver"])).fetchone()[0] == 1
        canonical = c.execute("""SELECT interaction_id FROM interaction_meta WHERE application_id=?
            AND source_component_id=? AND destination_component_id=?""",
            (IDS["application"], IDS["sender"], IDS["receiver"])).fetchone()[0]
        old_id = alias_id if canonical != alias_id else IDS["interaction"]
        alias = c.execute("SELECT canonical_id FROM interaction_aliases WHERE alias_id=?",
                          (old_id,)).fetchone()
        assert alias is not None and alias["canonical_id"] == canonical
        revisions = c.execute("""SELECT * FROM interaction_revisions WHERE interaction_id=?
            ORDER BY revision_number""", (canonical,)).fetchall()
        assert len(revisions) == 3
        assert {r["id"] for r in revisions[:2]} == {IDS["revision"], revision_id}
        assert len({r["revision_number"] for r in revisions}) == 3
        merged = revisions[-1]
        assert merged["traffic_clauses_json"] is not None
        assert c.execute("SELECT interaction_id FROM needs WHERE id=?", (need_id,)
                         ).fetchone()[0] == alias_id
        assert c.execute("SELECT interaction_revision_id FROM access_subjects WHERE id=?",
                         (request.json()["subjectId"],)).fetchone()[0] == revision_id
        assert c.execute("SELECT id FROM access_requests WHERE id=?",
                         (request.json()["requestId"],)).fetchone()[0] == request.json()["requestId"]

    history = client.get(f"/applications/{IDS['application']}/interactions/{alias_id}",
                         headers=requester)
    assert history.status_code == 200, history.text
    assert len(history.json()["revisions"]) == 3
    assert {c["ipProtocol"] for c in history.json()["revisions"][-1]["trafficClauses"]} == {"TCP", "UDP"}
    after = client.get("/policy/export", params={"ruleId": rule_id}, headers=exporter).json()["rows"]
    assert [{k:v for k,v in r.items() if k != "evaluationAt"} for r in after] == [
        {k:v for k,v in r.items() if k != "evaluationAt"} for r in before]
    options = client.get(f"/business-processes/{process_id}/needs/{need_id}/access-request-options?kind=revisions",
                         headers=requester).json()["items"]
    assert {v["interactionRevisionId"] for v in options} == {r["interactionRevisionId"] for r in history.json()["revisions"]}
    assert client.post("/access-requests", json={
        **DEMO_REQUEST, "interactionRevisionId": merged["id"], "connectivityNeedId": need_id,
    }, headers=requester).status_code == 201
    with pytest.raises(sqlite3.IntegrityError):
        with db.transaction(write=True) as c:
            c.execute("""INSERT INTO interaction_meta
                (interaction_id,application_id,source_component_id,destination_component_id,purpose)
                VALUES (?,?,?,?,?)""",
                (str(uuid4()), IDS["application"], IDS["sender"], IDS["receiver"], "duplicate"))


def test_v7_unsafe_overlapping_merge_rolls_back_without_data_loss(env):
    db = env[0]
    alias_id, rev_id = legacy_duplicate(env, protocol="TCP", source_start=1000,
                                        source_end=2000, port=443)
    with db.connect() as c:
        c.execute("PRAGMA user_version=7")
    with pytest.raises(RuntimeError, match="Cannot safely merge"):
        db.initialize()
    with db.connect() as c:
        assert c.execute("PRAGMA user_version").fetchone()[0] == 7
        assert c.execute("SELECT id FROM interaction_revisions WHERE id=?", (rev_id,)).fetchone()[0] == rev_id
        assert c.execute("SELECT interaction_id FROM interaction_meta WHERE interaction_id=?",
                         (alias_id,)).fetchone()[0] == alias_id
        assert not c.execute("SELECT name FROM sqlite_master WHERE name='unique_interaction_pair'").fetchone()
        assert c.execute("PRAGMA foreign_key_check").fetchall() == []
