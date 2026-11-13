"""Transactions, authority checks and orchestration; no HTTP dependency."""
import sqlite3
from uuid import uuid4

from .labels import REDACTED, MISSING, deployment_view, interaction_label, revision_view, subject_label, subject_list_projection
from .domain import Problem, effective, now, validate_subject, validate_process_name


def uid():
    return str(uuid4())


def find(c, table, identifier):
    row = c.execute(f"SELECT * FROM {table} WHERE id=?", (identifier,)).fetchone()
    if row is None:
        raise Problem(404, "NOT_FOUND", "Entity not found")
    return row


def grant(c, actor, action, scope, at):
    for g in c.execute("SELECT * FROM grants WHERE actor_id=? AND action=? AND scope=? ORDER BY id", (actor, action, scope)):
        if effective(g, at):
            return g
    raise Problem(403, "FORBIDDEN", "Insufficient authority")


def catalog_visible(c, actor, subject, at):
    # Request/Decision read authority stays independent of separately protected labels.
    try:
        grant(c, actor, "access.decide", "demo-policy", at)
        return True
    except Problem:
        pass
    resources = [find(c, "deployments", subject[key])["resource_id"] for key in ("source_deployment_id", "destination_deployment_id")]
    for action in ("policy.export", "access.options.read"):
        try:
            if action == "access.options.read":
                for business_action in ("business.process.read", "business.need.read"):
                    grant(c, actor, business_action, "demo-business", at)
            for resource in resources:
                grant(c, actor, action, resource, at)
            return True
        except Problem:
            pass
    return False


def request_label(c, r, actor, at):
    subject = find(c, "access_subjects", r["subject_id"])
    return subject_label(c, subject) if catalog_visible(c, actor, subject, at) else REDACTED


def decision_view(c, d, actor, at):
    allowance = c.execute("SELECT rule_id FROM rule_allowances WHERE decision_id=?", (d["id"],)).fetchone()
    return dict(displayLabel=d["outcome"] + " · " + request_label(c, find(c, "access_requests", d["request_id"]), actor, at), decisionId=d["id"], requestId=d["request_id"], outcome=d["outcome"],
                deciderActorId=d["actor_id"], decidedAt=d["decided_at"],
                policyRuleId=allowance[0] if allowance else None)


def request_view(c, r, actor, at):
    d = c.execute("SELECT * FROM decisions WHERE request_id=?", (r["id"],)).fetchone()
    subject = find(c, "access_subjects", r["subject_id"])
    visible = catalog_visible(c, actor, subject, at)
    projection = subject_list_projection(c, subject) if visible else None
    list_projection = (
        {"listLabel": projection["listLabel"], "listContext": projection["listContext"]}
        if projection else dict(listLabel=REDACTED, listContext=REDACTED)
    )
    actor_names_exist = c.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='actor_names'"
    ).fetchone()
    requester_name = c.execute("SELECT name FROM actor_names WHERE actor_id=?", (r["actor_id"],)).fetchone() if actor_names_exist else None
    return dict(displayLabel=subject_label(c, subject) if visible else REDACTED, **list_projection,
                requesterDisplayName=requester_name["name"] if requester_name else "Имя не задано",
                connectivityNeedId=r["need_id"], subject=dict(sourceDeploymentId=subject["source_deployment_id"], destinationDeploymentId=subject["destination_deployment_id"], interactionRevisionId=subject["interaction_revision_id"]), requestId=r["id"], subjectId=r["subject_id"], status=d["outcome"] if d else "PENDING",
                submittedAt=r["submitted_at"], requesterActorId=r["actor_id"],
                admission=dict(sourceResourceId=r["source_resource_id"], grantId=r["grant_id"], checkedAt=r["checked_at"]),
                decision=decision_view(c, d, actor, at) if d else None)


def process_view(row):
    return dict(processId=row["id"], name=row["name"], description=row["description"],
                responsibleOrganization=row["responsible_organization"])


