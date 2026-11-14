"""Explicit developer reset: preserve credentials, remove disposable state."""
import sqlite3
import sys

import pytest

from napms.dev import IDS, main
from napms.dev_reset import reset_demo
from napms.storage import Database


def test_reset_demo_rebuilds_latest_schema_and_seed_without_rotating_tokens(env):
    db, credentials, _, client, _ = env
    original_tokens = credentials.read_bytes()
    with db.transaction(write=True) as c:
        c.execute("INSERT INTO processes(id,name) VALUES (?,?)",
                  ("disposable-process", "Temporary training data"))
        c.execute("INSERT INTO resources(id) VALUES (?)", ("disposable-resource",))
        c.execute("""INSERT INTO applications(id) VALUES (?)""", ("disposable-app",))
        c.execute("""INSERT INTO components(id,application_id) VALUES (?,?)""",
                  ("disposable-component", "disposable-app"))

    reset_demo(db, credentials)
    reset_demo(db, credentials)  # Subsequent resets are deterministic and safe.
    assert credentials.read_bytes() == original_tokens
    with db.transaction() as c:
        assert c.execute("PRAGMA user_version").fetchone()[0] == 8
        assert c.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert c.execute("PRAGMA foreign_key_check").fetchall() == []
        assert c.execute("SELECT count(*) FROM processes").fetchone()[0] == 1
        assert c.execute("SELECT count(*) FROM interaction_revisions").fetchone()[0] == 1
        assert c.execute("SELECT count(*) FROM needs").fetchone()[0] == 1
        assert c.execute("SELECT count(*) FROM policy_rules").fetchone()[0] == 0
        assert c.execute("SELECT count(*) FROM interaction_aliases").fetchone()[0] == 0
        assert c.execute("SELECT 1 FROM processes WHERE id='disposable-process'").fetchone() is None
        assert c.execute("SELECT 1 FROM applications WHERE id='disposable-app'").fetchone() is None
        assert c.execute("SELECT id FROM interaction_revisions").fetchone()[0] == IDS["revision"]
        assert c.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name='unique_interaction_pair'").fetchone()


def test_cli_reset_requires_explicit_yes_and_does_not_modify_db(env, monkeypatch):
    db, credentials, _, _, _ = env
    with db.transaction(write=True) as c:
        c.execute("INSERT INTO processes(id,name) VALUES (?,?)", ("keep-me", "Until confirmed"))

    monkeypatch.setattr(sys, "argv", ["napms-dev", "reset-demo",
                                     "--db", str(db.path), "--credentials", str(credentials)])
    with pytest.raises(SystemExit) as denied:
        main()
    assert denied.value.code == 2
    with db.transaction() as c:
        assert c.execute("SELECT id FROM processes WHERE id='keep-me'").fetchone()

    monkeypatch.setattr(sys, "argv", ["napms-dev", "reset-demo", "--yes",
                                     "--db", str(db.path), "--credentials", str(credentials)])
    main()
    with db.transaction() as c:
        assert c.execute("SELECT id FROM processes WHERE id='keep-me'").fetchone() is None


def test_reset_refuses_unrecognized_sqlite_database(tmp_path):
    path = tmp_path / "other.sqlite3"
    with sqlite3.connect(path) as c:
        c.execute("CREATE TABLE unrelated(id INTEGER)")
        c.execute("PRAGMA user_version=8")
        c.execute("INSERT INTO unrelated VALUES (7)")
    with pytest.raises(RuntimeError, match="unrecognized"):
        reset_demo(Database(path), tmp_path / "credentials.json")
    with sqlite3.connect(path) as c:
        assert c.execute("SELECT id FROM unrelated").fetchone()[0] == 7


def test_reset_rejects_symlink_and_preserves_original_database(env, tmp_path):
    db, credentials, _, _, _ = env
    alias = tmp_path / "alias.sqlite3"
    alias.symlink_to(db.path)
    with pytest.raises(RuntimeError, match="symlinks"):
        reset_demo(Database(alias), credentials)
    with db.transaction() as c:
        assert c.execute("PRAGMA user_version").fetchone()[0] == 8


def test_reset_requires_stopped_services(env, monkeypatch):
    db, credentials, _, _, _ = env
    with db.transaction(write=True) as c:
        c.execute("INSERT INTO processes(id,name) VALUES (?,?)", ("keep-running", "Keep until stopped"))

    def busy_socket():
        raise OSError("port is busy")

    monkeypatch.setattr("napms.dev_reset.socket.socket", busy_socket)
    with pytest.raises(RuntimeError, match="Port 8000 is busy"):
        reset_demo(db, credentials)
    with db.transaction() as c:
        assert c.execute("SELECT id FROM processes WHERE id='keep-running'").fetchone()
