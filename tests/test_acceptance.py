import csv
import io
from uuid import uuid4

import pytest

from conftest import auth
from napms.dev import DEMO_REQUEST, IDS
from napms.http import COLUMNS


def submit(env):
    response = env[3].post('/access-requests', json=DEMO_REQUEST, headers=auth(env, 'requester'))
    assert response.status_code == 201, response.text
    return response.json()


def decide(env, request, outcome='ALLOWED'):
    response = env[3].post(f'/access-requests/{request["requestId"]}/decision', json={'outcome': outcome}, headers=auth(env, 'decider'))
    assert response.status_code == 201, response.text
    return response.json()


def approved(env):
    return decide(env, submit(env))['policyRuleId']


def export(env, rid, fmt='json', role='exporter'):
    return env[3].get('/policy/export', params={'ruleId': rid, 'format': fmt}, headers=auth(env, role))


def change(env, sql, params=()):
    with env[0].transaction(write=True) as c:
        c.execute(sql, params)


def test_ac01_ready_and_csv(env):
    request = submit(env)
    assert request['status'] == 'PENDING'
    assert request['decision'] is None
    assert request['admission']['sourceResourceId'] == IDS['sourceResource']
    decision = decide(env, request)
    rid = decision['policyRuleId']
    result = export(env, rid)
    assert result.status_code == 200, result.text
    result = result.json()
    assert result['selectedRuleId'] == rid
    row, = result['rows']
    assert row['readiness'] == 'READY'
    assert (row['sourceAddress'], row['destinationAddress'], row['ipProtocol'], row['destinationPortStart'], row['destinationPortEnd']) == ('192.0.2.10', '192.0.2.20', 'TCP', 443, 443)
    for key, value in {'ruleId': rid, 'subjectId': request['subjectId'], 'requestId': request['requestId'],
                       'requesterActorId': IDS['requester'], 'decisionId': decision['decisionId'],
                       'deciderActorId': IDS['decider'], 'interactionRevisionId': IDS['revision'],
                       'connectivityNeedId': IDS['need'], 'sourceEndpointId': IDS['sourceEndpoint'],
                       'destinationEndpointId': IDS['destinationEndpoint']}.items():
        assert row[key] == value
    csv_response = export(env, rid, 'csv')
    csv_row, = csv.DictReader(io.StringIO(csv_response.text))
    assert list(csv_row) == list(COLUMNS)
    assert csv_row['evaluationAt'] == csv_response.headers['X-Evaluation-At']
    assert csv_response.headers['X-Selected-Rule-Id'] == rid
    for key in COLUMNS:
        if key != 'evaluationAt':
            assert csv_row[key] == ('' if row[key] is None else str(row[key]))
    assert row['evaluationAt'] == result['evaluationAt']
    assert row['requestSubmittedAt'] == request['submittedAt']
    assert row['decisionAt'] == decision['decidedAt']


@pytest.mark.parametrize('endpoint', ['sourceEndpoint', 'destinationEndpoint'])
def test_ac02_missing_address(env, endpoint):
    rid = approved(env)
    change(env, 'UPDATE endpoints SET address=NULL,kind=NULL WHERE id=?', (IDS[endpoint],))
    row, = export(env, rid).json()['rows']
    field = 'sourceAddress' if endpoint == 'sourceEndpoint' else 'destinationAddress'
    assert row['readiness'] == 'INCOMPLETE'
    assert row[field] is None
    csv_row, = csv.DictReader(io.StringIO(export(env, rid, 'csv').text))
    assert csv_row[field] == ''
    assert csv_row['ruleId'] == rid


def test_ac03_denied(env):
    r = submit(env)
    d = decide(env, r, 'DENIED')
    assert d['policyRuleId'] is None
    got = env[3].get(f'/access-requests/{r["requestId"]}', headers=auth(env, 'requester')).json()
    assert got['status'] == 'DENIED'
    assert got['decision'] == d
    with env[0].transaction() as c:
        assert c.execute('SELECT count(*) FROM policy_rules').fetchone()[0] == 0
    assert export(env, str(uuid4())).status_code == 404


