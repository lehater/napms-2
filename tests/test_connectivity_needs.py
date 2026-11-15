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
            return service.create_need(IDS['requester'], pid, IDS['revision'], 'Need test basis')
        except Problem as e:
            return e.status
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(create, range(4)))
    assert results.count(409) == 3
    item = next(x for x in results if isinstance(x, dict))
    assert service.needs(IDS['requester'], pid, 20, 0)['items'] == [item]
    assert service.needs(IDS['requester'], pid, 20, 0, True)['items'] == []
    other = service.create_need(IDS['requester'], process(env), IDS['revision'], 'Need test basis')
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
        assert env[3].post(path+'/needs', headers=headers, json={'interactionRevisionId':IDS['revision'], 'businessBasis':'Protected test'}).status_code == status


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
    assert env[3].post(path+'/needs',headers=headers,json={'interactionRevisionId':str(uuid4()),'businessBasis':'Missing revision test'}).status_code == 404
    for action in ('business.need.create','business.need.read','business.process.read'):
        with env[0].transaction(write=True) as c:
            c.execute("UPDATE grants SET valid_until='2000-01-01T00:00:00Z' WHERE action=?",(action,))
        assert env[3].get(path+'/needs',headers=headers).status_code == (200 if action == 'business.need.create' else 403)
        expected = 403 if action != 'business.need.read' else 200
        assert env[3].get(path+'/need-options',headers=headers).status_code == expected
        if expected == 403:
            assert env[3].post(path+'/needs',headers=headers,json={'interactionRevisionId':IDS['revision'],'businessBasis':'Grant test'}).status_code == 403
        with env[0].transaction(write=True) as c:
            c.execute('UPDATE grants SET valid_until=NULL WHERE action=?',(action,))


def test_conflicting_revisions_fail_closed(env):
    pid = process(env)
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO interaction_revisions(id,interaction_id,application_id,source_component_id,destination_component_id,protocol,port_start,port_end) SELECT ?,interaction_id,application_id,destination_component_id,source_component_id,protocol,port_start,port_end FROM interaction_revisions',(str(uuid4()),))
    service = env[2].state.service
    assert service.needs(IDS['requester'],pid,20,0,True)['items'] == []
    with pytest.raises(Problem) as e:
        service.create_need(IDS['requester'],pid,IDS['revision'],'Need test basis')
    assert e.value.status == 400


def test_v2_duplicate_migration_is_atomic(env):
    db = env[0]
    with db.connect() as c:
        c.execute('DROP INDEX unique_need')
        c.execute('PRAGMA user_version=2')
        c.execute('INSERT INTO needs(id,process_id,interaction_id,component_id) SELECT ?,process_id,interaction_id,component_id FROM needs',(str(uuid4()),))
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
        for table in ('actor_names', 'component_names', 'application_names', 'resource_names'):
            c.execute(f'DROP TABLE {table}')
        c.execute('PRAGMA user_version=2')
    db.initialize()
    db.initialize()
    with db.transaction() as c:
        assert c.execute('PRAGMA user_version').fetchone()[0] == 10
        assert [tuple(r) for r in c.execute('SELECT * FROM needs')] == before
        assert not c.execute('PRAGMA foreign_key_check').fetchall()
    with pytest.raises(sqlite3.IntegrityError, match='needs.process_id'):
        with db.transaction(write=True) as c:
            c.execute('INSERT INTO needs(id,process_id,interaction_id,component_id) SELECT ?,process_id,interaction_id,component_id FROM needs',(str(uuid4()),))


