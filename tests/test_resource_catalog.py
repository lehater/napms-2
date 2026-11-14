from fastapi.testclient import TestClient

from conftest import auth
from napms.dev import DEMO_REQUEST, IDS, load_credentials
from napms.http import create_app
from test_acceptance import decide


def test_resource_creation_is_atomic_and_requires_catalog_create(env):
    db, _, _, client, _ = env
    headers = auth(env, "requester")
    with db.transaction() as c:
        resources_before = c.execute("SELECT count(*) FROM resources").fetchone()[0]
        endpoints_before = c.execute("SELECT count(*) FROM endpoints").fetchone()[0]

    assert client.post("/resources", json={"name": "denied"}, headers=auth(env, "decider")).status_code == 403
    assert client.post("/resources", json={"name": "anonymous"}).status_code == 401
    with TestClient(create_app(db, load_credentials(env[1]), shared_read=True)) as shared_client:
        assert shared_client.post("/resources", json={"name": "still denied"}, headers=auth(env, "decider")).status_code == 403
    for payload in ({}, {"name": "  "}, {"name": "x" * 301}, {"name": "valid", "id": "caller-controlled"}):
        assert client.post("/resources", json=payload, headers=headers).status_code == 422

    created = client.post("/resources", json={"name": "  New edge  "}, headers=headers)
    assert created.status_code == 201
    resource = created.json()
    assert resource["name"] == "New edge"
    assert client.get("/resources/" + resource["resourceId"], headers=headers).json() == resource
    endpoint = client.get(f"/resources/{resource['resourceId']}/endpoint", headers=headers)
    assert endpoint.status_code == 200
    assert endpoint.json()["resourceId"] == resource["resourceId"]
    assert endpoint.json()["address"] is None
    assert endpoint.json()["kind"] is None
    assert client.post(f"/resources/{resource['resourceId']}/endpoint", json={"kind":"HOST","address":"192.0.2.1"}, headers=headers).status_code == 405

    with db.transaction() as c:
        assert c.execute("SELECT count(*) FROM resources").fetchone()[0] == resources_before + 1
        assert c.execute("SELECT count(*) FROM endpoints").fetchone()[0] == endpoints_before + 1
        assert c.execute("SELECT count(*) FROM endpoints WHERE resource_id=?", (resource["resourceId"],)).fetchone()[0] == 1
        assert c.execute("SELECT count(*) FROM access_subjects").fetchone()[0] == 0


def test_endpoint_address_is_canonical_and_endpoint_identity_is_stable(env):
    client = env[3]
    headers = auth(env, "requester")
    created = client.post("/resources", json={"name": "Endpoint target"}, headers=headers).json()
    resource_id = created["resourceId"]
    endpoint_url = f"/resources/{resource_id}/endpoint"
    endpoint_id = client.get(endpoint_url, headers=headers).json()["endpointId"]
    seeded = client.get(f"/resources/{IDS['destinationResource']}/endpoint", headers=headers)
    assert seeded.status_code == 200
    assert seeded.json() == {"endpointId": IDS["destinationEndpoint"], "resourceId": IDS["destinationResource"],
                             "address": "192.0.2.20", "kind": "HOST"}

    ipv4 = client.put(endpoint_url, json={"kind": "HOST", "address": "192.0.2.7"}, headers=headers)
    assert ipv4.status_code == 200
    assert ipv4.json() == {"endpointId": endpoint_id, "resourceId": resource_id, "address": "192.0.2.7", "kind": "HOST"}
    ipv6 = client.put(endpoint_url, json={"kind": "HOST", "address": "2001:0db8:0:0::7"}, headers=headers)
    assert ipv6.status_code == 200
    assert ipv6.json()["address"] == "2001:db8::7"
    assert ipv6.json()["endpointId"] == endpoint_id
    prefix = client.put(endpoint_url, json={"kind": "PREFIX", "address": "2001:0db8::/32"}, headers=headers)
    assert prefix.status_code == 200
    assert prefix.json()["address"] == "2001:db8::/32"
    assert prefix.json()["endpointId"] == endpoint_id


