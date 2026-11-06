import sqlite3
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from threading import Event
from uuid import uuid4

import pytest

from napms.dev import IDS
from napms.domain import Problem, Subject, effective, validate_subject
from napms.storage import Database
from napms.use_cases import Service
from test_acceptance import approved, change, decide, export, submit


def test_pure_domain_invariants():
    source = {'id': 'src', 'component_id': 'sender'}
    destination = {'id': 'dst', 'component_id': 'receiver'}
    revision = {'id': 'rev', 'source_component_id': 'sender', 'destination_component_id': 'receiver', 'application_id': 'app', 'interaction_id': 'interaction'}
    need = {'interaction_id': 'interaction', 'component_id': 'sender'}
    component = {'application_id': 'app'}
    assert validate_subject(source, destination, revision, need, component, component) == Subject('src', 'dst', 'rev')
    for invalid_revision, invalid_need, invalid_component in [
        ({**revision, 'source_component_id': 'receiver'}, need, component),
        ({**revision, 'destination_component_id': 'sender'}, need, component),
        ({**revision, 'application_id': 'other'}, need, component),
        (revision, {**need, 'interaction_id': 'other'}, component),
        (revision, {**need, 'component_id': 'receiver'}, component),
        (revision, need, {'application_id': 'other'}),
    ]:
        with pytest.raises(Problem) as error:
            validate_subject(source, destination, invalid_revision, invalid_need, component, invalid_component)
        assert error.value.status == 400
    s = Subject('src', 'dst', 'rev')
    assert s == replace(s)
    assert s != Subject('dst', 'src', 'rev')
    assert s != Subject('src', 'dst', 'rev2')


def test_database_constraints_and_immutability(env):
    r = submit(env)
    d = decide(env, r)
    checks = [
        ('INSERT INTO access_subjects SELECT ?,source_deployment_id,destination_deployment_id,interaction_revision_id FROM access_subjects', (str(uuid4()),)),
        ('INSERT INTO policy_rules SELECT ?,subject_id,originating_decision_id,state FROM policy_rules', (str(uuid4()),)),
        ('INSERT INTO decisions SELECT ?,request_id,outcome,actor_id,decided_at FROM decisions', (str(uuid4()),)),
        ('UPDATE decisions SET outcome=\'DENIED\'', ()),
        ('UPDATE interaction_revisions SET port_start=80', ()),
        ('UPDATE access_subjects SET interaction_revision_id=?', (str(uuid4()),)),
        ('UPDATE access_requests SET actor_id=?', (IDS['decider'],)),
        ('UPDATE policy_rules SET originating_decision_id=?', (str(uuid4()),)),
        ('INSERT INTO deployments VALUES (?,?,?)', (str(uuid4()), str(uuid4()), IDS['sourceResource'])),
    ]
    for sql, params in checks:
        with pytest.raises(sqlite3.IntegrityError):
            with env[0].transaction(write=True) as c:
                assert c.execute('PRAGMA foreign_keys').fetchone()[0] == 1
                c.execute(sql, params)
    denied = decide(env, submit(env), 'DENIED')
    with pytest.raises(sqlite3.IntegrityError):
        with env[0].transaction(write=True) as c:
            c.execute('INSERT INTO rule_allowances VALUES (?,?)', (d['policyRuleId'], denied['decisionId']))


def test_unknown_schema_fails_safely(tmp_path):
    db = Database(tmp_path / 'unknown.db')
    with db.connect() as c:
        c.execute('PRAGMA user_version=42')
    with pytest.raises(RuntimeError, match='Unsupported'):
        db.initialize()
    with pytest.raises(RuntimeError):
        with db.transaction():
            pass
    with db.connect() as c:
        assert c.execute('PRAGMA user_version').fetchone()[0] == 42
        assert not c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()


def test_atomic_allowance_rollback(env):
    request = submit(env)
    # Failure after decision + Rule insertion must roll back all three writes.
    with env[0].transaction(write=True) as c:
        c.execute("CREATE TRIGGER fail_allowance BEFORE INSERT ON rule_allowances BEGIN SELECT RAISE(ABORT,'injected failure'); END")
    with pytest.raises(sqlite3.IntegrityError, match='injected'):
        env[2].state.service.decide(IDS['decider'], request['requestId'], 'ALLOWED')
    with env[0].transaction() as c:
        for table in ('decisions', 'policy_rules', 'rule_allowances'):
            assert c.execute(f'SELECT count(*) FROM {table}').fetchone()[0] == 0
    with env[0].transaction(write=True) as c:
        c.execute('DROP TRIGGER fail_allowance')
    assert decide(env, request)['policyRuleId']