def test_options_paging_revision_identity_and_application_validation(env):
    pid = process(env)
    service = env[2].state.service
    rev2 = str(uuid4())
    interaction2 = str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO interaction_revisions(id,interaction_id,application_id,source_component_id,destination_component_id,protocol,port_start,port_end) SELECT ?,interaction_id,application_id,source_component_id,destination_component_id,protocol,80,80 FROM interaction_revisions',(rev2,))
        c.execute('INSERT INTO interaction_revisions(id,interaction_id,application_id,source_component_id,destination_component_id,protocol,port_start,port_end) SELECT ?,?,application_id,destination_component_id,source_component_id,protocol,port_start,port_end FROM interaction_revisions LIMIT 1',(str(uuid4()),interaction2))
    all_options = service.needs(IDS['requester'],pid,100,0,True)['items']
    assert all_options == sorted(all_options,key=lambda r:(r['interactionId'],r['interactionRevisionId']))
    assert len(all_options) == 3
    assert service.needs(IDS['requester'],pid,1,1,True)['items'] == all_options[1:2]
    service.create_need(IDS['requester'],pid,rev2,'Need test basis')
    with pytest.raises(Problem) as e:
        service.create_need(IDS['requester'],pid,IDS['revision'],'Need test basis')
    assert e.value.status == 409
    assert len(service.needs(IDS['requester'],pid,1,0,True)['items']) == 1
    assert not service.needs(IDS['requester'],pid,1,0,True)['hasMore']
    app = str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO applications VALUES (?)',(app,))
        c.execute('INSERT INTO interaction_revisions(id,interaction_id,application_id,source_component_id,destination_component_id,protocol,port_start,port_end) SELECT ?,?, ?,source_component_id,destination_component_id,protocol,port_start,port_end FROM interaction_revisions LIMIT 1',(str(uuid4()),str(uuid4()),app))
    assert len(service.needs(IDS['requester'],pid,100,0,True)['items']) == 1


def test_unrelated_integrity_failure_is_not_duplicate(env):
    import sqlite3
    pid = process(env)
    with env[0].transaction(write=True) as c:
        c.execute("CREATE TRIGGER injected_need BEFORE INSERT ON needs BEGIN SELECT RAISE(ABORT,'injected failure'); END")
    with pytest.raises(sqlite3.IntegrityError, match='injected failure'):
        env[2].state.service.create_need(IDS['requester'],pid,IDS['revision'],'Need test basis')
    assert env[2].state.service.needs(IDS['requester'],pid,20,0)['items'] == []


def test_v9_need_migration_preserves_history_and_identity(env):
    import sqlite3
    db = env[0]
    with db.connect() as c:
        before_need = tuple(c.execute('SELECT id,process_id,interaction_id,component_id FROM needs WHERE id=?', (IDS['need'],)).fetchone())
        c.execute('DROP TRIGGER immutable_need_identity')
        c.execute('ALTER TABLE needs DROP COLUMN business_basis')
        c.execute('ALTER TABLE needs DROP COLUMN status')
        c.execute("CREATE TRIGGER immutable_needs_UPDATE BEFORE UPDATE ON needs BEGIN SELECT RAISE(ABORT,'immutable record'); END")
        c.execute('PRAGMA user_version=9')
    db.initialize()
    db.initialize()
    with db.transaction() as c:
        assert c.execute('PRAGMA user_version').fetchone()[0] == 10
        row = c.execute('SELECT * FROM needs WHERE id=?', (IDS['need'],)).fetchone()
        assert tuple(row[key] for key in ('id','process_id','interaction_id','component_id')) == before_need
        assert row['business_basis'] is None and row['status'] == 'ACTIVE'
        assert c.execute('SELECT count(*) FROM access_requests').fetchone()[0] == 0
    with pytest.raises(sqlite3.IntegrityError, match='immutable need identity'):
        with db.transaction(write=True) as c:
            c.execute('UPDATE needs SET process_id=? WHERE id=?', (str(uuid4()), IDS['need']))
    with pytest.raises(sqlite3.IntegrityError, match='immutable record'):
        with db.transaction(write=True) as c:
            c.execute('DELETE FROM needs WHERE id=?', (IDS['need'],))
    with db.transaction(write=True) as c:
        c.execute("UPDATE needs SET business_basis='Исправленное обоснование' WHERE id=?", (IDS['need'],))
        c.execute("UPDATE needs SET status='RETIRED' WHERE id=?", (IDS['need'],))
    with pytest.raises(sqlite3.IntegrityError, match='immutable need identity or basis'):
        with db.transaction(write=True) as c:
            c.execute('UPDATE needs SET business_basis=NULL WHERE id=?', (IDS['need'],))


