from conftest import auth
from napms.dev import IDS


def _profile(client, headers):
    application = client.post("/applications", json={"name": "Order"}, headers=headers).json()
    sender = client.post(f"/applications/{application['applicationId']}/components", json={"name": "Sender"}, headers=headers).json()
    receiver = client.post(f"/applications/{application['applicationId']}/components", json={"name": "Receiver"}, headers=headers).json()
    interaction = client.post(f"/applications/{application['applicationId']}/interactions", json={
        "sourceComponentId": sender["componentId"], "destinationComponentId": receiver["componentId"],
        "ipProtocol": "TCP", "destinationPortStart": 443, "destinationPortEnd": 443,
    }, headers=headers).json()
    return application, sender, receiver, interaction


def test_deployment_and_read_only_resource_catalog(env):
    db, _, _, client, _ = env
    headers = auth(env, "requester")
    _, sender, _, _ = _profile(client, headers)

    resources = client.get("/resources?limit=1", headers=headers)
    assert resources.status_code == 200
    assert resources.headers["cache-control"] == "no-store"
    assert resources.json()["items"][0] == {"resourceId": IDS["destinationResource"], "name": "receiver.demo.example"}
    assert resources.json()["hasMore"] is True

    with db.transaction() as c:
        original_count = c.execute("SELECT count(*) FROM deployments").fetchone()[0]
    response = client.post("/deployments", json={"componentId": sender["componentId"],
                                                  "resourceId": IDS["sourceResource"]}, headers=headers)
    assert response.status_code == 201
    deployment = response.json()
    assert deployment["componentName"] == "Sender"
    assert deployment["applicationName"] == "Order"
    assert deployment["resourceName"] == "sender.demo.example"
    assert client.get("/deployments/" + deployment["deploymentId"], headers=headers).json() == deployment
    assert deployment in client.get("/deployments", headers=headers).json()["items"]
    assert client.get("/resources/" + IDS["sourceResource"], headers=headers).json() == {
        "resourceId": IDS["sourceResource"], "name": "sender.demo.example"}

    assert client.post("/deployments", json={"componentId": sender["componentId"], "resourceId": str(IDS["sourceResource"] + "x")}, headers=headers).status_code == 422
    assert client.post("/deployments", json={"componentId": str(IDS["sourceResource"]), "resourceId": IDS["sourceResource"]}, headers=headers).status_code == 404
    assert client.get("/resources/" + str(IDS["sourceResource"] + "x"), headers=headers).status_code == 422
    assert client.post("/resources", json={"name": "forbidden"}, headers=headers).status_code == 405
    assert client.post("/deployments", json={"componentId": sender["componentId"], "resourceId": IDS["sourceResource"]},
                       headers=auth(env, "decider")).status_code == 403
    with db.transaction() as c:
        assert c.execute("SELECT count(*) FROM deployments").fetchone()[0] == original_count + 1


def test_new_deployments_compose_request_and_invalid_relations_fail(env):
    client, headers = env[3], auth(env, "requester")
    _, sender, receiver, interaction = _profile(client, headers)
    source = client.post("/deployments", json={"componentId": sender["componentId"],
                                               "resourceId": IDS["sourceResource"]}, headers=headers).json()
    destination = client.post("/deployments", json={"componentId": receiver["componentId"],
                                                    "resourceId": IDS["destinationResource"]}, headers=headers).json()
    revision = interaction["revisions"][0]["interactionRevisionId"]
    process = client.post("/business-processes", json={"name": "Order flow"}, headers=headers).json()
    need = client.post(f"/business-processes/{process['processId']}/needs", json={"interactionRevisionId": revision}, headers=headers)
    assert need.status_code == 201
    need_id = need.json()["connectivityNeedId"]

    options_url = f"/business-processes/{process['processId']}/needs/{need_id}/access-request-options"
    revisions = client.get(options_url + "?kind=revisions", headers=headers).json()["items"]
    assert [r["interactionRevisionId"] for r in revisions] == [revision]
    sources = client.get(options_url + f"?kind=source-deployments&interactionRevisionId={revision}", headers=headers).json()["items"]
    destinations = client.get(options_url + f"?kind=destination-deployments&interactionRevisionId={revision}", headers=headers).json()["items"]
    assert [d["deploymentId"] for d in sources] == [source["deploymentId"]]
    assert [d["deploymentId"] for d in destinations] == [destination["deploymentId"]]

    payload = {"sourceDeploymentId": source["deploymentId"], "destinationDeploymentId": destination["deploymentId"],
               "interactionRevisionId": revision, "connectivityNeedId": need_id}
    accepted = client.post("/access-requests", json=payload, headers=headers)
    assert accepted.status_code == 201
    assert accepted.json()["status"] == "PENDING"
    baseline = len(client.get("/access-requests", headers=headers).json()["items"])
    invalid = {**payload, "sourceDeploymentId": destination["deploymentId"]}
    assert client.post("/access-requests", json=invalid, headers=headers).status_code in (400, 403)
    assert len(client.get("/access-requests", headers=headers).json()["items"]) == baseline