def test_concurrent_allowed_canonical_rule(env):
    requests = [submit(env) for _ in range(6)]
    service = env[2].state.service
    with ThreadPoolExecutor(max_workers=6) as pool:
        decisions = list(pool.map(lambda r: service.decide(IDS['decider'], r['requestId'], 'ALLOWED'), requests))
    assert len({d['policyRuleId'] for d in decisions}) == 1
    assert len({d['decisionId'] for d in decisions}) == 6
    with env[0].transaction() as c:
        assert c.execute('SELECT count(*) FROM policy_rules').fetchone()[0] == 1
        assert c.execute('SELECT count(*) FROM rule_allowances').fetchone()[0] == 6
    request = submit(env)
    def decide_same(_):
        try:
            return service.decide(IDS['decider'], request['requestId'], 'DENIED')['outcome']
        except Problem as error:
            return error.status
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(map(str, pool.map(decide_same, range(2)))) == ['409', 'DENIED']


@pytest.mark.parametrize('role,grant_key,operation', [
    ('requester', 'requestGrant', 'submit'),
    ('decider', 'decideGrant', 'decide'),
    ('exporter', 'sourceExportGrant', 'export'),
    ('exporter', 'destinationExportGrant', 'export'),
])
@pytest.mark.parametrize('start,end,allowed', [
    (None, None, True),
    ('2030-01-01T00:00:00Z', None, True),
    ('2030-01-01T00:00:00.000001Z', None, False),
    (None, '2030-01-01T00:00:00Z', False),
    (None, '2030-01-01T00:00:00.000001Z', True),
])
def test_grant_boundaries(env, role, grant_key, operation, start, end, allowed):
    rid = approved(env)
    pending = submit(env)
    change(env, 'UPDATE grants SET valid_from=?,valid_until=? WHERE id=?', (start, end, IDS[grant_key]))
    calls = []
    def clock():
        calls.append(1)
        return '2030-01-01T00:00:00Z'
    service = Service(env[0], clock)
    from napms.dev import DEMO_REQUEST
    invoke = {'submit': lambda: service.submit(IDS[role], DEMO_REQUEST),
              'decide': lambda: service.decide(IDS[role], pending['requestId'], 'ALLOWED'),
              'export': lambda: service.export(IDS[role], rid)}[operation]
    if allowed:
        result = invoke()
        if operation == 'export':
            assert result['evaluationAt'] == '2030-01-01T00:00:00Z'
            assert all(row['evaluationAt'] == result['evaluationAt'] for row in result['rows'])
    else:
        with pytest.raises(Problem) as error:
            invoke()
        assert error.value.status == 403
    assert calls == [1]


def test_timezone_grant_comparison():
    assert effective({'valid_from': '2030-01-01T03:00:00+03:00', 'valid_until': None}, '2030-01-01T00:00:00Z')
    assert not effective({'valid_from': None, 'valid_until': '2030-01-01T03:00:00+03:00'}, '2030-01-01T00:00:00Z')


@pytest.mark.parametrize('revoke', ['sourceExportGrant', 'destinationExportGrant'])
def test_export_pinned_snapshot_during_concurrent_writes(env, revoke):
    rid = approved(env)
    pinned, changed = Event(), Event()
    samples = []
    def clock():
        # Service calls this only after its snapshot-pinning SELECT.
        samples.append(1)
        pinned.set()
        assert changed.wait(5), 'writer did not commit'
        return '2030-01-01T00:00:00Z'
    service = Service(env[0], clock)
    def writer():
        assert pinned.wait(5), 'reader did not pin snapshot'
        try:
            with env[0].transaction(write=True) as c:
                c.execute('UPDATE endpoints SET address=? WHERE id=?', ('203.0.113.99', IDS['destinationEndpoint']))
                c.execute("UPDATE policy_rules SET state='INACTIVE' WHERE id=?", (rid,))
                c.execute('UPDATE grants SET valid_until=? WHERE id=?', ('2020-01-01T00:00:00Z', IDS[revoke]))
        finally:
            changed.set()
    with ThreadPoolExecutor(max_workers=2) as pool:
        write = pool.submit(writer)
        read = pool.submit(service.export, IDS['exporter'], rid)
        result = read.result(timeout=10)
        write.result(timeout=10)
    assert samples == [1]
    row, = result['rows']
    assert row['destinationAddress'] == '192.0.2.20'
    assert row['readiness'] == 'READY'
    assert export(env, rid).status_code == 403
    # Restore authority only; next export sees committed INACTIVE.
    change(env, 'UPDATE grants SET valid_until=NULL WHERE id=?', (IDS[revoke],))
    assert export(env, rid).json()['rows'] == []
    change(env, "UPDATE policy_rules SET state='ACTIVE' WHERE id=?", (rid,))
    assert export(env, rid).json()['rows'][0]['destinationAddress'] == '203.0.113.99'