def test_ac04_repeated_allow_and_later_deny(env):
    first = submit(env)
    a = decide(env, first)
    second = submit(env)
    assert second['requestId'] != first['requestId']
    assert second['subjectId'] == first['subjectId']
    b = decide(env, second)
    assert b['policyRuleId'] == a['policyRuleId']
    decide(env, submit(env), 'DENIED')
    details = env[3].get(f'/policy-rules/{a["policyRuleId"]}', headers=auth(env, 'exporter')).json()
    assert details['originatingDecision'] == a
    assert details['state'] == 'ACTIVE'
    assert {d['decisionId'] for d in details['allowances']} == {a['decisionId'], b['decisionId']}
    assert len(export(env, a['policyRuleId']).json()['rows']) == 1


def test_ac05_source_only(env):
    with env[0].transaction() as c:
        assert c.execute("SELECT count(*) FROM grants WHERE actor_id=? AND action='access.request'", (IDS['requester'],)).fetchone()[0] == 1
    submit(env)
    change(env, 'UPDATE grants SET valid_until=? WHERE id=?', ('2000-01-01T00:00:00Z', IDS['requestGrant']))
    response = env[3].post('/access-requests', json=DEMO_REQUEST, headers=auth(env, 'requester'))
    assert response.status_code == 403
    with env[0].transaction() as c:
        assert c.execute('SELECT count(*) FROM access_requests').fetchone()[0] == 1
        assert c.execute('SELECT count(*) FROM decisions').fetchone()[0] == 0
        assert c.execute('SELECT count(*) FROM policy_rules').fetchone()[0] == 0


@pytest.mark.parametrize('scope', ['sourceExportGrant', 'destinationExportGrant'])
def test_ac06_export_scope(env, scope):
    rid = approved(env)
    change(env, 'UPDATE grants SET valid_until=? WHERE id=?', ('2000-01-01T00:00:00Z', IDS[scope]))
    for response in (export(env, rid), export(env, rid, 'csv'), env[3].get(f'/policy-rules/{rid}', headers=auth(env, 'exporter'))):
        assert response.status_code == 403
        assert response.json() == {'error': {'code': 'FORBIDDEN', 'message': 'Insufficient authority'}}
        assert rid not in response.text
        assert '192.0.2.' not in response.text


def test_ac07_current_ip_identity(env):
    rid = approved(env)
    before = export(env, rid).json()['rows'][0]
    change(env, 'UPDATE endpoints SET address=?,kind=? WHERE id=?', ('198.51.100.0/24', 'PREFIX', IDS['destinationEndpoint']))
    after = export(env, rid).json()['rows'][0]
    assert after['destinationAddress'] == '198.51.100.0/24'
    assert after['destinationAddressKind'] == 'PREFIX'
    assert before['evaluationAt'] != after['evaluationAt']
    for k in COLUMNS:
        if k not in ('evaluationAt', 'destinationAddress', 'destinationAddressKind'):
            assert before[k] == after[k]
    assert submit(env)['subjectId'] == before['subjectId']


def test_ac08_inactive_not_reactivated(env):
    rid = approved(env)
    change(env, "UPDATE policy_rules SET state='INACTIVE' WHERE id=?", (rid,))
    assert decide(env, submit(env))['policyRuleId'] == rid
    assert export(env, rid).json()['rows'] == []
    csv_response = export(env, rid, 'csv')
    assert list(csv.reader(io.StringIO(csv_response.text))) == [list(COLUMNS)]
    assert csv_response.headers['X-Selected-Rule-Id'] == rid
    assert csv_response.headers['X-Evaluation-At'].endswith('Z')
    details = env[3].get(f'/policy-rules/{rid}', headers=auth(env, 'exporter')).json()
    assert details['state'] == 'INACTIVE'
    assert details['originatingDecision']['outcome'] == 'ALLOWED'
    assert len(details['allowances']) == 2