def test_need_detail_edit_retire_history_and_restore(env):
    from napms.dev import DEMO_REQUEST
    from test_acceptance import submit

    client = env[3]
    path = f"/business-processes/{IDS['process']}/needs/{IDS['need']}"
    headers = auth(env, 'requester')
    assert client.get(path, headers=headers).status_code == 200
    detail = client.get(path, headers=headers).json()
    assert detail['process']['processId'] == IDS['process']
    assert detail['participant']['componentId'] == IDS['sender']
    assert detail['businessBasis'] == 'Демонстрационная потребность'
    assert detail['requests']['items'] == []
    assert client.patch(path, headers=headers, json={'businessBasis':'   '}).status_code == 422
    assert client.patch(path, headers=headers, json={'businessBasis':'Обоснование владельца потребности'}).status_code == 200

    request = submit(env)
    assert request['connectivityNeedId'] == DEMO_REQUEST['connectivityNeedId']
    assert client.patch(path+'/lifecycle', headers=headers, json={'status':'RETIRED'}).status_code == 200
    retired = client.get(path+'?limit=20&offset=0', headers=headers).json()
    assert retired['status'] == 'RETIRED'
    assert retired['requests']['items'][0]['requestId'] == request['requestId']
    assert retired['requests']['items'][0]['status'] == 'PENDING'
    with env[0].transaction() as c:
        before = [c.execute(f'SELECT count(*) FROM {table}').fetchone()[0]
                  for table in ('access_subjects','access_requests','decisions','policy_rules','rule_allowances')]
    rejected = client.post('/access-requests', headers=headers, json=DEMO_REQUEST)
    assert rejected.status_code == 409 and rejected.json()['error']['code'] == 'NEED_RETIRED'
    with env[0].transaction() as c:
        after = [c.execute(f'SELECT count(*) FROM {table}').fetchone()[0]
                 for table in ('access_subjects','access_requests','decisions','policy_rules','rule_allowances')]
    assert after == before
    assert client.patch(f"/business-processes/{IDS['process']}/status", headers=headers,
                        json={'status':'ARCHIVED'}).status_code == 200
    blocked_restore = client.patch(path+'/lifecycle', headers=headers, json={'status':'ACTIVE'})
    assert blocked_restore.status_code == 409
    assert blocked_restore.json()['error']['code'] == 'PROCESS_ARCHIVED'
    assert client.patch(f"/business-processes/{IDS['process']}/status", headers=headers,
                        json={'status':'ACTIVE'}).status_code == 200
    assert client.patch(path+'/lifecycle', headers=headers, json={'status':'ACTIVE'}).status_code == 200
    assert client.patch(path+'/lifecycle', headers=headers, json={'status':'BAD'}).status_code == 422


def test_need_update_and_lifecycle_grants_are_independent(env):
    pid = IDS['process']
    headers = auth(env, 'requester')
    path = f'/business-processes/{pid}/needs/{IDS["need"]}'
    with env[0].transaction(write=True) as c:
        c.execute("UPDATE grants SET valid_until='2000-01-01T00:00:00Z' WHERE id=?", (IDS['needUpdateGrant'],))
    assert env[3].patch(path, headers=headers, json={'businessBasis':'Denied edit'}).status_code == 403
    assert env[3].patch(path+'/lifecycle', headers=headers, json={'status':'RETIRED'}).status_code == 200
    with env[0].transaction(write=True) as c:
        c.execute('UPDATE grants SET valid_until=NULL WHERE id=?', (IDS['needUpdateGrant'],))
        c.execute("UPDATE grants SET valid_until='2000-01-01T00:00:00Z' WHERE id=?", (IDS['needLifecycleGrant'],))
    assert env[3].patch(path, headers=headers, json={'businessBasis':'Allowed edit'}).status_code == 200
    assert env[3].patch(path+'/lifecycle', headers=headers, json={'status':'ACTIVE'}).status_code == 403
