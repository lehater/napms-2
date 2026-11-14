"""Source-port fidelity through immutable revisions, migration, and canonical policy."""
import csv
import io
import sqlite3

import pytest

from conftest import auth
from napms.dev import DEMO_REQUEST, IDS
from napms.storage import Database
from test_acceptance import decide


def payload(source_start=None, source_end=None, destination_start=123, destination_end=123):
    return {
        "sourceComponentId": IDS["sender"], "destinationComponentId": IDS["receiver"],
        "ipProtocol": "UDP", "sourcePortStart": source_start, "sourcePortEnd": source_end,
        "destinationPortStart": destination_start, "destinationPortEnd": destination_end,
    }


def test_source_ports_any_and_explicit_end_to_end(env):
    db, _, _, client, _ = env
    url = f'/applications/{IDS["application"]}/interactions'
    requester, exporter = auth(env, "requester"), auth(env, "exporter")

    for data, expected in [
        (payload(), "udp(123)"),
        (payload(50000, 51000, 123, 124), "udp(50000-51000→123-124)"),
        (payload(123, 123), "udp(123→123)"),
    ]:
        response = client.post(url, headers=requester, json=data)
        assert response.status_code == 201, response.text
        interaction = response.json()
        revision = interaction["revisions"][0]
        assert revision["trafficLabel"] == expected
        assert (revision["sourcePortStart"], revision["sourcePortEnd"]) == (
            data["sourcePortStart"], data["sourcePortEnd"])
        assert client.get(f'{url}/{interaction["interactionId"]}', headers=requester).json() == interaction

        options = client.get(f'/business-processes/{IDS["process"]}/need-options', headers=requester).json()
        option = next(item for item in options["items"] if item["interactionRevisionId"] == revision["interactionRevisionId"])
        assert (option["sourcePortStart"], option["sourcePortEnd"]) == (
            data["sourcePortStart"], data["sourcePortEnd"])

        need = client.post(f'/business-processes/{IDS["process"]}/needs',
                           headers=requester, json={"interactionRevisionId": revision["interactionRevisionId"]})
        assert need.status_code == 201, need.text
        request = client.post('/access-requests', headers=requester, json={
            **DEMO_REQUEST, "interactionRevisionId": revision["interactionRevisionId"],
            "connectivityNeedId": need.json()["connectivityNeedId"]})
        assert request.status_code == 201, request.text
        assert expected in request.json()["displayLabel"]
        rule_id = decide(env, request.json())["policyRuleId"]
        rule = client.get(f'/policy-rules/{rule_id}', headers=exporter).json()
        summary = client.get('/policy-rules', headers=exporter).json()["items"]
        assert (rule["sourcePortStart"], rule["sourcePortEnd"]) == (
            data["sourcePortStart"], data["sourcePortEnd"])
        assert rule["trafficLabel"] == expected
        assert any(item["ruleId"] == rule_id and item["sourcePortStart"] == data["sourcePortStart"] for item in summary)

        rows = client.get('/policy/export', headers=exporter,
                          params={"ruleId": rule_id, "format": "json"}).json()["rows"]
        assert len(rows) == 1
        row = rows[0]
        assert (row["sourcePortStart"], row["sourcePortEnd"]) == (
            data["sourcePortStart"], data["sourcePortEnd"])
        assert (row["destinationPortStart"], row["destinationPortEnd"]) == (
            data["destinationPortStart"], data["destinationPortEnd"])
        csv_response = client.get('/policy/export', headers=exporter,
                                  params={"ruleId": rule_id, "format": "csv"})
        csv_row, = csv.DictReader(io.StringIO(csv_response.text))
        for key in ("sourcePortStart", "sourcePortEnd"):
            assert csv_row[key] == ("" if data[key] is None else str(data[key]))
        current = client.get('/policy/export/current', headers=exporter).json()["rows"]
        assert any(item["ruleId"] == rule_id and item["sourcePortStart"] == data["sourcePortStart"]
                   for item in current)
        with db.transaction() as c:
            stored = c.execute("SELECT source_port_start,source_port_end FROM interaction_revisions WHERE id=?",
                               (revision["interactionRevisionId"],)).fetchone()
            assert tuple(stored) == (data["sourcePortStart"], data["sourcePortEnd"])


@pytest.mark.parametrize("invalid", [
    {"sourcePortStart": 100},
    {"sourcePortStart": None, "sourcePortEnd": 100},
    {"sourcePortStart": 1024, "sourcePortEnd": None},
    {"sourcePortStart": 1025, "sourcePortEnd": 1024},
    {"sourcePortStart": 0, "sourcePortEnd": 1},
    {"sourcePortStart": 1, "sourcePortEnd": 65536},
    {"sourcePortStart": "100", "sourcePortEnd": 100},
    {"destinationPortStart": 0},
    {"destinationPortEnd": 65536},
    {"destinationPortStart": 124, "destinationPortEnd": 123},
])
def test_invalid_port_intervals_do_not_persist(env, invalid):
    data = {**payload(), **invalid}
    with env[0].transaction() as c:
        before = c.execute("SELECT count(*) FROM interaction_revisions").fetchone()[0]
    response = env[3].post(f'/applications/{IDS["application"]}/interactions',
                           headers=auth(env, "requester"), json=data)
    assert response.status_code == 422
    with env[0].transaction() as c:
        assert c.execute("SELECT count(*) FROM interaction_revisions").fetchone()[0] == before


def test_old_post_without_source_fields_means_any(env):
    data = payload()
    del data["sourcePortStart"], data["sourcePortEnd"]
    response = env[3].post(f'/applications/{IDS["application"]}/interactions',
                           headers=auth(env, "requester"), json=data)
    assert response.status_code == 201
    item = response.json()["revisions"][0]
    assert item["sourcePortStart"] is item["sourcePortEnd"] is None


def test_v5_source_port_migration_is_additive_and_repeatable(tmp_path):
    db = Database(tmp_path / "old.sqlite3")
    with db.connect() as c:
        c.execute("""CREATE TABLE interaction_revisions(
            id TEXT PRIMARY KEY, interaction_id TEXT, application_id TEXT,
            source_component_id TEXT, destination_component_id TEXT,
            protocol TEXT, port_start INTEGER, port_end INTEGER)""")
        c.execute("INSERT INTO interaction_revisions VALUES('old','link','app','src','dst','UDP',123,123)")
        c.execute("PRAGMA user_version=5")
    db.initialize()
    db.initialize()
    with db.connect() as c:
        assert c.execute("PRAGMA user_version").fetchone()[0] == 6
        row = c.execute("SELECT * FROM interaction_revisions WHERE id='old'").fetchone()
        assert row["source_port_start"] is row["source_port_end"] is None
        assert row["port_start"] == row["port_end"] == 123
        with pytest.raises(sqlite3.IntegrityError):
            c.execute("""INSERT INTO interaction_revisions
                (id,interaction_id,application_id,source_component_id,destination_component_id,protocol,
                 port_start,port_end,source_port_start)
                VALUES ('bad','link','app','src','dst','UDP',123,123,123)""")
