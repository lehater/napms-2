"""Transactions, authority checks and orchestration; no HTTP dependency."""
from uuid import uuid4

from .domain import Problem, effective, now, validate_subject


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


def decision_view(c, d):
    allowance = c.execute("SELECT rule_id FROM rule_allowances WHERE decision_id=?", (d["id"],)).fetchone()
    return dict(decisionId=d["id"], requestId=d["request_id"], outcome=d["outcome"],
                deciderActorId=d["actor_id"], decidedAt=d["decided_at"],
                policyRuleId=allowance[0] if allowance else None)


def request_view(c, r):
    d = c.execute("SELECT * FROM decisions WHERE request_id=?", (r["id"],)).fetchone()
    return dict(requestId=r["id"], subjectId=r["subject_id"], status=d["outcome"] if d else "PENDING",
                submittedAt=r["submitted_at"], requesterActorId=r["actor_id"],
                admission=dict(sourceResourceId=r["source_resource_id"], grantId=r["grant_id"], checkedAt=r["checked_at"]),
                decision=decision_view(c, d) if d else None)


class Service:
    def __init__(self, db, clock=now):
        self.db, self.clock = db, clock

    def submit(self, actor, data):
        with self.db.transaction(write=True) as c:
            source = find(c, "deployments", data["sourceDeploymentId"])
            at = self.clock()
            # Resolve source scope, then authorize before reading other referenced entities.
            g = grant(c, actor, "access.request", source["resource_id"], at)
            dest = find(c, "deployments", data["destinationDeploymentId"])
            rev = find(c, "interaction_revisions", data["interactionRevisionId"])
            need = find(c, "needs", data["connectivityNeedId"])
            subject = validate_subject(source, dest, rev, need,
                                       find(c, "components", source["component_id"]),
                                       find(c, "components", dest["component_id"]))
            c.execute("INSERT OR IGNORE INTO access_subjects VALUES (?,?,?,?)", (uid(), subject.source, subject.destination, subject.revision))
            sid = c.execute("SELECT id FROM access_subjects WHERE source_deployment_id=? AND destination_deployment_id=? AND interaction_revision_id=?", (subject.source, subject.destination, subject.revision)).fetchone()[0]
            rid = uid()
            c.execute("INSERT INTO access_requests VALUES (?,?,?,?,?,?,?,?)", (rid, sid, need["id"], actor, at, source["resource_id"], g["id"], at))
            return request_view(c, find(c, "access_requests", rid))

    def request(self, actor, rid):
        with self.db.transaction() as c:
            r = find(c, "access_requests", rid)
            if r["actor_id"] != actor:
                grant(c, actor, "access.decide", "demo-policy", self.clock())
            return request_view(c, r)

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
            return dict(items=[request_view(c, r) for r in rows[:limit]],
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
            return decision_view(c, find(c, "decisions", did))

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
            rule, subject, _, _ = self._rule(c, actor, rid, self.clock())
            origin = find(c, "decisions", rule["originating_decision_id"])
            req = find(c, "access_requests", origin["request_id"])
            allowances = [decision_view(c, d) for d in c.execute("SELECT d.* FROM decisions d JOIN rule_allowances a ON a.decision_id=d.id WHERE a.rule_id=? ORDER BY d.decided_at,d.id", (rid,)).fetchall()]
            return dict(ruleId=rid, subjectId=subject["id"], state=rule["state"],
                        subject=dict(sourceDeploymentId=subject["source_deployment_id"], destinationDeploymentId=subject["destination_deployment_id"], interactionRevisionId=subject["interaction_revision_id"]),
                        originatingDecision=decision_view(c, origin), originatingRequest=request_view(c, req),
                        connectivityNeedId=req["need_id"], allowances=allowances)

    def export(self, actor, rid):
        with self.db.transaction() as c:
            # This first read pins the WAL snapshot. Clock is sampled exactly once after pinning.
            c.execute("SELECT id FROM actors LIMIT 1").fetchone()
            at = self.clock()
            rule, subject, src, dst = self._rule(c, actor, rid, at)
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
            return dict(evaluationAt=at, selectedRuleId=rid, rows=rows)
