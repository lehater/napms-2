import json
import subprocess
import sys
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from conftest import auth
from napms.dev import DEMO_REQUEST, IDS, init_demo, load_credentials
from napms.http import create_app
from napms.storage import Database
from test_acceptance import approved, change, decide, export, submit


def test_openapi_docs_and_no_secrets(env, caplog, capsys):
    schema = env[3].get('/openapi.json')
    assert schema.status_code == 200
    assert "/resources/{resourceId}/endpoint" in schema.json()['paths']
    assert env[3].get('/docs').status_code == 200
    assert schema.json()['components']['schemas']['AccessInput']['example'] == DEMO_REQUEST
    rid = approved(env)
    export(env, rid)
    output = schema.text + caplog.text + str(capsys.readouterr())
    for credential in env[4].values():
        assert credential['token'] not in output
        assert credential['token'] not in repr(env)


@pytest.mark.parametrize('authorization', [None, 'Bearer invalid', 'Basic invalid'])
def test_401_all_protected_operations(env, authorization):
    rid = approved(env)
    headers = {} if authorization is None else {'Authorization': authorization}
    for method, path, body in [
        ('POST', '/access-requests', DEMO_REQUEST),
        ('GET', '/access-requests/' + str(uuid4()), None),
        ('POST', '/access-requests/' + str(uuid4()) + '/decision', {'outcome': 'ALLOWED'}),
        ('GET', '/policy-rules/' + rid, None),
        ('GET', '/policy/export?ruleId=' + rid, None)]:
        response = env[3].request(method, path, headers=headers, **({'json': body} if body else {}))
        assert response.status_code == 401
        assert response.headers['www-authenticate'] == 'Bearer'
        assert response.json() == {'error': {'code': 'UNAUTHENTICATED', 'message': 'Valid bearer credential required'}}


def test_independent_authority_and_forgeries(env):
    request = submit(env)
    path = f'/access-requests/{request["requestId"]}/decision'
    for role in ('requester', 'exporter'):
        assert env[3].post(path, json={'outcome': 'ALLOWED'}, headers=auth(env, role)).status_code == 403
    for field in ('actorId', 'actor_id', 'grants', 'role', 'outcome'):
        payload = {**DEMO_REQUEST, field: 'forged'}
        r = env[3].post('/access-requests', json=payload, headers=auth(env, 'requester'))
        assert r.status_code == 422
        assert 'forged' not in r.text
    assert env[3].post(path, json={'outcome': 'ALLOWED', 'actorId': IDS['decider']}, headers=auth(env, 'requester')).status_code == 422
    assert env[3].get(f'/access-requests/{request["requestId"]}', headers=auth(env, 'exporter')).status_code == 403
    assert env[3].get(f'/access-requests/{request["requestId"]}', headers=auth(env, 'decider')).status_code == 200
    for role in ('decider', 'exporter'):
        assert env[3].post('/access-requests', json=DEMO_REQUEST, headers=auth(env, role)).status_code == 403
    rid = decide(env, request)['policyRuleId']
    for role in ('requester', 'decider'):
        assert export(env, rid, role=role).status_code == 403
        assert env[3].get(f'/policy-rules/{rid}', headers=auth(env, role)).status_code == 403
    assert env[3].post(path, json={'outcome': 'DENIED'}, headers=auth(env, 'decider')).status_code == 409



def test_local_demo_shared_read_preserves_mutation_authority(env):
    rid = approved(env)
    with env[0].transaction() as c:
        request_id = c.execute("SELECT id FROM access_requests LIMIT 1").fetchone()[0]
    with TestClient(create_app(env[0], load_credentials(env[1]), shared_read=True)) as client:
        for role in ("requester", "decider", "exporter"):
            headers = auth(env, role)
            for url in (
                "/business-processes",
                "/business-processes/" + IDS["process"],
                "/business-processes/" + IDS["process"] + "/needs",
                "/access-requests",
                "/access-requests/" + request_id,
                "/policy-rules",
                "/policy-rules/" + rid,
                "/policy/export/current?format=json",
                "/policy/export?ruleId=" + rid + "&format=json",
            ):
                assert client.get(url, headers=headers).status_code == 200, (role, url)
            assert any(r["requestId"] == request_id for r in client.get("/access-requests", headers=headers).json()["items"])
            assert any(r["ruleId"] == rid for r in client.get("/policy-rules", headers=headers).json()["items"])
        assert client.get("/policy-rules").status_code == 401
        assert client.post("/access-requests", json=DEMO_REQUEST, headers=auth(env, "decider")).status_code == 403
        assert client.post("/business-processes", json={"name": "No"}, headers=auth(env, "exporter")).status_code == 403
        assert client.post("/access-requests/" + request_id + "/decision", json={"outcome": "DENIED"},
                           headers=auth(env, "requester")).status_code == 403


