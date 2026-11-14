"""Issue #75: stable Interaction, immutable numbered revisions, owned clauses and policy fidelity."""
import csv
import io
import sqlite3

from conftest import auth
from napms.dev import DEMO_REQUEST, IDS
from test_acceptance import decide


def clause(protocol="UDP", source_start=None, source_end=None, destination=123):
    return dict(ipProtocol=protocol, sourcePortStart=source_start, sourcePortEnd=source_end,
                destinationPortStart=destination, destinationPortEnd=destination)


def create(client, requester, purpose="Time synchronization", clauses=None):
    return client.post(f'/applications/{IDS["application"]}/interactions',
                       headers=requester, json={
                           "sourceComponentId": IDS["sender"], "destinationComponentId": IDS["receiver"],
                           "purpose": purpose, "trafficClauses": clauses or [clause(), clause("TCP", 40000, 40100, 443)],
                       })


def test_owned_clauses_and_revision_publish_preserve_old_rules(env):
    db, _, _, client, _ = env
    requester, exporter = auth(env, "requester"), auth(env, "exporter")
    created = create(client, requester)
    assert created.status_code == 201, created.text
    body = created.json()
    interaction_id = body["interactionId"]
    rev1, = body["revisions"]
    assert body["purpose"] == "Time synchronization"
    assert rev1["revisionNumber"] == 1
    assert len(rev1["trafficClauses"]) == 2
    assert "udp(123)" in rev1["trafficLabel"] and "tcp(40000-40100→443)" in rev1["trafficLabel"]

    duplicate = create(client, requester, clauses=[clause("TCP", 40000, 40100, 443), clause()])
    assert duplicate.status_code == 409 and duplicate.json()["error"]["code"] == "INTERACTION_PURPOSE_EXISTS"
    independent = create(client, requester, purpose="Other business purpose")
    assert independent.status_code == 201 and independent.json()["interactionId"] != interaction_id

    need = client.post(f'/business-processes/{IDS["process"]}/needs',
                       headers=requester, json={"interactionRevisionId": rev1["interactionRevisionId"]})
    assert need.status_code == 201, need.text
    nid = need.json()["connectivityNeedId"]
    req = client.post('/access-requests', headers=requester, json={
        **DEMO_REQUEST, "interactionRevisionId": rev1["interactionRevisionId"],
        "connectivityNeedId": nid})
    assert req.status_code == 201, req.text
    rule_id = decide(env, req.json())["policyRuleId"]
    original = client.get('/policy/export', headers=exporter,
                          params={"ruleId": rule_id, "format": "json"}).json()["rows"]
    assert len(original) == 2
    assert {(r["clauseIndex"], r["ipProtocol"]) for r in original} == {(1, "TCP"), (2, "UDP")}
    csv_rows = list(csv.DictReader(io.StringIO(client.get('/policy/export',
        headers=exporter, params={"ruleId": rule_id, "format": "csv"}).text)))
    assert len(csv_rows) == 2 and {r["clauseIndex"] for r in csv_rows} == {"1", "2"}
    assert len([r for r in client.get('/policy/export/current', headers=exporter).json()["rows"]
                if r["ruleId"] == rule_id]) == 2

    url = f'/applications/{IDS["application"]}/interactions/{interaction_id}/revisions'
    next_clauses = [clause("TCP", 50000, 50100, 443), clause("UDP", destination=123)]
    published = client.post(url, headers=requester, json={"trafficClauses": next_clauses})
    assert published.status_code == 201, published.text
    rev1_after, rev2 = published.json()["revisions"]
    assert rev1_after == rev1
    assert rev2["revisionNumber"] == 2 and rev2["interactionRevisionId"] != rev1["interactionRevisionId"]
    assert rev2["trafficClauses"][0]["sourcePortStart"] == 50000
    assert client.post(url, headers=requester, json={"trafficClauses": next_clauses}).status_code == 409
    after = client.get('/policy/export', headers=exporter,
                       params={"ruleId": rule_id, "format": "json"}).json()["rows"]
    assert [{k: v for k, v in row.items() if k != "evaluationAt"} for row in after] == [
        {k: v for k, v in row.items() if k != "evaluationAt"} for row in original]

    options = client.get(f'/business-processes/{IDS["process"]}/needs/{nid}/access-request-options?kind=revisions',
                         headers=requester).json()["items"]
    assert {o["interactionRevisionId"] for o in options} >= {
        rev1["interactionRevisionId"], rev2["interactionRevisionId"]}
    with db.transaction(write=True) as c:
        for sql in (
            "UPDATE interaction_revisions SET port_start=555 WHERE id=?",
            "DELETE FROM interaction_revisions WHERE id=?",
        ):
            try:
                c.execute(sql, (rev1["interactionRevisionId"],))
                raise AssertionError("published revision was modified")
            except sqlite3.IntegrityError:
                pass


