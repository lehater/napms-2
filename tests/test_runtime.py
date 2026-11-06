"""Real loopback process smoke: documented initialization and HTTP workflow."""
import json
import socket
import subprocess
import sys
import time

import httpx

from napms.dev import DEMO_REQUEST


def test_documented_local_workflow_and_process_restart(tmp_path):
    init = subprocess.run([sys.executable, '-m', 'napms.dev', 'init-demo'], cwd=tmp_path, capture_output=True, text=True)
    assert init.returncode == 0, init.stderr
    credentials = json.loads((tmp_path / 'var/dev-credentials.json').read_text())
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    def headers(role):
        return {'Authorization': 'Bearer ' + credentials[role]['token']}
    rid = None
    logs = init.stdout + init.stderr
    for restart in range(2):
        proc = subprocess.Popen([sys.executable, '-m', 'napms.dev', 'serve', '--port', str(port)], cwd=tmp_path, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            with httpx.Client(base_url=f'http://127.0.0.1:{port}', trust_env=False, timeout=3) as client:
                deadline = time.monotonic() + 10
                while True:
                    try:
                        assert client.get('/docs').status_code == 200
                        break
                    except httpx.ConnectError:
                        assert time.monotonic() < deadline, 'launcher not reachable'
                        assert proc.poll() is None, 'launcher exited'
                        time.sleep(0.05)
                assert client.get('/openapi.json').status_code == 200
                if restart == 0:
                    r = client.post('/access-requests', json=DEMO_REQUEST, headers=headers('requester'))
                    assert r.status_code == 201
                    d = client.post(f'/access-requests/{r.json()["requestId"]}/decision', json={'outcome': 'ALLOWED'}, headers=headers('decider'))
                    assert d.status_code == 201
                    rid = d.json()['policyRuleId']
                    r2 = client.post('/access-requests', json=DEMO_REQUEST, headers=headers('requester')).json()
                    denied = client.post(f'/access-requests/{r2["requestId"]}/decision', json={'outcome': 'DENIED'}, headers=headers('decider'))
                    assert denied.status_code == 201
                    assert denied.json()['policyRuleId'] is None
                policy = client.get('/policy/export', params={'ruleId': rid}, headers=headers('exporter'))
                assert policy.status_code == 200
                row, = policy.json()['rows']
                assert row['readiness'] == 'READY'
                assert row['ruleId'] == rid
                assert client.get('/policy/export', params={'ruleId': rid, 'format': 'csv'}, headers=headers('exporter')).status_code == 200
        finally:
            proc.terminate()
            stdout, stderr = proc.communicate(timeout=10)
            logs += stdout + stderr
    for credential in credentials.values():
        assert credential['token'] not in logs
    assert 'GET /policy/export' not in logs  # access logging disabled
