import sqlite3

import pytest
from test_acceptance import approved

from napms.dev import IDS, init_demo


def rows(c):
    return {
        r[0]: [tuple(x) for x in c.execute(f"SELECT * FROM {r[0]} ORDER BY rowid")]
        for r in c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%_names'"
        ).fetchall()
    }


def downgrade_v3(db):
    with db.connect() as c:
        for table in ("component_names", "application_names", "resource_names"):
            c.execute(f"DROP TABLE {table}")
        c.execute("PRAGMA user_version=3")


def test_v3_upgrade_preserves_history_and_credentials(env):
    rid = approved(env)
    db, path = env[:2]
    credentials = path.read_bytes()
    downgrade_v3(db)
    with db.connect() as c:
        before = rows(c)
        triggers = [
            tuple(r)
            for r in c.execute(
                "SELECT name,sql FROM sqlite_master WHERE type='trigger' ORDER BY name"
            )
        ]
    db.initialize()  # Explicit migration alone does not invent any historical names.
    with db.transaction() as c:
        assert c.execute("PRAGMA user_version").fetchone()[0] == 4
        assert rows(c) == before
        assert c.execute("SELECT * FROM resource_names").fetchall() == []
        assert c.execute("PRAGMA foreign_key_check").fetchall() == []
        current = [
            tuple(r)
            for r in c.execute(
                "SELECT name,sql FROM sqlite_master WHERE type='trigger' ORDER BY name"
            )
        ]
        assert all(t in current for t in triggers)
    with db.transaction(write=True) as c:
        c.execute(
            "INSERT INTO resource_names VALUES (?, 'operator.example')",
            (IDS["sourceResource"],),
        )
        c.execute(
            "UPDATE grants SET valid_until='2000-01-01T00:00:00Z' WHERE id=?",
            (IDS["sourceOptionsGrant"],),
        )
    init_demo(db, path)
    init_demo(db, path)
    assert path.read_bytes() == credentials
    with db.transaction() as c:
        assert (
            c.execute(
                "SELECT name FROM resource_names WHERE resource_id=?",
                (IDS["sourceResource"],),
            ).fetchone()[0]
            == "operator.example"
        )
        assert (
            c.execute(
                "SELECT valid_until FROM grants WHERE id=?",
                (IDS["sourceOptionsGrant"],),
            ).fetchone()[0]
            == "2000-01-01T00:00:00Z"
        )
        assert c.execute("SELECT id FROM policy_rules").fetchone()[0] == rid
    with (
        pytest.raises(sqlite3.IntegrityError, match="immutable"),
        db.transaction(write=True) as c,
    ):
        c.execute("UPDATE components SET application_id=?", (IDS["application"],))


def test_v3_migration_rolls_back_ddl_and_version(env):
    db = env[0]
    downgrade_v3(db)
    with db.connect() as c:
        c.execute("CREATE TABLE application_names(injected TEXT)")
        before = rows(c)
    with pytest.raises(sqlite3.OperationalError, match="already exists"):
        db.initialize()
    with db.connect() as c:
        assert c.execute("PRAGMA user_version").fetchone()[0] == 3
        assert (
            c.execute(
                "SELECT name FROM sqlite_master WHERE name='resource_names'"
            ).fetchall()
            == []
        )
        assert rows(c) == before


def test_names_validate_and_component_names_are_application_scoped(env):
    for table, column, key in [
        ("resource_names", "resource_id", "sourceResource"),
        ("application_names", "application_id", "application"),
        ("component_names", "component_id", "sender"),
    ]:
        for invalid in ("", "   ", "a" * 301):
            with (
                pytest.raises(sqlite3.IntegrityError),
                env[0].transaction(write=True) as c,
            ):
                c.execute(
                    f"UPDATE {table} SET name=? WHERE {column}=?", (invalid, IDS[key])
                )
    with (
        pytest.raises(sqlite3.IntegrityError, match="duplicate component"),
        env[0].transaction(write=True) as c,
    ):
        c.execute(
            "UPDATE component_names SET name='Отправитель' WHERE component_id=?",
            (IDS["receiver"],),
        )
    with env[0].transaction(write=True) as c:
        c.execute("INSERT INTO applications VALUES ('another')")
        c.execute("INSERT INTO components VALUES ('other', 'another')")
        c.execute("INSERT INTO component_names VALUES ('other', 'Отправитель')")


@pytest.mark.parametrize(
    "protocol,start,end,expected",
    [
        ("TCP", 443, 443, "tcp(443)"),
        ("TCP", 8000, 8010, "tcp(8000-8010)"),
        ("UDP", 1, 65535, "udp(1-65535)"),
    ],
)
def test_typed_traffic(protocol, start, end, expected):
    from napms.labels import traffic

    assert traffic(protocol, start, end) == expected


