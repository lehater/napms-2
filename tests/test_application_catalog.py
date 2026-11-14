from uuid import UUID

from fastapi.testclient import TestClient

from conftest import auth
from napms.dev import IDS, load_credentials
from napms.http import create_app


def test_application_component_interaction_catalog_and_need_options(env):
    db, path, _, client, _ = env
    headers = auth(env, "requester")

    created = client.post("/applications", json={"name": "Order"}, headers=headers)
    assert created.status_code == 201
    app = created.json()
    assert UUID(app["applicationId"]).version == 4
    assert app["name"] == "Order"
    app_id = app["applicationId"]

    sender = client.post(f"/applications/{app_id}/components", json={"name": "Sender"}, headers=headers)
    receiver = client.post(f"/applications/{app_id}/components", json={"name": "Receiver"}, headers=headers)
    assert sender.status_code == receiver.status_code == 201
    assert sender.json()["applicationId"] == receiver.json()["applicationId"] == app_id
    assert client.post(f"/applications/{app_id}/components", json={"name": " Sender "}, headers=headers).status_code == 409

    interaction_response = client.post(f"/applications/{app_id}/interactions", json={
        "sourceComponentId": sender.json()["componentId"],
        "destinationComponentId": receiver.json()["componentId"],
        "ipProtocol": "TCP", "destinationPortStart": 443, "destinationPortEnd": 443,
    }, headers=headers)
    assert interaction_response.status_code == 201
    interaction = interaction_response.json()
    assert interaction["applicationId"] == app_id
    assert interaction["revisions"] == [{
        "interactionRevisionId": interaction["revisions"][0]["interactionRevisionId"],
        "ipProtocol": "TCP", "destinationPortStart": 443,
        "destinationPortEnd": 443, "trafficLabel": "tcp(443)",
    }]
    assert UUID(interaction["revisions"][0]["interactionRevisionId"]).version == 4

    detail = client.get(f"/applications/{app_id}", headers=headers)
    components = client.get(f"/applications/{app_id}/components?limit=1", headers=headers).json()
    interactions = client.get(f"/applications/{app_id}/interactions", headers=headers).json()
    assert detail.json() == app
    assert components["items"] == [receiver.json()]
    assert components["hasMore"] is True
    assert interactions["items"] == [interaction]
    assert client.get(f"/applications/{app_id}/components/{sender.json()['componentId']}", headers=headers).json() == sender.json()
    assert client.get(f"/applications/{app_id}/interactions/{interaction['interactionId']}", headers=headers).json() == interaction

    options = client.get(f"/business-processes/{IDS['process']}/need-options", headers=headers).json()
    assert interaction["revisions"][0]["interactionRevisionId"] in [item["interactionRevisionId"] for item in options["items"]]


def test_application_catalog_allows_self_interaction_and_rejects_invalid_cross_application_links(env):
    client, headers = env[3], auth(env, "requester")
    app_a = client.post("/applications", json={"name": "A"}, headers=headers).json()
    app_b = client.post("/applications", json={"name": "B"}, headers=headers).json()
    a = client.post(f"/applications/{app_a['applicationId']}/components", json={"name": "A1"}, headers=headers).json()
    b = client.post(f"/applications/{app_b['applicationId']}/components", json={"name": "B1"}, headers=headers).json()
    before = env[0].connect().execute("SELECT count(*) FROM interaction_revisions").fetchone()[0]
    base = {"sourceComponentId": a["componentId"], "destinationComponentId": b["componentId"],
            "ipProtocol": "TCP", "destinationPortStart": 443, "destinationPortEnd": 443}
    assert client.post(f"/applications/{app_a['applicationId']}/interactions", json=base, headers=headers).status_code == 400
    same = {**base, "destinationComponentId": a["componentId"], "ipProtocol": "UDP",
            "destinationPortStart": 123, "destinationPortEnd": 123}
    self_interaction = client.post(f"/applications/{app_a['applicationId']}/interactions", json=same, headers=headers)
    assert self_interaction.status_code == 201
    assert self_interaction.json()["sourceComponentId"] == self_interaction.json()["destinationComponentId"] == a["componentId"]
    assert self_interaction.json()["revisions"][0]["trafficLabel"] == "udp(123)"
    reversed_ports = {**base, "destinationPortStart": 444, "destinationPortEnd": 443}
    assert client.post(f"/applications/{app_a['applicationId']}/interactions", json=reversed_ports, headers=headers).status_code == 422
    assert client.post(f"/applications/{app_a['applicationId']}/components", json={"name": ""}, headers=headers).status_code == 422
    assert client.get(f"/applications/{app_a['applicationId']}/components/{b['componentId']}", headers=headers).status_code == 404
    assert env[0].connect().execute("SELECT count(*) FROM interaction_revisions").fetchone()[0] == before + 1


def test_catalog_grants_are_separate_from_shared_read(env):
    db, path, _, _, _ = env
    with TestClient(create_app(db, load_credentials(path), shared_read=True)) as client:
        decider = auth(env, "decider")
        assert client.get("/applications", headers=decider).status_code == 200
        assert client.post("/applications", json={"name": "Forbidden"}, headers=decider).status_code == 403
        assert client.post("/applications", json={"name": "Spoofed", "actorId": IDS["requester"]},
                           headers=auth(env, "requester")).status_code == 422
    with db.transaction(write=True) as c:
        c.execute("UPDATE grants SET valid_until='2000-01-01T00:00:00Z' WHERE action='catalog.read'")
    assert env[3].get("/applications", headers=auth(env, "requester")).status_code == 403
    assert env[3].post("/applications", json={"name": "NoRead"}, headers=auth(env, "requester")).status_code == 201

