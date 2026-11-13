from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import pytest
from conftest import auth
from napms.dev import IDS
from napms.domain import Problem


def process(env):
    return env[3].post('/business-processes', headers=auth(env, 'requester'), json={'name': 'Need test'}).json()['processId']


def test_need_persistence_reuse_and_concurrency(env):
    pid = process(env)
    service = env[2].state.service
    before = service.needs(IDS['requester'], pid, 20, 0, True)
    assert len(before['items']) == 1
    def create(_):
        try:
            return service.create_need(IDS['requester'], pid, IDS['revision'])
        except Problem as e:
            return e.status
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(create, range(4)))
    assert results.count(409) == 3
    item = next(x for x in results if isinstance(x, dict))
    assert service.needs(IDS['requester'], pid, 20, 0)['items'] == [item]
    assert service.needs(IDS['requester'], pid, 20, 0, True)['items'] == []
    other = service.create_need(IDS['requester'], process(env), IDS['revision'])
    assert other['interactionId'] == item['interactionId']
    with env[0].transaction() as c:
        for table in ('access_requests', 'decisions', 'policy_rules'):
            assert c.execute(f'SELECT count(*) FROM {table}').fetchone()[0] == 0


@pytest.mark.parametrize('role,status', [(None,401),('decider',403),('exporter',403)])
def test_protected_need_endpoints(env, role, status):
    headers = auth(env, role) if role else {}
    for pid in (IDS['process'], str(uuid4())):
        path = f'/business-processes/{pid}'
        for suffix in ('needs', 'need-options'):
            r = env[3].get(path+'/'+suffix, headers=headers)
            assert r.status_code == status
            assert 'items' not in r.text
        assert env[3].post(path+'/needs', headers=headers, json={'interactionRevisionId':IDS['revision']}).status_code == status


def test_strict_http_and_independent_grants(env):
    pid = process(env)
    path = f'/business-processes/{pid}'
    headers = auth(env,'requester')
    for suffix in ('needs','need-options'):
        assert env[3].get(path+'/'+suffix,headers=headers).headers['cache-control'] == 'no-store'
        for q in ('limit=0','limit=101','offset=-1','actorId=x','scope=x'):
            assert env[3].get(path+'/'+suffix+'?'+q,headers=headers).status_code == 422
    for body in ({}, {'interactionRevisionId':'bad'}, {'interactionRevisionId':IDS['revision'],'componentId':IDS['sender']}):
        assert env[3].post(path+'/needs',headers=headers,json=body).status_code == 422
    assert env[3].post(path+'/needs',headers=headers,json={'interactionRevisionId':str(uuid4())}).status_code == 404
    for action in ('business.need.create','business.need.read','business.process.read'):
        with env[0].transaction(write=True) as c:
            c.execute("UPDATE grants SET valid_until='2000-01-01T00:00:00Z' WHERE action=?",(action,))
        assert env[3].get(path+'/needs',headers=headers).status_code == (200 if action == 'business.need.create' else 403)
        expected = 403 if action != 'business.need.read' else 200
        assert env[3].get(path+'/need-options',headers=headers).status_code == expected
        if expected == 403:
            assert env[3].post(path+'/needs',headers=headers,json={'interactionRevisionId':IDS['revision']}).status_code == 403
        with env[0].transaction(write=True) as c:
            c.execute('UPDATE grants SET valid_until=NULL WHERE action=?',(action,))


def test_conflicting_revisions_fail_closed(env):
    pid = process(env)
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO interaction_revisions SELECT ?,interaction_id,application_id,destination_component_id,source_component_id,protocol,port_start,port_end FROM interaction_revisions',(str(uuid4()),))
    service = env[2].state.service
    assert service.needs(IDS['requester'],pid,20,0,True)['items'] == []
    with pytest.raises(Problem) as e:
        service.create_need(IDS['requester'],pid,IDS['revision'])
    assert e.value.status == 400