@pytest.mark.parametrize(
    "protocol,start,end",
    [
        ("ICMP", 8, 8),
        ("tcp", 443, 443),
        ("TCP", 0, 1),
        ("UDP", 10, 1),
        ("TCP", 1, 65536),
    ],
)
def test_invalid_typed_traffic(protocol, start, end):
    from napms.labels import traffic

    with pytest.raises(ValueError):
        traffic(protocol, start, end)


def test_semantic_labels_missing_names_and_confidentiality(env):
    from uuid import uuid4

    from conftest import auth
    from test_acceptance import change, decide, submit

    headers = auth(env, "requester")

    def needs():
        return (
            env[3]
            .get("/business-processes/" + IDS["process"] + "/needs", headers=headers)
            .json()["items"]
        )

    def rule_detail(rid):
        return env[3].get("/policy-rules/" + rid, headers=auth(env, "exporter")).json()

    need = needs()[0]
    assert "Отправитель → Получатель" in need["displayLabel"]
    assert "tcp(" not in need["displayLabel"]
    revision = str(uuid4())
    change(
        env,
        "INSERT INTO interaction_revisions SELECT ?,interaction_id,application_id,source_component_id,destination_component_id,'UDP',8000,8010 FROM interaction_revisions",
        (revision,),
    )
    options = (
        env[3]
        .get(
            "/business-processes/"
            + IDS["process"]
            + "/needs/"
            + IDS["need"]
            + "/access-request-options",
            headers=headers,
        )
        .json()["items"]
    )
    alternate = next(o for o in options if o["interactionRevisionId"] == revision)
    assert alternate["displayLabel"].endswith("udp(8000-8010)")
    assert needs()[0]["displayLabel"] == need["displayLabel"]
    request = submit(env)
    decision = decide(env, request)
    rule = rule_detail(decision["policyRuleId"])
    assert rule["displayLabel"] == request["displayLabel"]
    assert rule["displayLabel"].endswith("tcp(443)")
    assert "Демонстрационный процесс" not in rule["displayLabel"]
    assert decision["displayLabel"] == "ALLOWED · " + rule["displayLabel"]
    change(env, "DELETE FROM grants WHERE id=?", (IDS["destinationOptionsGrant"],))
    for path in ["/access-requests/" + request["requestId"], "/access-requests"]:
        response = env[3].get(path, headers=auth(env, "requester"))
        assert response.status_code == 200
        assert "receiver.demo.example" not in response.text
        assert "Название недоступно" in response.text
    change(
        env, "DELETE FROM resource_names WHERE resource_id=?", (IDS["sourceResource"],)
    )
    missing = rule_detail(decision["policyRuleId"])
    assert "Название не задано" in missing["displayLabel"]
    assert missing["subject"] == rule["subject"]


def test_seed_preserves_operator_component_names_and_name_collisions(env):
    with env[0].transaction(write=True) as c:
        c.execute("DELETE FROM component_names")
        c.execute(
            "INSERT INTO component_names VALUES (?, 'Получатель')", (IDS["sender"],)
        )
    init_demo(env[0], env[1])
    init_demo(env[0], env[1])
    with env[0].transaction() as c:
        assert [tuple(r) for r in c.execute("SELECT * FROM component_names")] == [
            (IDS["sender"], "Получатель")
        ]


@pytest.mark.parametrize(
    "key",
    [
        "processReadGrant",
        "needReadGrant",
        "sourceOptionsGrant",
        "destinationOptionsGrant",
    ],
)
def test_historical_request_read_survives_each_disclosure_revocation_without_names(
    env, key
):
    from conftest import auth
    from test_acceptance import change, submit

    request = submit(env)
    assert "receiver.demo.example" in request["displayLabel"]
    change(env, "DELETE FROM grants WHERE id=?", (IDS[key],))
    for path in ["/access-requests", "/access-requests/" + request["requestId"]]:
        response = env[3].get(path, headers=auth(env, "requester"))
        assert response.status_code == 200
        assert "Название недоступно" in response.text
        assert "receiver.demo.example" not in response.text
        assert "Отправитель" not in response.text


@pytest.mark.parametrize(
    "table", ["resource_names", "application_names", "component_names"]
)
@pytest.mark.parametrize("identifier", [None, "missing"])
def test_name_metadata_requires_an_existing_owner(env, table, identifier):
    with pytest.raises(sqlite3.IntegrityError), env[0].transaction(write=True) as c:
        c.execute(f"INSERT INTO {table} VALUES (?, 'Operator name')", (identifier,))
