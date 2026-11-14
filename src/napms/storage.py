"""Small SQLite boundary. Every use case owns one connection and transaction."""
import sqlite3
from contextlib import closing, contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE resources(id TEXT PRIMARY KEY);
CREATE TABLE endpoints(id TEXT PRIMARY KEY, resource_id TEXT NOT NULL UNIQUE REFERENCES resources(id), address TEXT, kind TEXT CHECK(kind IN ('HOST','PREFIX')), CHECK((address IS NULL) = (kind IS NULL)));
CREATE TABLE applications(id TEXT PRIMARY KEY);
CREATE TABLE components(id TEXT PRIMARY KEY, application_id TEXT NOT NULL REFERENCES applications(id));
CREATE TABLE interaction_revisions(id TEXT PRIMARY KEY, interaction_id TEXT NOT NULL, application_id TEXT NOT NULL REFERENCES applications(id), source_component_id TEXT NOT NULL REFERENCES components(id), destination_component_id TEXT NOT NULL REFERENCES components(id), protocol TEXT NOT NULL CHECK(protocol IN ('TCP','UDP')), port_start INTEGER NOT NULL CHECK(port_start BETWEEN 1 AND 65535), port_end INTEGER NOT NULL CHECK(port_end BETWEEN port_start AND 65535));
CREATE TABLE deployments(id TEXT PRIMARY KEY, component_id TEXT NOT NULL REFERENCES components(id), resource_id TEXT NOT NULL REFERENCES resources(id));
CREATE TABLE processes(id TEXT PRIMARY KEY, name TEXT, description TEXT, responsible_organization TEXT);
CREATE TABLE needs(id TEXT PRIMARY KEY, process_id TEXT NOT NULL REFERENCES processes(id), interaction_id TEXT NOT NULL, component_id TEXT NOT NULL REFERENCES components(id));
CREATE TABLE actors(id TEXT PRIMARY KEY);
CREATE TABLE grants(id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES actors(id), action TEXT NOT NULL, scope TEXT NOT NULL, valid_from TEXT, valid_until TEXT);
CREATE TABLE access_subjects(id TEXT PRIMARY KEY, source_deployment_id TEXT NOT NULL REFERENCES deployments(id), destination_deployment_id TEXT NOT NULL REFERENCES deployments(id), interaction_revision_id TEXT NOT NULL REFERENCES interaction_revisions(id), UNIQUE(source_deployment_id,destination_deployment_id,interaction_revision_id));
CREATE TABLE access_requests(id TEXT PRIMARY KEY, subject_id TEXT NOT NULL REFERENCES access_subjects(id), need_id TEXT NOT NULL REFERENCES needs(id), actor_id TEXT NOT NULL REFERENCES actors(id), submitted_at TEXT NOT NULL, source_resource_id TEXT NOT NULL REFERENCES resources(id), grant_id TEXT NOT NULL REFERENCES grants(id), checked_at TEXT NOT NULL);
CREATE TABLE decisions(id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE REFERENCES access_requests(id), outcome TEXT NOT NULL CHECK(outcome IN ('ALLOWED','DENIED')), actor_id TEXT NOT NULL REFERENCES actors(id), decided_at TEXT NOT NULL);
CREATE TABLE policy_rules(id TEXT PRIMARY KEY, subject_id TEXT NOT NULL UNIQUE REFERENCES access_subjects(id), originating_decision_id TEXT NOT NULL UNIQUE REFERENCES decisions(id), state TEXT NOT NULL CHECK(state IN ('ACTIVE','INACTIVE')));
CREATE TABLE rule_allowances(rule_id TEXT NOT NULL REFERENCES policy_rules(id), decision_id TEXT NOT NULL UNIQUE REFERENCES decisions(id), PRIMARY KEY(rule_id,decision_id));
CREATE TRIGGER allowed_origin BEFORE INSERT ON policy_rules BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM decisions d JOIN access_requests r ON r.id=d.request_id WHERE d.id=NEW.originating_decision_id AND d.outcome='ALLOWED' AND r.subject_id=NEW.subject_id) THEN RAISE(ABORT,'invalid rule origin') END;
END;
CREATE TRIGGER allowed_evidence BEFORE INSERT ON rule_allowances BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM decisions d JOIN access_requests r ON r.id=d.request_id JOIN policy_rules p ON p.subject_id=r.subject_id WHERE p.id=NEW.rule_id AND d.id=NEW.decision_id AND d.outcome='ALLOWED') THEN RAISE(ABORT,'invalid allowance') END;
END;
"""


# Display metadata is deliberately outside immutable catalog rows.
NAMES_SCHEMA = """
CREATE TABLE resource_names(resource_id TEXT PRIMARY KEY NOT NULL REFERENCES resources(id), name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 300));
CREATE TABLE application_names(application_id TEXT PRIMARY KEY NOT NULL REFERENCES applications(id), name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 300));
CREATE TABLE component_names(component_id TEXT PRIMARY KEY NOT NULL REFERENCES components(id), name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 300));
CREATE TRIGGER unique_component_name_insert BEFORE INSERT ON component_names BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM component_names n JOIN components a ON a.id=n.component_id JOIN components b ON b.id=NEW.component_id WHERE a.application_id=b.application_id AND n.name=NEW.name AND n.component_id<>NEW.component_id) THEN RAISE(ABORT,'duplicate component name in application') END;
END;
CREATE TRIGGER unique_component_name_update BEFORE UPDATE ON component_names BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM component_names n JOIN components a ON a.id=n.component_id JOIN components b ON b.id=NEW.component_id WHERE a.application_id=b.application_id AND n.name=NEW.name AND n.component_id<>NEW.component_id) THEN RAISE(ABORT,'duplicate component name in application') END;
END;
"""

ACTOR_NAMES_SCHEMA = """
CREATE TABLE actor_names(actor_id TEXT PRIMARY KEY NOT NULL REFERENCES actors(id), name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 300));
"""


class Database:
    def __init__(self, path):
        self.path = Path(path)

    def connect(self):
        c = sqlite3.connect(self.path, timeout=15, isolation_level=None)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA foreign_keys=ON")
        return c

    def initialize(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self.connect()) as c:
            c.execute("PRAGMA journal_mode=WAL")
            version = c.execute("PRAGMA user_version").fetchone()[0]
            if version not in (0, 1, 2, 3, 4, 5, 6):
                raise RuntimeError("Unsupported database schema version")
            if version == 0:
                # executescript handles its own transaction; schema/version commit together.
                immutable = ("resources", "applications", "components", "interaction_revisions", "deployments", "processes", "needs", "access_subjects", "access_requests", "decisions", "rule_allowances")
                triggers = ""
                for table in immutable:
                    for operation in ("UPDATE", "DELETE"):
                        triggers += f"CREATE TRIGGER immutable_{table}_{operation} BEFORE {operation} ON {table} BEGIN SELECT RAISE(ABORT,'immutable record'); END;\n"
                triggers += "CREATE TRIGGER immutable_rule_identity BEFORE UPDATE OF id,subject_id,originating_decision_id ON policy_rules BEGIN SELECT RAISE(ABORT,'immutable rule identity'); END;"
                c.executescript("BEGIN IMMEDIATE;\n" + SCHEMA + triggers + "\nCREATE UNIQUE INDEX unique_need ON needs(process_id,interaction_id,component_id);\n" + NAMES_SCHEMA + ACTOR_NAMES_SCHEMA + "\nPRAGMA user_version=5; COMMIT;")

            elif version in (1, 2, 3):
                try:
                    c.execute("BEGIN IMMEDIATE")
                    if version == 1:
                        for column in ("name", "description", "responsible_organization"):
                            c.execute(f"ALTER TABLE processes ADD COLUMN {column} TEXT")
                    if version < 3 and c.execute("SELECT 1 FROM needs GROUP BY process_id,interaction_id,component_id HAVING count(*)>1 LIMIT 1").fetchone():
                        raise RuntimeError("Historical duplicate ConnectivityNeed tuples; migration rolled back")
                    if version < 3:
                        c.execute("CREATE UNIQUE INDEX unique_need ON needs(process_id,interaction_id,component_id)")
                    # sqlite3.executescript would implicitly commit the existing migration.
                    # complete_statement keeps trigger bodies together within this transaction.
                    statement = ""
                    for line in NAMES_SCHEMA.splitlines():
                        statement += line + "\n"
                        if sqlite3.complete_statement(statement):
                            c.execute(statement)
                            statement = ""
                    for line in ACTOR_NAMES_SCHEMA.splitlines():
                        statement += line + "\n"
                        if sqlite3.complete_statement(statement):
                            c.execute(statement)
                            statement = ""
                    c.execute("PRAGMA user_version=5")
                    c.commit()
                except BaseException:
                    c.rollback()
                    raise

            elif version == 4:
                try:
                    c.execute("BEGIN IMMEDIATE")
                    c.execute(ACTOR_NAMES_SCHEMA.strip())
                    c.execute("PRAGMA user_version=5")
                    c.commit()
                except BaseException:
                    c.rollback()
                    raise

            # v5 -> v6: source-port constraints are additive. NULL/NULL is ANY.
            # An existing v5 file, including immutable revisions/rules, is never rewritten.
            if c.execute("PRAGMA user_version").fetchone()[0] == 5:
                try:
                    c.execute("BEGIN IMMEDIATE")
                    columns = {r["name"] for r in c.execute("PRAGMA table_info(interaction_revisions)")}
                    if "source_port_start" not in columns:
                        c.execute("ALTER TABLE interaction_revisions ADD COLUMN source_port_start INTEGER CHECK(source_port_start BETWEEN 1 AND 65535)")
                    if "source_port_end" not in columns:
                        c.execute("ALTER TABLE interaction_revisions ADD COLUMN source_port_end INTEGER CHECK(source_port_end BETWEEN source_port_start AND 65535)")
                    c.execute("""CREATE TRIGGER IF NOT EXISTS valid_source_port_pair
                        BEFORE INSERT ON interaction_revisions
                        WHEN (NEW.source_port_start IS NULL) != (NEW.source_port_end IS NULL)
                        BEGIN SELECT RAISE(ABORT, 'invalid source port interval'); END""")
                    c.execute("PRAGMA user_version=6")
                    c.commit()
                except BaseException:
                    c.rollback()
                    raise

    @contextmanager
    def transaction(self, write=False):
        c = self.connect()
        try:
            if c.execute("PRAGMA user_version").fetchone()[0] != 6:
                raise RuntimeError("Initialize a supported database with init-demo first")
            c.execute("BEGIN IMMEDIATE" if write else "BEGIN")
            yield c
            c.commit()
        except BaseException:
            c.rollback()
            raise
        finally:
            c.close()