def test_v2_duplicate_migration_is_atomic(env):
    db = env[0]
    with db.connect() as c:
        c.execute('DROP INDEX unique_need')
        c.execute('PRAGMA user_version=2')
        c.execute('INSERT INTO needs SELECT ?,process_id,interaction_id,component_id FROM needs',(str(uuid4()),))
    with pytest.raises(RuntimeError,match='duplicate'):
        db.initialize()
    with db.connect() as c:
        assert c.execute('PRAGMA user_version').fetchone()[0] == 2
        assert c.execute('SELECT count(*) FROM needs').fetchone()[0] == 2
        assert not c.execute("SELECT 1 FROM sqlite_master WHERE name='unique_need'").fetchone()


def test_v2_upgrade_preserves_rows_and_unique_constraint(env):
    import sqlite3
    db = env[0]
    with db.connect() as c:
        before = [tuple(r) for r in c.execute('SELECT * FROM needs')]
        c.execute('DROP INDEX unique_need')
        for table in ('component_names', 'application_names', 'resource_names'):
            c.execute(f'DROP TABLE {table}')
        c.execute('PRAGMA user_version=2')
    db.initialize()
    db.initialize()
    with db.transaction() as c:
        assert c.execute('PRAGMA user_version').fetchone()[0] == 4
        assert [tuple(r) for r in c.execute('SELECT * FROM needs')] == before
        assert not c.execute('PRAGMA foreign_key_check').fetchall()
    with pytest.raises(sqlite3.IntegrityError, match='needs.process_id'):
        with db.transaction(write=True) as c:
            c.execute('INSERT INTO needs SELECT ?,process_id,interaction_id,component_id FROM needs',(str(uuid4()),))


def test_options_paging_revision_identity_and_application_validation(env):
    pid = process(env)
    service = env[2].state.service
    rev2 = str(uuid4())
    interaction2 = str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO interaction_revisions SELECT ?,interaction_id,application_id,source_component_id,destination_component_id,protocol,80,80 FROM interaction_revisions',(rev2,))
        c.execute('INSERT INTO interaction_revisions SELECT ?,?,application_id,source_component_id,destination_component_id,protocol,port_start,port_end FROM interaction_revisions LIMIT 1',(str(uuid4()),interaction2))
    all_options = service.needs(IDS['requester'],pid,100,0,True)['items']
    assert all_options == sorted(all_options,key=lambda r:(r['interactionId'],r['interactionRevisionId']))
    assert len(all_options) == 3
    assert service.needs(IDS['requester'],pid,1,1,True)['items'] == all_options[1:2]
    service.create_need(IDS['requester'],pid,rev2)
    with pytest.raises(Problem) as e:
        service.create_need(IDS['requester'],pid,IDS['revision'])
    assert e.value.status == 409
    assert len(service.needs(IDS['requester'],pid,1,0,True)['items']) == 1
    assert not service.needs(IDS['requester'],pid,1,0,True)['hasMore']
    app = str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO applications VALUES (?)',(app,))
        c.execute('INSERT INTO interaction_revisions SELECT ?,?, ?,source_component_id,destination_component_id,protocol,port_start,port_end FROM interaction_revisions LIMIT 1',(str(uuid4()),str(uuid4()),app))
    assert len(service.needs(IDS['requester'],pid,100,0,True)['items']) == 1


def test_unrelated_integrity_failure_is_not_duplicate(env):
    import sqlite3
    pid = process(env)
    with env[0].transaction(write=True) as c:
        c.execute("CREATE TRIGGER injected_need BEFORE INSERT ON needs BEGIN SELECT RAISE(ABORT,'injected failure'); END")
    with pytest.raises(sqlite3.IntegrityError, match='injected failure'):
        env[2].state.service.create_need(IDS['requester'],pid,IDS['revision'])
    assert env[2].state.service.needs(IDS['requester'],pid,20,0)['items'] == []
