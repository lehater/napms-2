import sqlite3
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from conftest import auth
from napms.dev import DEMO_REQUEST, IDS, init_demo, load_credentials
from napms.domain import Problem
from napms.http import create_app
from napms.storage import Database
from napms.use_cases import Service


def counts(db):
    with db.transaction() as c:
        return {r['name']: c.execute(f'SELECT count(*) FROM {r["name"]}').fetchone()[0]
                for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}


def test_create_list_get_restart(env):
    db, path, _, client, _ = env
    before = counts(db)
    data = dict(name='Расчёт платежей', description='Описание', responsibleOrganization='Финансы')
    response = client.post('/business-processes', json=data, headers=auth(env, 'requester'))
    assert response.status_code == 201
    item = response.json()
    assert UUID(item['processId']).version == 4
    assert item == dict(processId=item['processId'], **data)
    assert counts(db) == {**before, 'processes': before['processes'] + 1}
    init_demo(db, path)
    with TestClient(create_app(Database(db.path), load_credentials(path))) as restarted:
        detail = restarted.get('/business-processes/' + item['processId'], headers=auth(env, 'requester'))
        assert detail.json() == item
        assert detail.headers['cache-control'] == 'no-store'
        page = restarted.get('/business-processes', headers=auth(env, 'requester'))
        assert page.headers['cache-control'] == 'no-store'
        assert item in page.json()['items']


@pytest.mark.parametrize('body', [dict(name=''), dict(name=' \n\t'), {}, dict(name=123),
    dict(name='a', processId=str(uuid4())), dict(name='a', actorId='x'), dict(name='a', grant='x'),
    dict(name='a', description=7), dict(name='a', responsibleOrganization=[]), dict(name='x'*301),
    dict(name='a', description='x'*10001), dict(name='a', responsibleOrganization='x'*301)])
def test_invalid_input_has_no_writes(env, body):
    before = counts(env[0])
    assert env[3].post('/business-processes', json=body, headers=auth(env, 'requester')).status_code == 422
    assert counts(env[0]) == before


@pytest.mark.parametrize('query', ['limit=0', 'limit=101', 'offset=-1', 'limit=x', 'actorId=x', 'scope=x', 'sort=id'])
def test_invalid_query(env, query):
    assert env[3].get('/business-processes?' + query, headers=auth(env, 'requester')).status_code == 422


def test_paging_and_nulls(env):
    client, headers = env[3], auth(env, 'requester')
    for name in ['Z', 'A', 'A']:
        result = client.post('/business-processes', json={'name': name}, headers=headers).json()
        assert result['description'] is None and result['responsibleOrganization'] is None
    all_items = client.get('/business-processes', headers=headers).json()['items']
    assert all_items == sorted(all_items, key=lambda r: (r['name'], r['processId']))
    pages = [client.get(f'/business-processes?limit=1&offset={i}', headers=headers).json() for i in range(5)]
    assert [p['items'][0] for p in pages[:4]] == all_items
    assert [p['hasMore'] for p in pages] == [True, True, True, False, False]
    assert client.get('/business-processes?offset=' + str(2**100), headers=headers).json()['items'] == []
    assert client.get('/business-processes/' + str(uuid4()), headers=headers).status_code == 404
    for method, route in [('post', '/business-processes?actorId=x'), ('get', '/business-processes/' + IDS['process'] + '?scope=x')]:
        kwargs = {'json': {'name': 'a'}} if method == 'post' else {}
        assert getattr(client, method)(route, headers=headers, **kwargs).status_code == 422


@pytest.mark.parametrize('role,status', [(None, 401), ('decider', 403), ('exporter', 403)])
def test_authorization_no_disclosure_or_writes(env, role, status):
    before = counts(env[0])
    headers = auth(env, role) if role else {}
    for path in ['/business-processes', '/business-processes/' + IDS['process'], '/business-processes/' + str(uuid4())]:
        response = env[3].get(path, headers=headers)
        assert response.status_code == status
        assert 'processId' not in response.text
    assert env[3].post('/business-processes', json={'name': 'a'}, headers=headers).status_code == status
    assert counts(env[0]) == before
    assert env[3].get('/business-processes', headers={'Authorization': 'Bearer invalid'}).status_code == 401