def test_duplicate_and_partial_clause_commands_leave_no_records(env):
    db, _, _, client, _ = env
    requester = auth(env, "requester")
    with db.transaction() as c:
        before = c.execute("SELECT count(*) FROM interaction_revisions").fetchone()[0]
    for invalid in [
        [clause(), clause()],
        [dict(clause(), sourcePortStart=10)],
        [],
    ]:
        response = create(client, requester, purpose="bad", clauses=invalid) if invalid else client.post(
            f'/applications/{IDS["application"]}/interactions', headers=requester, json={
                "sourceComponentId": IDS["sender"], "destinationComponentId": IDS["receiver"],
                "purpose": "bad", "trafficClauses": []})
        assert response.status_code in (409, 422), response.text
    with db.transaction() as c:
        assert c.execute("SELECT count(*) FROM interaction_revisions").fetchone()[0] == before


def test_same_purpose_requires_new_revision_and_legacy_exact_duplicates_blocked(env):
    _, _, _, client, _ = env
    requester = auth(env, "requester")
    first = create(client, requester, purpose="Business purpose A", clauses=[clause(destination=10123)])
    assert first.status_code == 201, first.text
    changed = create(client, requester, purpose="Business purpose A", clauses=[clause(destination=10124)])
    assert changed.status_code == 409
    assert changed.json()["error"]["code"] == "INTERACTION_PURPOSE_EXISTS"
    legacy = {"sourceComponentId": IDS["sender"], "destinationComponentId": IDS["receiver"],
              "ipProtocol": "UDP", "destinationPortStart": 9999, "destinationPortEnd": 9999}
    base = f'/applications/{IDS["application"]}/interactions'
    assert client.post(base, headers=requester, json=legacy).status_code == 201
    duplicate = client.post(base, headers=requester, json=legacy)
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "DUPLICATE_INTERACTION"
    assert client.post(base, headers=requester,
                       json={**legacy, "destinationPortStart": 9998, "destinationPortEnd": 9998}).status_code == 201


def test_overlapping_clauses_are_rejected(env):
    _, _, _, client, _ = env
    requester = auth(env, "requester")
    base = f'/applications/{IDS["application"]}/interactions'
    response = client.post(base, headers=requester, json={
        "sourceComponentId": IDS["sender"], "destinationComponentId": IDS["receiver"],
        "purpose": "overlap attempt", "trafficClauses": [
            clause("TCP", destination=443),
            clause("TCP", source_start=10000, source_end=10000, destination=443),
        ],
    })
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "OVERLAPPING_TRAFFIC_CLAUSE"


def test_legacy_single_clause_and_migration_contract(env):
    db, _, _, client, _ = env
    with db.transaction() as c:
        assert c.execute("PRAGMA user_version").fetchone()[0] == 8
        original = c.execute("SELECT * FROM interaction_revisions WHERE id=?", (IDS["revision"],)).fetchone()
        assert original["traffic_clauses_json"] is None
        assert original["revision_number"] == 1
    requester = auth(env, "requester")
    item = client.get(f'/applications/{IDS["application"]}/interactions', headers=requester).json()["items"][0]
    assert item["revisions"][0]["revisionNumber"] == 1
    assert len(item["revisions"][0]["trafficClauses"]) == 1
