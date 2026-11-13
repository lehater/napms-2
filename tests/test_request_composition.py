"""Discovery authority, admission independence and persisted composition contracts."""
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from threading import Event
from uuid import uuid4

import pytest

from conftest import auth
from napms.dev import DEMO_REQUEST, IDS, init_demo
from napms.use_cases import Service
from test_acceptance import submit, decide, change

PATH = f'/business-processes/{IDS["process"]}/needs/{IDS["need"]}/access-request-options'
TABLES = ('access_subjects', 'access_requests', 'decisions', 'policy_rules', 'rule_allowances')


def options(env, query='', role='requester', path=PATH):
    return env[3].get(path + query, headers=auth(env, role))


def counts(env):
    with env[0].transaction() as c:
        return [c.execute(f'SELECT count(*) FROM {t}').fetchone()[0] for t in TABLES]


def test_options_shapes_paging_and_address_independence(env):
    extra = str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO interaction_revisions SELECT ?,interaction_id,application_id,source_component_id,destination_component_id,protocol,80,80 FROM interaction_revisions', (extra,))
        c.execute('UPDATE endpoints SET address=NULL,kind=NULL')
    response = options(env, '?limit=1')
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'
    body = response.json()
    assert body['kind'] == 'revisions' and body['hasMore']
    assert body['items'][0]['interactionRevisionId'] == min(extra, IDS['revision'])
    assert set(body['items'][0]) == {'interactionRevisionId', 'interactionId', 'applicationId', 'sourceComponentId', 'destinationComponentId', 'ipProtocol', 'destinationPortStart', 'destinationPortEnd', 'displayLabel', 'trafficLabel'}
    assert len(options(env, '?offset=1').json()['items']) == 1
    assert options(env, '?offset=' + '9'*60).json()['items'] == []
    for kind, key in [('source-deployments', 'sourceDeployment'), ('destination-deployments', 'destinationDeployment')]:
        page = options(env, f'?kind={kind}&interactionRevisionId={extra}').json()
        assert page['items'][0]['deploymentId'] == IDS[key]
        assert set(page['items'][0]) == {'deploymentId', 'componentId', 'resourceId', 'displayLabel'}


@pytest.mark.parametrize('query', ['?kind=bad', '?limit=0', '?limit=101', '?offset=-1', '?offset=x', '?kind=source-deployments', '?interactionRevisionId='+IDS['revision'], '?kind=revisions&kind=revisions', '?limit=1&limit=2', '?actorId=forged', '?kind=destination-deployments&interactionRevisionId=bad'])
def test_strict_options_query(env, query):
    response = options(env, query)
    assert response.status_code == 422
    assert response.headers['cache-control'] == 'no-store'
    assert 'forged' not in response.text


@pytest.mark.parametrize('key', ['processReadGrant', 'needReadGrant'])
@pytest.mark.parametrize('column,value', [('valid_until', '2000-01-01T00:00:00Z'), ('valid_from', '2999-01-01T00:00:00Z'), ('scope', 'wrong')])
def test_business_gates_before_existence(env, key, column, value):
    change(env, f'UPDATE grants SET {column}=? WHERE id=?', (value, IDS[key]))
    real = options(env)
    random = options(env, path=f'/business-processes/{uuid4()}/needs/{uuid4()}/access-request-options')
    assert real.status_code == random.status_code == 403
    assert real.json() == random.json()
    assert submit(env)['status'] == 'PENDING'


@pytest.mark.parametrize('key', ['sourceOptionsGrant', 'destinationOptionsGrant', 'requestGrant'])
@pytest.mark.parametrize('column,value', [('valid_until','2000-01-01T00:00:00Z'), ('valid_from','2999-01-01T00:00:00Z'), ('scope','wrong')])
def test_hidden_pair_and_stale_revision(env, key, column, value):
    assert options(env).json()['items']
    change(env, f'UPDATE grants SET {column}=? WHERE id=?', (value, IDS[key]))
    assert options(env).json()['items'] == []
    stale = options(env, '?kind=source-deployments&interactionRevisionId='+IDS['revision'])
    absent = options(env, '?kind=source-deployments&interactionRevisionId='+str(uuid4()))
    assert stale.status_code == absent.status_code == 404
    assert stale.json() == absent.json()
    result = env[3].post('/access-requests', json=DEMO_REQUEST, headers=auth(env, 'requester'))
    assert result.status_code == (403 if key == 'requestGrant' else 201)


