"""Collection visibility is applied before pagination, in one committed snapshot."""
from concurrent.futures import ThreadPoolExecutor
from threading import Event
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from conftest import auth
from napms.dev import DEMO_REQUEST, IDS, load_credentials
from napms.http import create_app
from napms.storage import Database
from napms.use_cases import Service
from test_acceptance import change, decide, submit


def listing(env, role='requester', **params):
    response = env[3].get('/access-requests', params=params, headers=auth(env, role))
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'
    return response.json()


def test_visibility_before_paging_and_historical_owner(env):
    first = submit(env)
    second = submit(env)
    # A genuinely distinct requester with a server-held grant and credential.
    other = str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO actors VALUES (?)', (other,))
        c.execute('INSERT INTO grants VALUES (?,?,?,?,NULL,NULL)',
                  (str(uuid4()), other, 'access.request', IDS['sourceResource']))
    foreign = env[2].state.service.submit(other, DEMO_REQUEST)
    credentials = load_credentials(env[1])
    import secrets
    token = secrets.token_urlsafe(32)
    with TestClient(create_app(env[0], {**credentials, token: other})) as client:
        response = client.get('/access-requests', headers={'Authorization': 'Bearer ' + token})
        assert response.json()['items'] == [foreign]
        assert client.get('/access-requests/' + first['requestId'], headers={'Authorization': 'Bearer ' + token}).status_code == 403
    assert listing(env)['items'] == [second, first]
    assert listing(env, limit=1)['items'] == [second]
    assert listing(env, limit=1)['hasMore'] is True
    assert listing(env, limit=1, offset=1) == dict(items=[first], limit=1, offset=1, hasMore=False)
    assert listing(env, offset=2)['items'] == []
    assert listing(env, 'decider')['items'] == [{**foreign,
                                                 'displayLabel': first['displayLabel'],
                                                 'listLabel': first['listLabel'],
                                                 'listContext': first['listContext']}, second, first]
    assert listing(env, 'exporter') == dict(items=[], limit=20, offset=0, hasMore=False)
    change(env, 'UPDATE grants SET valid_until=? WHERE id=?', ('2000-01-01T00:00:00Z', IDS['requestGrant']))
    assert listing(env)['items'] == [second, first]


@pytest.mark.parametrize('sql,params', [
    ('DELETE FROM grants WHERE id=?', (IDS['decideGrant'],)),
    ('UPDATE grants SET valid_until=? WHERE id=?', ('2000-01-01T00:00:00Z', IDS['decideGrant'])),
    ('UPDATE grants SET valid_from=? WHERE id=?', ('2999-01-01T00:00:00Z', IDS['decideGrant'])),
    ('UPDATE grants SET scope=? WHERE id=?', ('other-policy', IDS['decideGrant'])),
])
def test_decider_falls_back_to_own_requests(env, sql, params):
    submit(env)
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO grants VALUES (?,?,?,?,NULL,NULL)',
                  (str(uuid4()), IDS['decider'], 'access.request', IDS['sourceResource']))
    own = env[2].state.service.submit(IDS['decider'], DEMO_REQUEST)
    change(env, sql, params)
    assert listing(env, 'decider')['items'] == [{**own, 'displayLabel': 'Название недоступно',
                                                  'listLabel': 'Название недоступно',
                                                  'listContext': 'Название недоступно'}]


@pytest.mark.parametrize('query', ['limit=0', 'limit=101', 'limit=1.5', 'limit=true', 'offset=-1', 'offset=no',
                                     'actorId=forged', 'role=decider', 'grants=forged', 'scope=demo-policy', 'sort=id'])
def test_strict_queries(env, query):
    submit(env)
    response = env[3].get('/access-requests?' + query, headers=auth(env, 'requester'))
    assert response.status_code == 422
    assert response.json()['error']['code'] == 'INVALID_INPUT'
    assert 'requestId' not in response.text


@pytest.mark.parametrize('headers', [{}, {'Authorization': 'Bearer invalid'}])
def test_missing_or_invalid_credential(env, headers):
    submit(env)
    response = env[3].get('/access-requests', headers=headers)
    assert response.status_code == 401
    assert response.json()['error']['code'] == 'UNAUTHENTICATED'
    assert 'requestId' not in response.text


def test_ties_decisions_and_restart(env):
    env[2].state.service.clock = lambda: '2030-01-01T00:00:00Z'
    requests = [submit(env) for _ in range(3)]
    decide(env, requests[0])
    decide(env, requests[1], 'DENIED')
    items = listing(env)['items']
    assert [r['requestId'] for r in items] == sorted((r['requestId'] for r in requests), reverse=True)
    assert {r['status'] for r in items} == {'PENDING', 'ALLOWED', 'DENIED'}
    for item in items:
        assert item == env[3].get('/access-requests/' + item['requestId'], headers=auth(env, 'requester')).json()
    with TestClient(create_app(Database(env[0].path), load_credentials(env[1]))) as client:
        assert client.get('/access-requests', headers=auth(env, 'requester')).json()['items'] == items
    assert listing(env, limit=100, offset=100) == dict(items=[], limit=100, offset=100, hasMore=False)
    assert listing(env, offset=10**30) == dict(items=[], limit=20, offset=10**30, hasMore=False)


def test_list_pins_grants_and_decisions_in_one_snapshot(env):
    request = submit(env)
    pinned, changed = Event(), Event()
    calls = []
    def clock():
        calls.append(1)
        pinned.set()
        assert changed.wait(5)
        return '2030-01-01T00:00:00Z'
    service = Service(env[0], clock)
    def writer():
        assert pinned.wait(5)
        try:
            decide(env, request, 'DENIED')
            change(env, 'DELETE FROM grants WHERE id=?', (IDS['decideGrant'],))
        finally:
            changed.set()
    with ThreadPoolExecutor(max_workers=2) as pool:
        write = pool.submit(writer)
        result = service.list_requests(IDS['decider'], 20, 0)
        write.result(timeout=10)
    assert calls == [1]
    assert result['items'] == [request]  # Before concurrent decision and revocation.
    assert listing(env, 'decider')['items'] == []
    assert listing(env)['items'][0]['status'] == 'DENIED'