def test_invalid_and_unauthorized_endpoint_updates_leave_state_unchanged(env):
    client = env[3]
    headers = auth(env, "requester")
    endpoint_url = f"/resources/{IDS['destinationResource']}/endpoint"
    original = client.get(endpoint_url, headers=headers).json()
    for kind, address in (("HOST", "host.example"), ("HOST", "192.0.2.1/24"),
                          ("PREFIX", "192.0.2.1/24"), ("PREFIX", "192.0.2.0"),
                          ("PREFIX", ""), ("OTHER", "192.0.2.1")):
        response = client.put(endpoint_url, json={"kind": kind, "address": address}, headers=headers)
        assert response.status_code == 422
        assert client.get(endpoint_url, headers=headers).json() == original

    denied = client.put(endpoint_url, json={"kind": "HOST", "address": "203.0.113.9"}, headers=auth(env, "decider"))
    assert denied.status_code == 403
    assert client.get(endpoint_url, headers=headers).json() == original
    with TestClient(create_app(env[0], load_credentials(env[1]), shared_read=True)) as shared_client:
        assert shared_client.put(endpoint_url, json={"kind":"HOST","address":"203.0.113.9"}, headers=auth(env,"decider")).status_code == 403
        assert shared_client.get(endpoint_url, headers=auth(env,"decider")).status_code == 200
    missing = "00000000-0000-4000-8000-000000000000"
    assert client.get(f"/resources/{missing}/endpoint", headers=headers).status_code == 404
    assert client.put(f"/resources/{missing}/endpoint", json={"kind": "HOST", "address": "192.0.2.1"}, headers=headers).status_code == 404


def test_new_destination_endpoint_changes_export_without_changing_rule_identity(env):
    db, _, _, client, _ = env
    requester = auth(env, "requester")
    exporter = auth(env, "exporter")
    resource = client.post("/resources", json={"name": "New destination"}, headers=requester).json()
    endpoint_url = f"/resources/{resource['resourceId']}/endpoint"
    endpoint = client.get(endpoint_url, headers=requester).json()
    deployment = client.post("/deployments", json={"componentId": IDS["receiver"], "resourceId": resource["resourceId"]}, headers=requester).json()
    request = client.post("/access-requests", json={**DEMO_REQUEST, "destinationDeploymentId": deployment["deploymentId"]}, headers=requester).json()
    decision = decide(env, request)
    with db.transaction(write=True) as c:
        c.execute("INSERT INTO grants(id,actor_id,action,scope) VALUES (?,?,?,?)",
                  ("test-new-destination-export", IDS["exporter"], "policy.export", resource["resourceId"]))

    before = client.get(f"/policy/export?ruleId={decision['policyRuleId']}&format=json", headers=exporter).json()["rows"][0]
    assert before["readiness"] == "INCOMPLETE"
    assert before["destinationEndpointId"] == endpoint["endpointId"]
    assert before["destinationAddress"] is None
    updated = client.put(endpoint_url, json={"kind": "HOST", "address": "198.51.100.20"}, headers=requester).json()
    assert updated["endpointId"] == endpoint["endpointId"]
    after = client.get(f"/policy/export?ruleId={decision['policyRuleId']}&format=json", headers=exporter).json()["rows"][0]
    assert after["readiness"] == "READY"
    assert after["destinationEndpointId"] == endpoint["endpointId"]
    assert after["destinationAddress"] == "198.51.100.20"
    for key in before.keys() - {"evaluationAt", "readiness", "destinationAddress", "destinationAddressKind"}:
        assert before[key] == after[key]


def test_new_resource_does_not_grant_request_authority_even_in_shared_read(env):
    with TestClient(create_app(env[0], load_credentials(env[1]), shared_read=True)) as app_client:
        requester = auth(env, "requester")
        resource = app_client.post("/resources", json={"name": "New source"}, headers=requester).json()
        deployment = app_client.post("/deployments", json={"componentId": IDS["sender"], "resourceId": resource["resourceId"]}, headers=requester).json()
        with env[0].transaction() as c:
            before = c.execute("SELECT count(*) FROM access_requests").fetchone()[0]
            assert c.execute("SELECT count(*) FROM grants WHERE actor_id=? AND action='access.request' AND scope=?",
                             (IDS["requester"], resource["resourceId"])).fetchone()[0] == 0
        response = app_client.post("/access-requests", json={**DEMO_REQUEST, "sourceDeploymentId": deployment["deploymentId"]}, headers=requester)
        assert response.status_code == 403
        with env[0].transaction() as c:
            assert c.execute("SELECT count(*) FROM access_requests").fetchone()[0] == before
            assert c.execute("SELECT count(*) FROM policy_rules").fetchone()[0] == 0