def test_auth_path_and_request_error_parity(env):
    assert env[3].get(PATH).status_code == 401
    assert options(env, role='decider').status_code == 403
    other = str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO processes(id,name) VALUES (?,?)', (other,'Other'))
    wrong = options(env, path=PATH.replace(IDS['process'],other))
    absent = options(env, path=PATH.replace(IDS['need'],str(uuid4())))
    assert wrong.status_code == absent.status_code == 404
    assert wrong.json() == absent.json()
    request = submit(env)
    for role in ['exporter','requester']:
        missing = env[3].get('/access-requests/'+str(uuid4()), headers=auth(env,role))
        assert missing.status_code == 403
        assert missing.headers['cache-control'] == 'no-store'
    hidden = env[3].get('/access-requests/'+request['requestId'], headers=auth(env,'exporter'))
    assert hidden.json() == missing.json()


def test_dto_historical_and_source_only_no_get(env):
    with env[0].transaction(write=True) as c:
        c.execute("DELETE FROM grants WHERE actor_id=? AND action!='access.request'", (IDS['requester'],))
    request = submit(env)
    assert request['connectivityNeedId'] == DEMO_REQUEST['connectivityNeedId']
    assert request['subject'] == {k:v for k,v in DEMO_REQUEST.items() if k != 'connectivityNeedId'}
    assert counts(env) == [1,1,0,0,0]
    decision = decide(env, request)
    change(env, 'UPDATE grants SET valid_until=? WHERE id=?', ('2000-01-01T00:00:00Z',IDS['requestGrant']))
    for role in ['requester','decider']:
        assert env[3].get('/access-requests/'+request['requestId'],headers=auth(env,role)).json()['subject'] == request['subject']
    listing = env[3].get('/access-requests',headers=auth(env,'requester')).json()['items'][0]
    nested = env[3].get('/policy-rules/'+decision['policyRuleId'],headers=auth(env,'exporter')).json()['originatingRequest']
    assert listing['displayLabel'] == 'Название недоступно'
    assert 'receiver.demo.example' in nested['displayLabel']
    assert {k: v for k, v in listing.items() if k not in ('displayLabel', 'listLabel', 'listContext', 'decision')} == {k: v for k, v in nested.items() if k not in ('displayLabel', 'listLabel', 'listContext', 'decision')}
    assert listing['listLabel'] == listing['listContext'] == 'Название недоступно'
    assert 'receiver.demo.example' in nested['listContext']
    assert {k: v for k, v in listing['decision'].items() if k != 'displayLabel'} == {k: v for k, v in nested['decision'].items() if k != 'displayLabel'}


def test_submission_neutral_precedence_and_atomic_failure(env):
    before = counts(env)
    absent = env[3].post('/access-requests', json={**DEMO_REQUEST, 'sourceDeploymentId':str(uuid4()),'connectivityNeedId':str(uuid4())},headers=auth(env,'requester'))
    unauthorized = env[3].post('/access-requests',json={**DEMO_REQUEST,'sourceDeploymentId':IDS['destinationDeployment']},headers=auth(env,'requester'))
    assert absent.status_code == unauthorized.status_code == 403
    assert absent.json() == unauthorized.json()
    for key in ['destinationDeploymentId','connectivityNeedId','interactionRevisionId']:
        response = env[3].post('/access-requests',json={**DEMO_REQUEST,key:str(uuid4())},headers=auth(env,'requester'))
        assert response.status_code == 404
        assert counts(env) == before
    change(env,"CREATE TRIGGER fail_request BEFORE INSERT ON access_requests BEGIN SELECT RAISE(ABORT,'injected'); END",())
    with pytest.raises(sqlite3.IntegrityError):
        env[2].state.service.submit(IDS['requester'], DEMO_REQUEST)
    assert counts(env) == before


def test_conflicting_interaction_group_is_not_selectable_or_submittable(env):
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO interaction_revisions SELECT ?,interaction_id,application_id,destination_component_id,source_component_id,protocol,80,80 FROM interaction_revisions', (str(uuid4()),))
    assert options(env).json()['items'] == []
    result = env[3].post('/access-requests',json=DEMO_REQUEST,headers=auth(env,'requester'))
    assert result.status_code == 400 and result.json()['error']['code'] == 'INVALID_SUBJECT'
    assert counts(env) == [0]*5


