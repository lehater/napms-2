import subprocess
import sys

import pytest

from napms.harness import run


def test_harness_requires_explicit_profile():
    result = subprocess.run([sys.executable, '-m', 'napms.dev', 'run'], capture_output=True, text=True)
    assert result.returncode == 2
    assert 'requires --profile local-demo' in result.stderr


def test_harness_busy_port_does_not_initialize(tmp_path, monkeypatch):
    monkeypatch.setattr('napms.harness.shutil.which', lambda _: '/usr/bin/npm')
    monkeypatch.setattr('napms.harness.Path.is_file', lambda p: p.name == 'vite.js')
    def busy(*_):
        raise OSError('busy')
    monkeypatch.setattr('napms.harness.socket.socket', busy)
    with pytest.raises(RuntimeError, match='Port 8000 is busy'):
        run(tmp_path / 'unused.db', tmp_path / 'unused.json')
    assert list(tmp_path.iterdir()) == []


def test_harness_missing_npm_is_actionable(tmp_path, monkeypatch):
    monkeypatch.setattr('napms.harness.shutil.which', lambda _: None)
    with pytest.raises(RuntimeError, match='npm ci'):
        run(tmp_path / 'unused.db', tmp_path / 'unused.json')
    assert list(tmp_path.iterdir()) == []


def test_child_failure_stops_other_service(tmp_path, monkeypatch):
    monkeypatch.setattr('napms.harness.shutil.which', lambda _: '/usr/bin/npm')
    from pathlib import Path
    original = Path.is_file
    monkeypatch.setattr(Path, 'is_file', lambda p: p.name == 'vite.js' or original(p))
    monkeypatch.setattr('napms.harness.time.sleep', lambda _: None)
    class Child:
        def __init__(self, fail=False):
            self.fail, self.calls, self.stopped, self.pid = fail, 0, False, 123456789
        def poll(self):
            self.calls += 1
            return 1 if self.stopped or (self.fail and self.calls > 1) else None
        def terminate(self):
            self.stopped = True
        def wait(self, timeout):
            self.stopped = True
    backend, frontend = Child(), Child(fail=True)
    children = iter([backend, frontend])
    monkeypatch.setattr('napms.harness.subprocess.Popen', lambda *a, **k: next(children))
    groups = []
    monkeypatch.setattr('napms.harness.os.killpg', lambda pid, sig: groups.append(pid))
    class Response:
        status = 200
        def __enter__(self):
            return self
        def __exit__(self, *_):
            pass
    class Opener:
        def open(self, *_args, **_kwargs):
            return Response()
    monkeypatch.setattr('napms.harness.build_opener', lambda _: Opener())
    with pytest.raises(RuntimeError, match='exited before readiness'):
        run(tmp_path / 'test.db', tmp_path / 'credentials.json')
    assert backend.stopped and frontend.stopped
    assert groups == [frontend.pid]
