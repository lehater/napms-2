"""Explicit local initialization and loopback-only launcher. No user workflow CLI."""
import argparse
import ipaddress
import json
import os
import secrets
from pathlib import Path
from uuid import UUID

from .storage import Database


def demo_id(number):
    return str(UUID(int=number))


IDS = {name: demo_id(i) for i, name in enumerate((
    "sourceResource", "destinationResource", "sourceEndpoint", "destinationEndpoint",
    "application", "sender", "receiver", "interaction", "revision", "sourceDeployment",
    "destinationDeployment", "process", "need", "requester", "decider", "exporter",
    "requestGrant", "decideGrant", "sourceExportGrant", "destinationExportGrant",
    "processReadGrant", "processCreateGrant", "needReadGrant", "needCreateGrant"), 1)}
DEMO_REQUEST = {"sourceDeploymentId": IDS["sourceDeployment"],
                "destinationDeploymentId": IDS["destinationDeployment"],
                "interactionRevisionId": IDS["revision"], "connectivityNeedId": IDS["need"]}


def init_demo(db, credentials):
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
        seed("needs", (IDS["need"], IDS["process"], IDS["interaction"], IDS["sender"]), "id,process_id,interaction_id,component_id")
        for role in ("requester", "decider", "exporter"):
            seed("actors", (IDS[role],), "id")
        for key, actor, action, scope in (
            ("requestGrant", "requester", "access.request", IDS["sourceResource"]),
            ("decideGrant", "decider", "access.decide", "demo-policy"),
            ("sourceExportGrant", "exporter", "policy.export", IDS["sourceResource"]),
            ("destinationExportGrant", "exporter", "policy.export", IDS["destinationResource"]),
            ("processReadGrant", "requester", "business.process.read", "demo-business"),
            ("processCreateGrant", "requester", "business.process.create", "demo-business"),
            ("needReadGrant", "requester", "business.need.read", "demo-business"),
            ("needCreateGrant", "requester", "business.need.create", "demo-business")):
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
    parser.add_argument("command", choices=("init-demo", "serve", "run"))
    parser.add_argument("--db", default="var/napms.sqlite3")
    parser.add_argument("--credentials", default="var/dev-credentials.json")
    parser.add_argument("--host", default="127.0.0.1", type=loopback)
    parser.add_argument("--port", default=8000, type=int)
    parser.add_argument("--profile", choices=("local-demo",))
    args = parser.parse_args()
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
        uvicorn.run(create_app(Database(args.db), load_credentials(args.credentials)),
                    host=args.host, port=args.port, access_log=False)


if __name__ == "__main__":
    main()
