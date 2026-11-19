"""Explicit local initialization and loopback-only launcher. No user workflow CLI."""
import argparse
import ipaddress
import json
import os
import secrets
from pathlib import Path
from uuid import UUID, uuid4

from .storage import Database


def demo_id(number):
    return str(UUID(int=number))


IDS = {name: demo_id(i) for i, name in enumerate((
    "sourceResource", "destinationResource", "sourceEndpoint", "destinationEndpoint",
    "application", "sender", "receiver", "interaction", "revision", "sourceDeployment",
    "destinationDeployment", "process", "need", "requester", "decider", "exporter",
    "requestGrant", "decideGrant", "sourceExportGrant", "destinationExportGrant",
    "processReadGrant", "processCreateGrant", "needReadGrant", "needCreateGrant", "sourceOptionsGrant", "destinationOptionsGrant",
    "catalogCreateGrant", "catalogReadGrant", "processUpdateGrant", "processLifecycleGrant",
    "needUpdateGrant", "needLifecycleGrant"), 1)}
DEMO_REQUEST = {"sourceDeploymentId": IDS["sourceDeployment"],
                "destinationDeploymentId": IDS["destinationDeployment"],
                "interactionRevisionId": IDS["revision"], "connectivityNeedId": IDS["need"]}


def _ensure_credentials(credentials):
    credentials = Path(credentials)
    credentials.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive file creation preserves existing credentials; restrictive mode from first byte.
    try:
        fd = os.open(credentials, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        if credentials.is_symlink() or credentials.stat().st_mode & 0o077:
            raise RuntimeError("Credentials must be a private regular file (mode 0600)")
    else:
        with os.fdopen(fd, "w") as f:
            json.dump({role: {"actorId": IDS[role], "token": secrets.token_urlsafe(32)}
                       for role in ("requester", "decider", "exporter")}, f, indent=2)

def init_auth(db, credentials):
    """Explicit local authorization bootstrap. No catalog or business records."""
    _ensure_credentials(credentials)
    db.initialize()
    with db.transaction(write=True) as c:
        for role, label in (
            ("requester", "Локальный заявитель"),
            ("decider", "Локальный согласующий"),
            ("exporter", "Локальный оператор политики"),
        ):
            c.execute("INSERT OR IGNORE INTO actors(id) VALUES (?)", (IDS[role],))
            c.execute("INSERT OR IGNORE INTO actor_names(actor_id,name) VALUES (?,?)",
                      (IDS[role], label))
        for key, role, action, scope in (
            ("decideGrant", "decider", "access.decide", "demo-policy"),
            ("processReadGrant", "requester", "business.process.read", "demo-business"),
            ("processCreateGrant", "requester", "business.process.create", "demo-business"),
            ("processUpdateGrant", "requester", "business.process.update", "demo-business"),
            ("processLifecycleGrant", "requester", "business.process.lifecycle", "demo-business"),
            ("needReadGrant", "requester", "business.need.read", "demo-business"),
            ("needCreateGrant", "requester", "business.need.create", "demo-business"),
            ("needUpdateGrant", "requester", "business.need.update", "demo-business"),
            ("needLifecycleGrant", "requester", "business.need.lifecycle", "demo-business"),
            ("catalogCreateGrant", "requester", "catalog.create", "demo-catalog"),
            ("catalogReadGrant", "requester", "catalog.read", "demo-catalog"),
        ):
            c.execute("INSERT OR IGNORE INTO grants"
                      "(id,actor_id,action,scope,valid_from,valid_until)"
                      " VALUES (?,?,?,?,NULL,NULL)",
                      (IDS[key], IDS[role], action, scope))


def authorize_demo_resource(db, resource_id):
    """Explicitly authorize access to a real, already created Resource."""
    with db.transaction(write=True) as c:
        if not c.execute("SELECT 1 FROM resources WHERE id=?", (resource_id,)).fetchone():
            raise RuntimeError("Resource does not exist in SQLite")
        for role, action in (("requester", "access.request"),
                             ("requester", "access.options.read"),
                             ("exporter", "policy.export")):
            if not c.execute("SELECT 1 FROM actors WHERE id=?", (IDS[role],)).fetchone():
                raise RuntimeError("Run init-auth before authorizing a Resource")
            if not c.execute("SELECT 1 FROM grants WHERE actor_id=? AND action=? AND scope=?",
                             (IDS[role], action, resource_id)).fetchone():
                c.execute("INSERT INTO grants"
                          "(id,actor_id,action,scope,valid_from,valid_until)"
                          " VALUES (?,?,?,?,NULL,NULL)",
                          (str(uuid4()), IDS[role], action, resource_id))


def init_demo(db, credentials):
    """Explicit DB fixture for tests only; never called by runtime/reset."""
    _ensure_credentials(credentials)
    db.initialize()
    with db.transaction(write=True) as c:
        def seed(table, values, columns):
            c.execute(f"INSERT OR IGNORE INTO {table} ({columns}) VALUES ({','.join('?' for _ in values)})", values)
        for key in ("sourceResource", "destinationResource"):
            seed("resources", (IDS[key],), "id")
        seed("endpoints", (IDS["sourceEndpoint"], IDS["sourceResource"], "192.0.2.10", "HOST"), "id,resource_id,address,kind")
        seed("endpoints", (IDS["destinationEndpoint"], IDS["destinationResource"], "192.0.2.20", "HOST"), "id,resource_id,address,kind")
        seed("applications", (IDS["application"],), "id")
        for key in ("sender", "receiver"):
            seed("components", (IDS[key], IDS["application"]), "id,application_id")
        seed("interaction_revisions", (IDS["revision"], IDS["interaction"], IDS["application"], IDS["sender"], IDS["receiver"], "TCP", 443, 443), "id,interaction_id,application_id,source_component_id,destination_component_id,protocol,port_start,port_end")
        for deployment, component, resource in (("sourceDeployment", "sender", "sourceResource"), ("destinationDeployment", "receiver", "destinationResource")):
            seed("deployments", (IDS[deployment], IDS[component], IDS[resource]), "id,component_id,resource_id")
        seed("processes", (IDS["process"], "Демонстрационный процесс"), "id,name")
        seed("needs", (IDS["need"], IDS["process"], IDS["interaction"], IDS["sender"],
                        "Демонстрационная потребность", "ACTIVE"),
             "id,process_id,interaction_id,component_id,business_basis,status")
        for role in ("requester", "decider", "exporter"):
            seed("actors", (IDS[role],), "id")
        for role, display_name in (
            ("requester", "Демонстрационный заявитель"),
            ("decider", "Демонстрационный согласующий"),
            ("exporter", "Демонстрационный оператор политики"),
        ):
            seed("actor_names", (IDS[role], display_name), "actor_id,name")
        # Explicit synthetic operator input, never inferred from IDs or addresses.
        for table, column, names in (
            ("resource_names", "resource_id", {"sourceResource": "sender.demo.example", "destinationResource": "receiver.demo.example"}),
            ("application_names", "application_id", {"application": "Демонстрационный HTTPS"}),
            ("component_names", "component_id", {"sender": "Отправитель", "receiver": "Получатель"}),
        ):
            for key, name in names.items():
                if c.execute(f"SELECT 1 FROM {table} WHERE {column}=?", (IDS[key],)).fetchone():
                    continue
                if table == "component_names" and c.execute(
                    "SELECT 1 FROM component_names n JOIN components a ON a.id=n.component_id JOIN components b ON b.id=? WHERE a.application_id=b.application_id AND n.name=?",
                    (IDS[key], name),
                ).fetchone():
                    # An operator already owns this name in the Application; leave missing metadata absent.
                    continue
                seed(table, (IDS[key], name), column + ",name")
        for key, actor, action, scope in (
            ("requestGrant", "requester", "access.request", IDS["sourceResource"]),
            ("decideGrant", "decider", "access.decide", "demo-policy"),
            ("sourceExportGrant", "exporter", "policy.export", IDS["sourceResource"]),
            ("destinationExportGrant", "exporter", "policy.export", IDS["destinationResource"]),
            ("processReadGrant", "requester", "business.process.read", "demo-business"),
            ("processCreateGrant", "requester", "business.process.create", "demo-business"),
            ("processUpdateGrant", "requester", "business.process.update", "demo-business"),
            ("processLifecycleGrant", "requester", "business.process.lifecycle", "demo-business"),
            ("needReadGrant", "requester", "business.need.read", "demo-business"),
            ("needCreateGrant", "requester", "business.need.create", "demo-business"),
            ("needUpdateGrant", "requester", "business.need.update", "demo-business"),
            ("needLifecycleGrant", "requester", "business.need.lifecycle", "demo-business"),
            ("sourceOptionsGrant", "requester", "access.options.read", IDS["sourceResource"]),
            ("destinationOptionsGrant", "requester", "access.options.read", IDS["destinationResource"]),
            ("catalogCreateGrant", "requester", "catalog.create", "demo-catalog"),
            ("catalogReadGrant", "requester", "catalog.read", "demo-catalog")):
            seed("grants", (IDS[key], IDS[actor], action, scope, None, None), "id,actor_id,action,scope,valid_from,valid_until")


def load_credentials(path):
    path = Path(path)
    if path.is_symlink() or path.stat().st_mode & 0o077:
        raise RuntimeError("Credentials must have mode 0600")
    data = json.loads(path.read_text())
    return {item["token"]: item["actorId"] for item in data.values()}


def loopback(host):
    if host not in ("127.0.0.1", "::1"):
        raise argparse.ArgumentTypeError("Only 127.0.0.1 or ::1 is supported")
    return str(ipaddress.ip_address(host))


def main():
    parser = argparse.ArgumentParser(description="NAPMS local development only")
    parser.add_argument("command", choices=("init-demo", "init-auth", "grant-demo-resource", "reset-demo", "serve", "run"))
    parser.add_argument("--db", default="var/napms.sqlite3")
    parser.add_argument("--credentials", default="var/dev-credentials.json")
    parser.add_argument("--host", default="127.0.0.1", type=loopback)
    parser.add_argument("--port", default=8000, type=int)
    parser.add_argument("--profile", choices=("local-demo",))
    parser.add_argument("--yes", action="store_true", help="Explicitly confirm deletion of local demo data with reset-demo")
    parser.add_argument("--resource-id", help="Existing Resource UUID for local grants")
    args = parser.parse_args()
    if args.yes and args.command != "reset-demo":
        parser.error("--yes is supported only by reset-demo")
    if args.command == "grant-demo-resource":
        if not args.resource_id:
            parser.error("grant-demo-resource requires --resource-id")
        authorize_demo_resource(Database(args.db), args.resource_id)
        print("Local Resource grants persisted in SQLite.")
        return
    if args.resource_id is not None:
        parser.error("--resource-id is supported only by grant-demo-resource")
    if args.command == "init-auth":
        init_auth(Database(args.db), args.credentials)
        print("Local authorization initialized; business/catalog tables remain empty.")
        return
    if args.command == "reset-demo":
        if not args.yes:
            parser.error("reset-demo permanently clears all local demo data; repeat with --yes")
        if args.profile is not None:
            parser.error("reset-demo does not accept --profile")
        from .dev_reset import reset_demo
        try:
            reset_demo(Database(args.db), args.credentials)
        except RuntimeError as error:
            parser.exit(1, f"Demo reset: {error}\n")
        print("SQLite schema restored with zero rows; private credentials file preserved.")
        return
    if args.command == "run":
        if args.profile != "local-demo" or args.host != "127.0.0.1" or args.port != 8000:
            parser.error("run requires --profile local-demo and default loopback host/port")
        from .harness import run
        try:
            run(args.db, args.credentials)
        except RuntimeError as error:
            parser.exit(1, f"Local demo: {error}\n")
        return
    if args.profile is not None:
        parser.error("--profile is supported only by run")
    if args.command == "init-demo":
        init_demo(Database(args.db), args.credentials)
        print("Demo initialized; credentials in private local file. No permissions decided.")
    else:
        import uvicorn
        from .http import create_app
        uvicorn.run(create_app(Database(args.db), load_credentials(args.credentials),
                               shared_read=os.environ.get("NAPMS_DEMO_SHARED_READ") == "1"),
                    host=args.host, port=args.port, access_log=False)


if __name__ == "__main__":
    main()