def test_read_snapshot_and_seed_upgrade(env):
    pinned, changed = Event(), Event()
    calls = []
    def clock():
        calls.append(1)
        pinned.set()
        assert changed.wait(5)
        return '2030-01-01T00:00:00Z'
    def writer():
        assert pinned.wait(5)
        change(env, 'DELETE FROM grants WHERE id=?',(IDS['destinationOptionsGrant'],))
        changed.set()
    with ThreadPoolExecutor(max_workers=2) as pool:
        future = pool.submit(writer)
        page = Service(env[0],clock).request_options(IDS['requester'], IDS['process'], IDS['need'], 'revisions',None,20,0)
        future.result()
    assert len(page['items']) == 1 and calls == [1]
    assert options(env).json()['items'] == []
    credentials = env[1].read_bytes()
    init_demo(env[0],env[1])
    assert env[1].read_bytes() == credentials
    with env[0].transaction() as c:
        assert c.execute('PRAGMA user_version').fetchone()[0] == 5
        assert c.execute("SELECT count(*) FROM grants WHERE action='access.options.read' AND actor_id!=?",(IDS['requester'],)).fetchone()[0] == 0


def test_filter_before_paging_and_compatible_deployments(env):
    visible, hidden = str(uuid4()), str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO resources VALUES (?)', (hidden,))
        c.execute('INSERT INTO deployments VALUES (?,?,?)', (hidden,IDS['sender'],hidden))
        c.execute('INSERT INTO deployments VALUES (?,?,?)', (visible,IDS['sender'],IDS['sourceResource']))
        # Wrong role on the source Resource must not appear among sources.
        c.execute('INSERT INTO deployments VALUES (?,?,?)', (str(uuid4()),IDS['receiver'],IDS['sourceResource']))
    query = '?kind=source-deployments&interactionRevisionId='+IDS['revision']+'&limit=1'
    first = options(env,query).json()
    second = options(env,query+'&offset=1').json()
    assert first['hasMore'] and not second['hasMore']
    assert [first['items'][0]['deploymentId'],second['items'][0]['deploymentId']] == sorted([IDS['sourceDeployment'],visible])
    assert hidden not in str(first)+str(second)


def test_other_need_same_subject_and_unrelated_revision(env):
    pid,nid,revision = str(uuid4()),str(uuid4()),str(uuid4())
    with env[0].transaction(write=True) as c:
        c.execute('INSERT INTO processes(id,name) VALUES (?,?)',(pid,'Independent justification'))
        c.execute('INSERT INTO needs VALUES (?,?,?,?)',(nid,pid,IDS['interaction'],IDS['sender']))
        c.execute('INSERT INTO interaction_revisions SELECT ?,?,application_id,source_component_id,destination_component_id,protocol,port_start,port_end FROM interaction_revisions',(revision,str(uuid4())))
    first = submit(env)
    a = decide(env,first)
    second = env[3].post('/access-requests',headers=auth(env,'requester'),json={**DEMO_REQUEST,'connectivityNeedId':nid}).json()
    assert first['subjectId'] == second['subjectId'] and first['requestId'] != second['requestId']
    assert decide(env,second)['policyRuleId'] == a['policyRuleId']
    before = counts(env)
    response = env[3].post('/access-requests',headers=auth(env,'requester'),json={**DEMO_REQUEST,'interactionRevisionId':revision})
    assert response.status_code == 400
    assert counts(env) == before


def test_expired_disclosure_seed_is_not_renewed(env):
    change(env,'UPDATE grants SET valid_until=? WHERE id=?',('2000-01-01T00:00:00Z',IDS['sourceOptionsGrant']))
    init_demo(env[0],env[1])
    assert options(env).json()['items'] == []
    assert submit(env)['status'] == 'PENDING'


@pytest.mark.parametrize('mismatch', ['need-participant', 'application', 'destination-role'])
def test_incompatible_saved_references_have_no_partial_writes(env, mismatch):
    data = dict(DEMO_REQUEST)
    with env[0].transaction(write=True) as c:
        if mismatch == 'need-participant':
            identifier = str(uuid4())
            c.execute('INSERT INTO needs VALUES (?,?,?,?)',(identifier,IDS['process'],IDS['interaction'],IDS['receiver']))
            data['connectivityNeedId'] = identifier
        elif mismatch == 'destination-role':
            data['destinationDeploymentId'] = IDS['sourceDeployment']
        else:
            app,rev = str(uuid4()),str(uuid4())
            c.execute('INSERT INTO applications VALUES (?)',(app,))
            c.execute('INSERT INTO interaction_revisions SELECT ?,?, ?,source_component_id,destination_component_id,protocol,port_start,port_end FROM interaction_revisions',(rev,str(uuid4()),app))
            data['interactionRevisionId'] = rev
    response = env[3].post('/access-requests',json=data,headers=auth(env,'requester'))
    assert response.status_code == 400
    assert counts(env) == [0]*5