@pytest.mark.parametrize('action', ['read', 'create'])
@pytest.mark.parametrize('change', ["valid_until='2000-01-01T00:00:00Z'", "valid_from='2999-01-01T00:00:00Z'", "scope='other'"])
def test_independent_effective_grants(env, action, change):
    with env[0].transaction(write=True) as c:
        c.execute(f"UPDATE grants SET {change} WHERE action=?", ('business.process.' + action,))
    headers, client = auth(env, 'requester'), env[3]
    before = counts(env[0])
    assert client.get('/business-processes', headers=headers).status_code == (403 if action == 'read' else 200)
    response = client.post('/business-processes', json={'name': 'a'}, headers=headers)
    assert response.status_code == (403 if action == 'create' else 201)
    assert counts(env[0])['processes'] == before['processes'] + (action == 'read')


def test_application_nonblank_validation(env):
    with pytest.raises(Problem) as error:
        Service(env[0]).create_process(IDS['requester'], {'name': ' '})
    assert error.value.status == 422


def test_historical_v1_upgrade(env):
    # Build a historical database with the schema and initializer from accepted main,
    # independently of the current v2 schema.
    from pathlib import Path
    from contextlib import contextmanager

    class LegacyDatabase(Database):
        @contextmanager
        def transaction(self, write=False):
            c = self.connect()
            try:
                c.execute("BEGIN IMMEDIATE" if write else "BEGIN")
                yield c
                c.commit()
            except BaseException:
                c.rollback()
                raise
            finally:
                c.close()

    legacy = LegacyDatabase(env[0].path.parent / 'v1.sqlite3')
    with legacy.connect() as c:
        c.execute('PRAGMA foreign_keys=OFF')
        c.executescript((Path(__file__).parent / 'fixtures/schema-v1.sql').read_text())
    service = Service(legacy)
    request = service.submit(IDS['requester'], DEMO_REQUEST)
    decision = service.decide(IDS['decider'], request['requestId'], 'ALLOWED')
    with legacy.transaction() as c:
        before = {r[0]: [tuple(row) for row in c.execute(f'SELECT * FROM {r[0]}')]
                  for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
        triggers = [tuple(row) for row in c.execute("SELECT name,sql FROM sqlite_master WHERE type='trigger' ORDER BY name")]
    db = Database(legacy.path)
    init_demo(db, env[1])
    init_demo(db, env[1])
    with db.transaction() as c:
        assert c.execute('PRAGMA user_version').fetchone()[0] == 3
        assert c.execute('PRAGMA foreign_key_check').fetchall() == []
        assert [tuple(row) for row in c.execute("SELECT name,sql FROM sqlite_master WHERE type='trigger' ORDER BY name")] == triggers
        for table, rows in before.items():
            actual = [tuple(row) for row in c.execute(f'SELECT * FROM {table}')]
            if table == 'processes':
                assert actual == [(*row, None, None, None) for row in rows]
            elif table == 'grants':
                assert all(row in actual for row in rows)
            else:
                assert actual == rows
    assert Service(db).process(IDS['requester'], IDS['process'])['name'] is None
    assert Service(db).export(IDS['exporter'], decision['policyRuleId'])['rows']
    item = Service(db).create_process(IDS['requester'], {'name': 'После миграции'})
    assert Service(Database(db.path)).process(IDS['requester'], item['processId']) == item
    for sql in ["UPDATE processes SET name='changed'", 'DELETE FROM processes',
                "INSERT INTO needs VALUES ('invalid','missing','interaction','component')"]:
        with pytest.raises(sqlite3.IntegrityError):
            with db.transaction(write=True) as c:
                c.execute(sql)


def test_migration_failure_rolls_back_all_columns_and_version(tmp_path):
    from pathlib import Path
    db = Database(tmp_path / 'broken-v1.sqlite3')
    with db.connect() as c:
        c.execute('PRAGMA foreign_keys=OFF')
        c.executescript((Path(__file__).parent / 'fixtures/schema-v1.sql').read_text())
        # Simulate an inconsistent v1: migration fails on its second ALTER.
        c.execute('ALTER TABLE processes ADD COLUMN description TEXT')
        before = list(c.execute('SELECT * FROM processes'))
    with pytest.raises(sqlite3.OperationalError, match='duplicate column'):
        db.initialize()
    with db.connect() as c:
        assert c.execute('PRAGMA user_version').fetchone()[0] == 1
        assert [r['name'] for r in c.execute('PRAGMA table_info(processes)')] == ['id', 'description']
        assert list(c.execute('SELECT * FROM processes')) == before
        assert c.execute('PRAGMA foreign_key_check').fetchall() == []
