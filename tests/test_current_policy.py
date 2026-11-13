"""Real SQLite/HTTP authorized collection and one-snapshot materialization."""

import csv
import io
from concurrent.futures import ThreadPoolExecutor
from threading import Event
from uuid import uuid4

import pytest
from conftest import auth
from test_acceptance import approved, change, decide, export, submit

from napms.dev import DEMO_REQUEST, IDS
from napms.http import COLUMNS
from napms.use_cases import Service


@pytest.fixture
def policy(env):
    first = approved(env)
    # Repeated ALLOWED references the canonical Rule, never adds another policy row.
    assert decide(env, submit(env))["policyRuleId"] == first
    service = env[2].state.service

    def extra(protocol, start, end):
        revision = str(uuid4())
        change(
            env,
            "INSERT INTO interaction_revisions SELECT ?,interaction_id,application_id,source_component_id,destination_component_id,?,?,? FROM interaction_revisions LIMIT 1",
            (revision, protocol, start, end),
        )
        request = service.submit(
            IDS["requester"], {**DEMO_REQUEST, "interactionRevisionId": revision}
        )
        return service.decide(IDS["decider"], request["requestId"], "ALLOWED")[
            "policyRuleId"
        ]

    second = extra("UDP", 8000, 8010)
    inactive = extra("TCP", 8443, 8443)
    change(env, "UPDATE policy_rules SET state='INACTIVE' WHERE id=?", (inactive,))
    hidden = str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute("INSERT INTO resources VALUES (?)", (hidden,))
        c.execute(
            "INSERT INTO deployments VALUES (?,?,?)", (hidden, IDS["receiver"], hidden)
        )
        c.execute(
            "INSERT INTO resource_names VALUES (?, 'hidden.secret.example')", (hidden,)
        )
    request = service.submit(
        IDS["requester"], {**DEMO_REQUEST, "destinationDeploymentId": hidden}
    )
    hidden_rule = service.decide(IDS["decider"], request["requestId"], "ALLOWED")[
        "policyRuleId"
    ]
    return first, second, inactive, hidden_rule, hidden


def current(env, format="json", role="exporter"):
    return env[3].get(
        "/policy/export/current?format=" + format, headers=auth(env, role)
    )


def test_authorized_rules_filter_before_paging_and_current_export(env, policy):
    first, second, inactive, hidden_rule, hidden = policy
    response = env[3].get("/policy-rules", headers=auth(env, "exporter"))
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"items", "limit", "offset", "hasMore"}
    expected = sorted([first, second, inactive])
    assert [r["ruleId"] for r in body["items"]] == expected
    assert {r["state"] for r in body["items"]} == {"ACTIVE", "INACTIVE"}
    rule = next(r for r in body["items"] if r["ruleId"] == first)
    assert len(rule["allowanceDecisionIds"]) == 2
    assert rule["trafficLabel"] == "tcp(443)"
    for i in range(4):
        page = (
            env[3]
            .get(f"/policy-rules?limit=1&offset={i}", headers=auth(env, "exporter"))
            .json()
        )
        assert [r["ruleId"] for r in page["items"]] == expected[i : i + 1]
        assert page["hasMore"] == (i < 2)
    assert (
        env[3]
        .get("/policy-rules?offset=" + "9" * 100, headers=auth(env, "exporter"))
        .json()["items"]
        == []
    )
    result = current(env)
    assert result.status_code == 200
    data = result.json()
    assert set(data) == {"scope", "evaluationAt", "rows"}
    assert data["scope"] == result.headers["X-Policy-Scope"] == "authorized"
    assert result.headers["X-Evaluation-At"] == data["evaluationAt"]
    assert [r["ruleId"] for r in data["rows"]] == sorted([first, second])
    assert all(r["evaluationAt"] == data["evaluationAt"] for r in data["rows"])
    assert [r["readiness"] for r in data["rows"]] == ["READY", "READY"]
    for candidate in [response, result, current(env, "csv")]:
        assert candidate.headers["Cache-Control"] == "no-store"
        for secret in (hidden_rule, hidden, "hidden.secret.example"):
            assert secret not in candidate.text
    # Existing selected-Rule semantics, including its distinct envelope, remain valid.
    assert export(env, inactive).json()["rows"] == []
    assert set(export(env, first).json()) == {"evaluationAt", "selectedRuleId", "rows"}


def test_json_csv_parity_incomplete_and_empty(env, policy):
    change(
        env,
        "UPDATE endpoints SET address=NULL,kind=NULL WHERE id=?",
        (IDS["destinationEndpoint"],),
    )
    data = current(env).json()
    csv_response = current(env, "csv")
    parsed = list(csv.DictReader(io.StringIO(csv_response.text)))
    assert list(parsed[0]) == list(COLUMNS)
    assert len(parsed) == len(data["rows"]) == 2
    for actual, expected in zip(parsed, data["rows"]):
        assert expected["readiness"] == "INCOMPLETE"
        assert expected["destinationAddress"] is None
        for key, value in expected.items():
            if key == "evaluationAt":
                assert actual[key] == csv_response.headers["X-Evaluation-At"]
            else:
                assert actual[key] == ("" if value is None else str(value))
    change(env, "UPDATE policy_rules SET state='INACTIVE'")
    assert current(env).json()["rows"] == []
    assert list(csv.reader(io.StringIO(current(env, "csv").text))) == [list(COLUMNS)]