def need_view(c, r):
    process = find(c, "processes", r["process_id"])
    revision = c.execute("SELECT * FROM interaction_revisions WHERE interaction_id=? ORDER BY id LIMIT 1", (r["interaction_id"],)).fetchone()
    label = (process["name"] or MISSING) + " · " + (interaction_label(c, revision) if revision else MISSING)
    return dict(displayLabel=label, connectivityNeedId=r["id"], processId=r["process_id"], interactionId=r["interaction_id"], componentId=r["component_id"])


class Service:
    def __init__(self, db, clock=now):
        self.db, self.clock = db, clock

    def create_process(self, actor, data):
        with self.db.transaction(write=True) as c:
            grant(c, actor, "business.process.create", "demo-business", self.clock())
            validate_process_name(data["name"])
            pid = uid()
            c.execute("INSERT INTO processes(id,name,description,responsible_organization) VALUES (?,?,?,?)",
                      (pid, data["name"], data.get("description"), data.get("responsibleOrganization")))
            return process_view(find(c, "processes", pid))

    def list_processes(self, actor, limit, offset):
        with self.db.transaction() as c:
            c.execute("SELECT id FROM actors LIMIT 1").fetchone()
            grant(c, actor, "business.process.read", "demo-business", self.clock())
            rows = c.execute("SELECT * FROM processes ORDER BY name ASC,id ASC LIMIT ? OFFSET ?",
                             (limit + 1, min(offset, 2**63 - 1))).fetchall()
            return dict(items=[process_view(r) for r in rows[:limit]], limit=limit,
                        offset=offset, hasMore=len(rows) > limit)

    def process(self, actor, pid):
        with self.db.transaction() as c:
            c.execute("SELECT id FROM actors LIMIT 1").fetchone()
            grant(c, actor, "business.process.read", "demo-business", self.clock())
            return process_view(find(c, "processes", pid))

    def _need_access(self, c, actor, pid, action):
        c.execute("SELECT id FROM actors LIMIT 1").fetchone()
        at = self.clock()
        grant(c, actor, "business.process.read", "demo-business", at)
        grant(c, actor, "business.need." + action, "demo-business", at)
        find(c, "processes", pid)

    def _compatible(self, c, rev):
        source = find(c, "components", rev["source_component_id"])
        dest = find(c, "components", rev["destination_component_id"])
        find(c, "applications", rev["application_id"])
        pair = (rev["application_id"], rev["source_component_id"], rev["destination_component_id"])
        if (source["application_id"] != pair[0] or dest["application_id"] != pair[0]
                or any(tuple(r) != pair for r in c.execute(
                    "SELECT application_id,source_component_id,destination_component_id FROM interaction_revisions WHERE interaction_id=?", (rev["interaction_id"],)))):
            raise Problem(400, "INVALID_COMMUNICATION", "Incompatible communication")

    def needs(self, actor, pid, limit, offset, options=False):
        with self.db.transaction() as c:
            self._need_access(c, actor, pid, "create" if options else "read")
            if options:
                items = []
                for r in c.execute("SELECT * FROM interaction_revisions ORDER BY interaction_id,id").fetchall():
                    try:
                        self._compatible(c, r)
                    except Problem:
                        continue
                    if c.execute("SELECT 1 FROM needs WHERE process_id=? AND interaction_id=? AND component_id=?", (pid, r["interaction_id"], r["source_component_id"])).fetchone():
                        continue
                    items.append(revision_view(c, r))
            else:
                items = [need_view(c, r) for r in c.execute("SELECT * FROM needs WHERE process_id=? ORDER BY id", (pid,))]
            return dict(items=items[offset:offset+limit], limit=limit, offset=offset, hasMore=len(items)>offset+limit)

    def create_need(self, actor, pid, revision):
        with self.db.transaction(write=True) as c:
            self._need_access(c, actor, pid, "create")
            rev = find(c, "interaction_revisions", revision)
            self._compatible(c, rev)
            nid = uid()
            try:
                c.execute("INSERT INTO needs VALUES (?,?,?,?)", (nid, pid, rev["interaction_id"], rev["source_component_id"]))
            except sqlite3.IntegrityError as error:
                if str(error) == "UNIQUE constraint failed: needs.process_id, needs.interaction_id, needs.component_id":
                    raise Problem(409, "DUPLICATE_NEED", "ConnectivityNeed already exists") from error
                raise
            return need_view(c, find(c, "needs", nid))

    def request_options(self, actor, pid, nid, kind, revision, limit, offset):
        # Synthetic local demo only: business scope is not a tenant boundary.
        with self.db.transaction() as c:
            c.execute("SELECT id FROM actors LIMIT 1").fetchone()
            at = self.clock()
            for action in ("business.process.read", "business.need.read"):
                grant(c, actor, action, "demo-business", at)
            find(c, "processes", pid)
            need = find(c, "needs", nid)
            if need["process_id"] != pid:
                raise Problem(404, "NOT_FOUND", "Entity not found")
            def placements(component, source=False):
                items = []
                for d in c.execute("SELECT d.* FROM deployments d JOIN resources r ON r.id=d.resource_id WHERE d.component_id=? ORDER BY d.id", (component,)):
                    try:
                        grant(c, actor, "access.options.read", d["resource_id"], at)
                        if source:
                            grant(c, actor, "access.request", d["resource_id"], at)
                    except Problem:
                        continue
                    items.append(deployment_view(c, d))
                return items
            items = []
            selected = None
            for r in c.execute("SELECT * FROM interaction_revisions WHERE interaction_id=? AND source_component_id=? ORDER BY id", (need["interaction_id"], need["component_id"])).fetchall():
                try:
                    self._compatible(c, r)
                except Problem:
                    continue
                sources = placements(r["source_component_id"], True)
                destinations = placements(r["destination_component_id"])
                if not sources or not destinations:
                    continue
                if kind == "revisions":
                    items.append(revision_view(c, r))
                elif r["id"] == revision:
                    selected = sources if kind == "source-deployments" else destinations
            if kind != "revisions":
                if selected is None:
                    raise Problem(404, "NOT_FOUND", "Entity not found")
                items = selected
            page = items[offset:offset + limit + 1]
            return dict(kind=kind, items=page[:limit], limit=limit, offset=offset, hasMore=len(page)>limit)

    def submit(self, actor, data):
        with self.db.transaction(write=True) as c:
            at = self.clock()
            source = c.execute("SELECT * FROM deployments WHERE id=?", (data["sourceDeploymentId"],)).fetchone()
            if source is None:
                raise Problem(403, "FORBIDDEN", "Insufficient authority")
            # Resolve source scope, then authorize before reading other referenced entities.
            g = grant(c, actor, "access.request", source["resource_id"], at)
            dest = find(c, "deployments", data["destinationDeploymentId"])
            rev = find(c, "interaction_revisions", data["interactionRevisionId"])
            need = find(c, "needs", data["connectivityNeedId"])
            find(c, "processes", need["process_id"])
            for resource in (source["resource_id"], dest["resource_id"]):
                find(c, "resources", resource)
            try:
                self._compatible(c, rev)
            except Problem as error:
                if error.status == 404:
                    raise
                raise Problem(400, "INVALID_SUBJECT", "Deployments, revision and Need do not correspond") from error
            subject = validate_subject(source, dest, rev, need,
                                       find(c, "components", source["component_id"]),
                                       find(c, "components", dest["component_id"]))
            c.execute("INSERT OR IGNORE INTO access_subjects VALUES (?,?,?,?)", (uid(), subject.source, subject.destination, subject.revision))
            sid = c.execute("SELECT id FROM access_subjects WHERE source_deployment_id=? AND destination_deployment_id=? AND interaction_revision_id=?", (subject.source, subject.destination, subject.revision)).fetchone()[0]
            rid = uid()
            c.execute("INSERT INTO access_requests VALUES (?,?,?,?,?,?,?,?)", (rid, sid, need["id"], actor, at, source["resource_id"], g["id"], at))
            return request_view(c, find(c, "access_requests", rid), actor, at)

    def request(self, actor, rid):
        with self.db.transaction() as c:
            r = c.execute("SELECT * FROM access_requests WHERE id=?", (rid,)).fetchone()
            if r is None:
                raise Problem(403, "FORBIDDEN", "Insufficient authority")
            at = self.clock()
            if r["actor_id"] != actor:
                grant(c, actor, "access.decide", "demo-policy", at)
            return request_view(c, r, actor, at)

    def list_requests(self, actor, limit, offset):
        with self.db.transaction() as c:
            # Pin one snapshot before sampling time, including grants and decision evidence.
            c.execute("SELECT id FROM actors LIMIT 1").fetchone()
            at = self.clock()
            can_decide = any(effective(g, at) for g in c.execute(
                "SELECT * FROM grants WHERE actor_id=? AND action='access.decide' AND scope='demo-policy'",
                (actor,)))
            rows = c.execute(
                "SELECT * FROM access_requests WHERE (? OR actor_id=?) "
                "ORDER BY submitted_at DESC,id DESC LIMIT ? OFFSET ?",
                # SQLite binds signed 64-bit integers; any larger offset is beyond its row capacity.
                (can_decide, actor, limit + 1, min(offset, 2**63 - 1))).fetchall()
            return dict(items=[request_view(c, r, actor, at) for r in rows[:limit]],
                        limit=limit, offset=offset, hasMore=len(rows) > limit)

    def decide(self, actor, rid, outcome):
        with self.db.transaction(write=True) as c:
            at = self.clock()
            grant(c, actor, "access.decide", "demo-policy", at)
            r = find(c, "access_requests", rid)
            if c.execute("SELECT 1 FROM decisions WHERE request_id=?", (rid,)).fetchone():
                raise Problem(409, "TERMINAL_REQUEST", "Request already decided")
            did = uid()
            c.execute("INSERT INTO decisions VALUES (?,?,?,?,?)", (did, rid, outcome, actor, at))
            if outcome == "ALLOWED":
                c.execute("INSERT OR IGNORE INTO policy_rules VALUES (?,?,?,'ACTIVE')", (uid(), r["subject_id"], did))
                rule = c.execute("SELECT id FROM policy_rules WHERE subject_id=?", (r["subject_id"],)).fetchone()[0]
                c.execute("INSERT INTO rule_allowances VALUES (?,?)", (rule, did))
            return decision_view(c, find(c, "decisions", did), actor, at)

    def _rule(self, c, actor, rid, at):
        rule = find(c, "policy_rules", rid)
        subject = find(c, "access_subjects", rule["subject_id"])
        src = find(c, "deployments", subject["source_deployment_id"])
        dst = find(c, "deployments", subject["destination_deployment_id"])
        for resource in (src["resource_id"], dst["resource_id"]):
            grant(c, actor, "policy.export", resource, at)
        return rule, subject, src, dst

    def rule(self, actor, rid):
        with self.db.transaction() as c:
            c.execute("SELECT id FROM actors LIMIT 1").fetchone()
            at = self.clock()
            rule, subject, _, _ = self._rule(c, actor, rid, at)
            origin = find(c, "decisions", rule["originating_decision_id"])
            req = find(c, "access_requests", origin["request_id"])
            allowances = [decision_view(c, d, actor, at) for d in c.execute("SELECT d.* FROM decisions d JOIN rule_allowances a ON a.decision_id=d.id WHERE a.rule_id=? ORDER BY d.decided_at,d.id", (rid,)).fetchall()]
            rev = find(c, "interaction_revisions", subject["interaction_revision_id"])
            projection = subject_list_projection(c, subject)
            rule_display = {key: projection[key] for key in ("participantsLabel", "applicationLabel", "sourceResourceLabel", "destinationResourceLabel", "trafficLabel")}
            return dict(**rule_display, displayLabel=subject_label(c, subject), ipProtocol=rev["protocol"], destinationPortStart=rev["port_start"], destinationPortEnd=rev["port_end"], ruleId=rid, subjectId=subject["id"], state=rule["state"],
                        subject=dict(sourceDeploymentId=subject["source_deployment_id"], destinationDeploymentId=subject["destination_deployment_id"], interactionRevisionId=subject["interaction_revision_id"]),
                        originatingDecision=decision_view(c, origin, actor, at), originatingRequest=request_view(c, req, actor, at),
                        connectivityNeedId=req["need_id"], allowances=allowances)

    def export(self, actor, rid):
        with self.db.transaction() as c:
            # This first read pins the WAL snapshot. Clock is sampled exactly once after pinning.
            c.execute("SELECT id FROM actors LIMIT 1").fetchone()
            at = self.clock()
            rule, subject, src, dst = self._rule(c, actor, rid, at)
            return dict(evaluationAt=at, selectedRuleId=rid, rows=self._export_rows(c, rule, subject, src, dst, at))

    def _export_rows(self, c, rule, subject, src, dst, at):
        rid = rule["id"]
        d = find(c, "decisions", rule["originating_decision_id"])
        r = find(c, "access_requests", d["request_id"])
        rows = []
        if rule["state"] == "ACTIVE" and d["outcome"] == "ALLOWED":
            se = c.execute("SELECT * FROM endpoints WHERE resource_id=?", (src["resource_id"],)).fetchone()
            de = c.execute("SELECT * FROM endpoints WHERE resource_id=?", (dst["resource_id"],)).fetchone()
            rev = find(c, "interaction_revisions", subject["interaction_revision_id"])
            rows.append(dict(ruleId=rid, subjectId=subject["id"], sourceResourceId=src["resource_id"], destinationResourceId=dst["resource_id"],
                sourceEndpointId=se["id"], destinationEndpointId=de["id"], sourceAddress=se["address"], destinationAddress=de["address"],
                ipProtocol=rev["protocol"], destinationPortStart=rev["port_start"], destinationPortEnd=rev["port_end"],
                readiness="READY" if se["address"] and de["address"] else "INCOMPLETE",
                interactionRevisionId=rev["id"], connectivityNeedId=r["need_id"], requestId=r["id"], requesterActorId=r["actor_id"],
                decisionId=d["id"], deciderActorId=d["actor_id"], evaluationAt=at, requestSubmittedAt=r["submitted_at"],
                decisionAt=d["decided_at"], sourceAddressKind=se["kind"], destinationAddressKind=de["kind"]))
        return rows

    def _visible_rules(self, c, actor, at, active_only=False):
        for r in c.execute("SELECT id FROM policy_rules WHERE (?=0 OR state='ACTIVE') ORDER BY id", (active_only,)).fetchall():
            try:
                yield self._rule(c, actor, r["id"], at)
            except Problem as error:
                if error.status != 403:
                    raise

    def list_rules(self, actor, limit, offset):
        with self.db.transaction() as c:
            c.execute("SELECT id FROM actors LIMIT 1").fetchone()
            at = self.clock()
            eligible = list(self._visible_rules(c, actor, at))
            page = eligible[offset:offset + limit + 1]
            items = []
            for rule, subject, src, dst in page[:limit]:
                rev = find(c, "interaction_revisions", subject["interaction_revision_id"])
                projection = subject_list_projection(c, subject)
                rule_display = {key: projection[key] for key in ("participantsLabel", "applicationLabel", "sourceResourceLabel", "destinationResourceLabel", "trafficLabel")}
                items.append(dict(**rule_display, ruleId=rule["id"], subjectId=subject["id"], state=rule["state"], displayLabel=subject_label(c, subject),
                    subject=dict(sourceDeploymentId=src["id"], destinationDeploymentId=dst["id"], interactionRevisionId=rev["id"]),
                    sourceResourceId=src["resource_id"], destinationResourceId=dst["resource_id"],
                    ipProtocol=rev["protocol"], destinationPortStart=rev["port_start"], destinationPortEnd=rev["port_end"],
                    originatingDecisionId=rule["originating_decision_id"],
                    allowanceDecisionIds=[r[0] for r in c.execute("SELECT decision_id FROM rule_allowances WHERE rule_id=? ORDER BY decision_id", (rule["id"],))]))
            return dict(items=items, limit=limit, offset=offset, hasMore=len(page) > limit)

    def export_current(self, actor):
        with self.db.transaction() as c:
            c.execute("SELECT id FROM actors LIMIT 1").fetchone()
            at = self.clock()
            rows = []
            for rule, subject, src, dst in self._visible_rules(c, actor, at, active_only=True):
                rows.extend(self._export_rows(c, rule, subject, src, dst, at))
            return dict(scope="authorized", evaluationAt=at, rows=rows)
