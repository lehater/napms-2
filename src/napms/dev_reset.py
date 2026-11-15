"""Explicit reset of disposable local-demo SQLite state; no public reset API."""
import socket
from contextlib import closing
from pathlib import Path



def reset_demo(db, credentials):
    """Replace all app data/schema with the current clean schema and demo seed.

    Drop schema objects in one SQLite transaction rather than unlinking the
    database file. This is safe for WAL and leaves the original intact if
    a constraint or schema check fails before the transaction commits.
    """
    path = db.path.absolute()
    credentials = Path(credentials).absolute()
    web = Path(__file__).resolve().parents[2] / "web"
    if any(item.is_symlink() or item.resolve().is_relative_to(web.resolve())
           for item in (path, credentials)):
        raise RuntimeError("Reset requires regular local paths outside web; symlinks are prohibited")
    if path.exists() and not path.is_file():
        raise RuntimeError("Reset target must be a regular SQLite file")
    if credentials.exists() and (not credentials.is_file() or credentials.stat().st_mode & 0o077):
        raise RuntimeError("Credentials must be a private regular file (mode 0600)")

    # A running local-demo process must never be reset from underneath.
    for port in (8000, 5173):
        try:
            with socket.socket() as probe:
                probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                probe.bind(("127.0.0.1", port))
        except OSError:
            raise RuntimeError(f"Port {port} is busy; stop NAPMS before resetting the database") from None

    if path.exists():
        with closing(db.connect()) as c:
            version = c.execute("PRAGMA user_version").fetchone()[0]
            objects = c.execute("""SELECT type,name FROM sqlite_master
                WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'""").fetchall()
            tables = {item["name"] for item in objects if item["type"] == "table"}
            if version == 0 and not tables:
                pass  # Empty SQLite file is already a clean bootstrap target.
            elif version not in range(1, 10) or not {
                "resources", "applications", "interaction_revisions"
            }.issubset(tables):
                raise RuntimeError("Refusing to reset an unrecognized SQLite schema")
            else:
                # In WAL mode, a successful TRUNCATE checkpoint also detects
                # readers that would prevent a clean reset.
                if c.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchone()[0]:
                    raise RuntimeError("SQLite is in use; stop all readers before resetting")
                c.execute("PRAGMA foreign_keys=OFF")
                try:
                    c.execute("BEGIN EXCLUSIVE")
                    for kind in ("view", "table"):
                        for obj in objects:
                            if obj["type"] == kind:
                                identifier = obj["name"].replace('"', '""')
                                c.execute(f'DROP {kind.upper()} "{identifier}"')
                    c.execute("PRAGMA user_version=0")
                    c.commit()
                except BaseException:
                    c.rollback()
                    raise

    # Private credential file remains untouched; every SQLite table stays empty.
    db.initialize()
