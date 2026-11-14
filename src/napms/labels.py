"""Server-owned presentation of typed domain facts; callers authorize before resolving names."""

from typing import Literal, TypedDict

MISSING = "Название не задано"
REDACTED = "Название недоступно"


class SubjectListProjection(TypedDict):
    listLabel: str
    listContext: str
    participantsLabel: str
    applicationLabel: str
    sourceResourceLabel: str
    destinationResourceLabel: str
    trafficLabel: str


def traffic(protocol: Literal["TCP", "UDP"], start: int, end: int,
            source_start: int | None = None, source_end: int | None = None) -> str:
    if protocol not in ("TCP", "UDP") or not 1 <= start <= end <= 65535:
        raise ValueError("Invalid transport interval")
    if ((source_start is None) != (source_end is None)
            or (source_start is not None and not 1 <= source_start <= source_end <= 65535)):
        raise ValueError("Invalid source transport interval")
    destination = str(start) if start == end else f"{start}-{end}"
    if source_start is None:
        return f"{protocol.lower()}({destination})"  # Historic label means source ANY.
    source = str(source_start) if source_start == source_end else f"{source_start}-{source_end}"
    return f"{protocol.lower()}({source}→{destination})"


def name(
    c, kind: Literal["resource", "application", "component"], identifier: str
) -> str:
    # Old database fixtures can still build historical records before explicit migration.
    table = kind + "_names"
    if not c.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone():
        return MISSING
    row = c.execute(
        f"SELECT name FROM {table} WHERE {kind}_id=?", (identifier,)
    ).fetchone()
    return row["name"] if row else MISSING


def interaction_label(c, revision):
    return f"{name(c, 'application', revision['application_id'])} · {name(c, 'component', revision['source_component_id'])} → {name(c, 'component', revision['destination_component_id'])}"


def revision_view(c, r):
    expression = traffic(r["protocol"], r["port_start"], r["port_end"], r["source_port_start"], r["source_port_end"])
    return {
        "interactionRevisionId": r["id"],
        "interactionId": r["interaction_id"],
        "applicationId": r["application_id"],
        "sourceComponentId": r["source_component_id"],
        "destinationComponentId": r["destination_component_id"],
        "ipProtocol": r["protocol"],
        "sourcePortStart": r["source_port_start"],
        "sourcePortEnd": r["source_port_end"],
        "destinationPortStart": r["port_start"],
        "destinationPortEnd": r["port_end"],
        "displayLabel": interaction_label(c, r) + " · " + expression,
        "trafficLabel": expression,
    }


def deployment_label(c, d):
    component = c.execute(
        "SELECT application_id FROM components WHERE id=?", (d["component_id"],)
    ).fetchone()
    return f"{name(c, 'application', component['application_id'])} · {name(c, 'component', d['component_id'])} @ {name(c, 'resource', d['resource_id'])}"


def deployment_view(c, d):
    return {
        "deploymentId": d["id"],
        "componentId": d["component_id"],
        "resourceId": d["resource_id"],
        "displayLabel": deployment_label(c, d),
    }


def subject_label(c, subject):
    src = c.execute(
        "SELECT * FROM deployments WHERE id=?", (subject["source_deployment_id"],)
    ).fetchone()
    dst = c.execute(
        "SELECT * FROM deployments WHERE id=?", (subject["destination_deployment_id"],)
    ).fetchone()
    rev = c.execute(
        "SELECT * FROM interaction_revisions WHERE id=?",
        (subject["interaction_revision_id"],),
    ).fetchone()
    return f"{deployment_label(c, src)} → {deployment_label(c, dst)} · {traffic(rev['protocol'], rev['port_start'], rev['port_end'], rev['source_port_start'], rev['source_port_end'])}"


def subject_list_projection(c, subject) -> SubjectListProjection:
    src = c.execute("SELECT * FROM deployments WHERE id=?", (subject["source_deployment_id"],)).fetchone()
    dst = c.execute("SELECT * FROM deployments WHERE id=?", (subject["destination_deployment_id"],)).fetchone()
    rev = c.execute("SELECT * FROM interaction_revisions WHERE id=?", (subject["interaction_revision_id"],)).fetchone()
    application = name(c, "application", rev["application_id"])
    source_component = name(c, "component", src["component_id"])
    destination_component = name(c, "component", dst["component_id"])
    source_resource = name(c, "resource", src["resource_id"])
    destination_resource = name(c, "resource", dst["resource_id"])
    participants = f"{source_component} → {destination_component}"
    expression = traffic(rev["protocol"], rev["port_start"], rev["port_end"], rev["source_port_start"], rev["source_port_end"])
    return {
        "listLabel": f"{participants} · {expression}",
        "listContext": f"{application} · {source_resource} → {destination_resource}",
        "participantsLabel": participants,
        "applicationLabel": application,
        "sourceResourceLabel": source_resource,
        "destinationResourceLabel": destination_resource,
        "trafficLabel": expression,
    }