@pytest.mark.parametrize("key", ["sourceExportGrant", "destinationExportGrant"])
@pytest.mark.parametrize(
    "column,value",
    [
        ("valid_until", "2000-01-01T00:00:00Z"),
        ("valid_from", "2999-01-01T00:00:00Z"),
        ("scope", "wrong"),
    ],
)
def test_each_resource_grant_is_independent(env, policy, key, column, value):
    change(env, f"UPDATE grants SET {column}=? WHERE id=?", (value, IDS[key]))
    assert (
        env[3].get("/policy-rules", headers=auth(env, "exporter")).json()["items"] == []
    )
    assert current(env).json()["rows"] == []
    assert list(csv.reader(io.StringIO(current(env, "csv").text))) == [list(COLUMNS)]
    assert export(env, policy[0]).status_code == 403


@pytest.mark.parametrize("path", ["/policy-rules", "/policy/export/current"])
@pytest.mark.parametrize(
    "query",
    [
        "limit=0",
        "limit=101",
        "offset=-1",
        "offset=x",
        "actorId=secret",
        "evaluationAt=secret",
        "ruleId=secret",
        "format=xml",
        "format=json&format=csv",
        "limit=1&limit=2",
    ],
)
def test_new_routes_strict_queries(env, path, query):
    response = env[3].get(path + "?" + query, headers=auth(env, "exporter"))
    assert response.status_code == 422
    assert response.headers["Cache-Control"] == "no-store"
    assert "secret" not in response.text


@pytest.mark.parametrize("path", ["/policy-rules", "/policy/export/current"])
def test_authentication_and_independent_roles(env, policy, path):
    for headers in [{}, {"Authorization": "Bearer invalid"}]:
        response = env[3].get(path, headers=headers)
        assert response.status_code == 401
        assert response.headers["Cache-Control"] == "no-store"
        assert policy[0] not in response.text
    for role in ["requester", "decider"]:
        response = env[3].get(path, headers=auth(env, role))
        assert response.status_code == 200
        assert response.json().get("items", response.json().get("rows")) == []
        assert policy[0] not in response.text


@pytest.mark.parametrize("operation", ["export_current", "list_rules"])
@pytest.mark.parametrize("key", ["sourceExportGrant", "destinationExportGrant"])
def test_snapshot_pins_all_rules_grants_addresses_and_labels(
    env, policy, operation, key
):
    pinned, changed = Event(), Event()
    samples = []

    def clock():
        samples.append(1)
        pinned.set()
        assert changed.wait(5)
        return "2030-01-01T00:00:00Z"

    def writer():
        assert pinned.wait(5)
        try:
            with env[0].transaction(write=True) as c:
                c.execute("DELETE FROM grants WHERE id=?", (IDS[key],))
                c.execute("UPDATE policy_rules SET state='INACTIVE'")
                c.execute("UPDATE endpoints SET address='203.0.113.99'")
                c.execute("UPDATE resource_names SET name='changed.example'")
        finally:
            changed.set()

    service = Service(env[0], clock)
    with ThreadPoolExecutor(max_workers=2) as pool:
        write = pool.submit(writer)
        result = getattr(service, operation)(
            IDS["exporter"], *([20, 0] if operation == "list_rules" else [])
        )
        write.result(timeout=10)
    assert samples == [1]
    if operation == "export_current":
        assert len(result["rows"]) == 2
        assert all(
            r["evaluationAt"] == result["evaluationAt"] == "2030-01-01T00:00:00Z"
            for r in result["rows"]
        )
        assert all(r["destinationAddress"] == "192.0.2.20" for r in result["rows"])
    else:
        assert len(result["items"]) == 3
        assert all(
            "receiver.demo.example" in r["displayLabel"] for r in result["items"]
        )
        assert sum(r["state"] == "ACTIVE" for r in result["items"]) == 2
    assert current(env).json()["rows"] == []
    assert (
        env[3].get("/policy-rules", headers=auth(env, "exporter")).json()["items"] == []
    )


def test_current_export_includes_rules_beyond_the_first_collection_page(env):
    service = Service(env[0])
    for port in range(8000, 8023):
        revision = str(uuid4())
        change(
            env,
            "INSERT INTO interaction_revisions SELECT ?,interaction_id,application_id,source_component_id,destination_component_id,protocol,?,? FROM interaction_revisions LIMIT 1",
            (revision, port, port),
        )
        request = service.submit(
            IDS["requester"], {**DEMO_REQUEST, "interactionRevisionId": revision}
        )
        service.decide(IDS["decider"], request["requestId"], "ALLOWED")
    page = env[3].get("/policy-rules", headers=auth(env, "exporter")).json()
    assert len(page["items"]) == 20 and page["hasMore"]
    exported = current(env).json()["rows"]
    assert len(exported) == 23
    assert {row["destinationPortStart"] for row in exported} == set(range(8000, 8023))


@pytest.mark.parametrize(
    "start,end,visible",
    [
        ("2030-01-01T00:00:00Z", None, True),
        ("2030-01-01T00:00:00.000001Z", None, False),
        (None, "2030-01-01T00:00:00Z", False),
        (None, "2030-01-01T00:00:00.000001Z", True),
    ],
)
def test_new_policy_operations_share_exact_grant_window_boundaries(
    env, start, end, visible
):
    approved(env)
    change(
        env,
        "UPDATE grants SET valid_from=?,valid_until=? WHERE id=?",
        (start, end, IDS["destinationExportGrant"]),
    )
    samples = []

    def clock():
        samples.append(1)
        return "2030-01-01T00:00:00Z"

    service = Service(env[0], clock)
    assert bool(service.list_rules(IDS["exporter"], 20, 0)["items"]) == visible
    assert bool(service.export_current(IDS["exporter"])["rows"]) == visible
    assert samples == [1, 1]
