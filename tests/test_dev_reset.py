"""Explicit developer reset: preserve credentials, remove disposable state."""
import sqlite3
import sys

import pytest

from napms.dev import IDS, main
from napms.dev_reset import reset_demo
from napms.storage import Database


def test_reset_demo_keeps_only_schema_and_private_credentials(env):
    db, credentials, _, _, _ = env
    original_tokens = credentials.read_bytes()
    with db.transaction(write=True) as c:
        c.execute("INSERT INTO processes(id,name) VALUES (?,?)",
                  ("disposable-process", "Training"))
    reset_demo(db, credentials)
    reset_demo(db, credentials)
    assert credentials.read_bytes() == original_tokens
    with db.transaction() as c:
        assert c.execute("PRAGMA user_version").fetchone()[0] == 8
        assert c.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert c.execute("PRAGMA foreign_key_check").fetchall() == []
        tables = [r["name"] for r in c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        assert tables
        for table in tables:
            assert c.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0] == 0, table
        assert c.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name='unique_interaction_pair'").fetchone()


def test_explicit_auth_bootstrap_does_not_create_domain_data(env):
    from napms.dev import init_auth
    db, credentials, _, _, _ = env
    reset_demo(db, credentials)
    init_auth(db, credentials)
    with db.transaction() as c:
        assert c.execute("SELECT COUNT(*) FROM actors").fetchone()[0] == 3
        for table in ("applications", "components", "resources", "interaction_revisions",
                      "processes", "needs", "access_requests", "policy_rules"):
            assert c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] == 0
    reset_demo(db, credentials)
    with db.transaction() as c:
        assert c.execute("SELECT COUNT(*) FROM actors").fetchone()[0] == 0
        assert c.execute("SELECT COUNT(*) FROM grants").fetchone()[0] == 0


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
