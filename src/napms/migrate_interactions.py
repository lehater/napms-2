"""SQLite v7 → v8: reconcile directed Interaction identity without losing history."""
import json
from uuid import uuid4

from .domain import Problem
from .traffic_clauses import canonical_clauses, stored_clauses


def canonical_interaction(c, interaction_id):
    # Historical v1 fixtures invoke the service before any catalog migration.
    if c.execute("PRAGMA user_version").fetchone()[0] < 8:
        return interaction_id
    alias = c.execute(
        "SELECT canonical_id FROM interaction_aliases WHERE alias_id=?", (interaction_id,)
    ).fetchone()
    return alias["canonical_id"] if alias else interaction_id


def _plain(row):
    return [{key: value for key, value in clause.items() if key != "clauseIndex"}
            for clause in stored_clauses(row)]


def _union_or_fail(groups, pair):
    """Preserve all surviving traffic from the latest snapshot of every old identity."""
    clauses = []
    signatures = set()
    for group in groups:
        latest = group[-1]
        for clause in _plain(latest):
            key = (clause["ipProtocol"], clause["sourcePortStart"], clause["sourcePortEnd"],
                   clause["destinationPortStart"], clause["destinationPortEnd"])
            if key not in signatures:
                clauses.append(clause)
                signatures.add(key)
    try:
        return canonical_clauses(clauses)
    except Problem as error:
        raise RuntimeError(
            f"Cannot safely merge overlapping Interaction traffic for {pair}: {error.code}; "
            "migration rolled back, resolve this pair explicitly"
        ) from error


def upgrade_to_v8(c):
    """Call inside an immediate SQLite transaction. Any error rolls everything back."""
    c.execute("""CREATE TABLE IF NOT EXISTS interaction_aliases(
        alias_id TEXT PRIMARY KEY,
        canonical_id TEXT NOT NULL REFERENCES interaction_meta(interaction_id),
        purpose TEXT NOT NULL DEFAULT ''
    )""")
    # Backfill pre-v7 application fixtures that inserted legacy revisions directly.
    c.execute("""INSERT OR IGNORE INTO interaction_meta
        (interaction_id,application_id,source_component_id,destination_component_id,purpose)
        SELECT interaction_id,application_id,source_component_id,destination_component_id,''
        FROM interaction_revisions GROUP BY interaction_id""")
    duplicates = c.execute("""SELECT application_id,source_component_id,destination_component_id
        FROM interaction_meta
        GROUP BY application_id,source_component_id,destination_component_id
        HAVING COUNT(*) > 1
        ORDER BY application_id,source_component_id,destination_component_id""").fetchall()
    if duplicates:
        # Protected data may only be reorganized within this one migration transaction;
        # stable revision IDs, clauses, Needs and access-rule references are preserved.
        for name in ("immutable_interaction_meta_DELETE", "immutable_interaction_revisions_UPDATE"):
            c.execute(f"DROP TRIGGER IF EXISTS {name}")
        for pair in duplicates:
            app, src, dst = (pair["application_id"], pair["source_component_id"],
                             pair["destination_component_id"])
            members = c.execute("""SELECT * FROM interaction_meta
                WHERE application_id=? AND source_component_id=? AND destination_component_id=?
                ORDER BY CASE WHEN trim(purpose)!='' THEN 0 ELSE 1 END,interaction_id""",
                (app, src, dst)).fetchall()
            canonical = members[0]["interaction_id"]
            histories = [
                c.execute("""SELECT * FROM interaction_revisions
                    WHERE interaction_id=? ORDER BY revision_number,id""",
                    (member["interaction_id"],)).fetchall()
                for member in members
            ]
            if any(not history for history in histories):
                raise RuntimeError(f"Cannot merge Interaction without a revision: {app}/{src}/{dst}")
            combined = _union_or_fail(histories, f"{app}/{src}/{dst}")
            ordinal = 0
            for member, history in zip(members, histories):
                old_id = member["interaction_id"]
                if old_id != canonical:
                    c.execute("""INSERT INTO interaction_aliases(alias_id,canonical_id,purpose)
                        VALUES(?,?,?)""", (old_id, canonical, member["purpose"]))
                for revision in history:
                    ordinal += 1
                    c.execute("""UPDATE interaction_revisions
                        SET interaction_id=?,revision_number=? WHERE id=?""",
                        (canonical, ordinal, revision["id"]))
            # Only new published revision expresses the union. Historical exact snapshots
            # retain original IDs and traffic used by previously permitted policy.
            primary_latest = _plain(histories[0][-1])
            if combined != canonical_clauses(primary_latest):
                ordinal += 1
                first = combined[0]
                c.execute("""INSERT INTO interaction_revisions
                    (id,interaction_id,application_id,source_component_id,destination_component_id,
                     protocol,port_start,port_end,source_port_start,source_port_end,
                     revision_number,traffic_clauses_json)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (str(uuid4()), canonical, app, src, dst, first["ipProtocol"],
                     first["destinationPortStart"], first["destinationPortEnd"],
                     first["sourcePortStart"], first["sourcePortEnd"], ordinal,
                     json.dumps(combined, ensure_ascii=False, separators=(",", ":"), sort_keys=True)))
            for member in members[1:]:
                c.execute("DELETE FROM interaction_meta WHERE interaction_id=?",
                          (member["interaction_id"],))
        c.execute("""CREATE TRIGGER immutable_interaction_meta_DELETE
            BEFORE DELETE ON interaction_meta
            BEGIN SELECT RAISE(ABORT,'immutable interaction'); END""")
        c.execute("""CREATE TRIGGER immutable_interaction_revisions_UPDATE
            BEFORE UPDATE ON interaction_revisions
            BEGIN SELECT RAISE(ABORT,'immutable record'); END""")

    # This index is the authoritative uniqueness guard. It is direction-sensitive.
    c.execute("""CREATE UNIQUE INDEX unique_interaction_pair
        ON interaction_meta(application_id,source_component_id,destination_component_id)""")
    # Direct SQL insertions and seeded legacy revisions cannot bypass Interaction uniqueness.
    c.execute("""CREATE TRIGGER IF NOT EXISTS register_interaction_revision
        BEFORE INSERT ON interaction_revisions
        WHEN NOT EXISTS(SELECT 1 FROM interaction_meta
                        WHERE interaction_id=NEW.interaction_id)
        BEGIN
            INSERT INTO interaction_meta
              (interaction_id,application_id,source_component_id,destination_component_id,purpose)
            VALUES (NEW.interaction_id,NEW.application_id,NEW.source_component_id,
                    NEW.destination_component_id,'');
        END""")
    c.execute("PRAGMA user_version=8")