@pytest.mark.parametrize('extra', ['evaluationAt=2000-01-01T00:00:00Z', 'actorId=forged', 'grants=forged'])
def test_unsupported_query(env, extra):
    rid = approved(env)
    assert env[3].get(f'/policy/export?ruleId={rid}&{extra}', headers=auth(env, 'exporter')).status_code == 422
    assert env[3].get(f'/policy-rules/{rid}?{extra}', headers=auth(env, 'exporter')).status_code == 422


@pytest.mark.parametrize('field', list(DEMO_REQUEST))
def test_malformed_and_absent_references(env, field):
    for value, status in [('not-a-uuid', 422), (str(uuid4()), 403 if field == 'sourceDeploymentId' else 404)]:
        response = env[3].post('/access-requests', json={**DEMO_REQUEST, field: value}, headers=auth(env, 'requester'))
        assert response.status_code == status
    with env[0].transaction() as c:
        assert c.execute('SELECT count(*) FROM access_requests').fetchone()[0] == 0


def test_semantics_before_persistence(env):
    # Give source authority for the reverse participant so role validation is exercised.
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO grants VALUES (?,?,?,?,NULL,NULL)', (str(uuid4()), IDS['requester'], 'access.request', IDS['destinationResource']))
    data = {**DEMO_REQUEST, 'sourceDeploymentId': IDS['destinationDeployment'], 'destinationDeploymentId': IDS['sourceDeployment']}
    assert env[3].post('/access-requests', json=data, headers=auth(env, 'requester')).status_code == 400
    with env[0].transaction() as c:
        assert c.execute('SELECT count(*) FROM access_subjects').fetchone()[0] == 0
    # No source authority must win over inspecting other protected references.
    data = {**DEMO_REQUEST, 'destinationDeploymentId': str(uuid4())}
    assert env[3].post('/access-requests', json=data, headers=auth(env, 'exporter')).status_code == 403


def test_seed_repeat_and_restart(env):
    rid = approved(env)
    old_credentials = env[1].read_bytes()
    change(env, 'UPDATE endpoints SET address=?,kind=? WHERE id=?', ('203.0.113.7', 'HOST', IDS['destinationEndpoint']))
    change(env, 'UPDATE grants SET valid_until=? WHERE id=?', ('2000-01-01T00:00:00Z', IDS['requestGrant']))
    init_demo(env[0], env[1])
    assert env[1].read_bytes() == old_credentials
    assert env[1].stat().st_mode & 0o777 == 0o600
    with TestClient(create_app(Database(env[0].path), load_credentials(env[1]))) as client:
        response = client.get('/policy/export', params={'ruleId': rid}, headers=auth(env, 'exporter'))
        assert response.json()['rows'][0]['destinationAddress'] == '203.0.113.7'
        assert client.post('/access-requests', json=DEMO_REQUEST, headers=auth(env, 'requester')).status_code == 403
    with env[0].transaction() as c:
        for table, count in [('resources', 2), ('actors', 3), ('grants', 12), ('access_requests', 1), ('decisions', 1), ('policy_rules', 1)]:
            assert c.execute(f'SELECT count(*) FROM {table}').fetchone()[0] == count


def test_fresh_seed_has_no_permission(env):
    with env[0].transaction() as c:
        for table in ('access_subjects', 'access_requests', 'decisions', 'policy_rules', 'rule_allowances'):
            assert c.execute(f'SELECT count(*) FROM {table}').fetchone()[0] == 0
    assert len(set(x['token'] for x in env[4].values())) == 3
    assert all(len(x['token']) >= 43 for x in env[4].values())
    other = env[1].parent / 'other.json'
    init_demo(Database(env[1].parent / 'other.db'), other)
    assert json.loads(other.read_text()) != env[4]


@pytest.mark.parametrize('host', ['0.0.0.0', '192.0.2.1', '::', 'localhost'])
def test_launcher_refuses_unsafe_host(host):
    result = subprocess.run([sys.executable, '-m', 'napms.dev', 'serve', '--host', host], capture_output=True, text=True)
    assert result.returncode != 0
    assert 'Only 127.0.0.1 or ::1' in result.stderr


def test_credentials_must_be_private(env):
    env[1].chmod(0o644)
    with pytest.raises(RuntimeError, match='0600'):
        load_credentials(env[1])
    with pytest.raises(RuntimeError):
        init_demo(env[0], env[1])


def test_no_secrets_in_git(env):
    ignored = subprocess.run(['git', 'check-ignore', 'var/dev-credentials.json', 'var/napms.sqlite3'], capture_output=True, text=True)
    assert ignored.returncode == 0
    tracked = subprocess.check_output(['git', 'ls-files'], text=True)
    assert 'var/' not in tracked.splitlines()
    for path in tracked.splitlines():
        from pathlib import Path
        p = Path(path)
        if p.is_file():
            contents = p.read_bytes()
            for cred in env[4].values():
                assert cred['token'].encode() not in contents
