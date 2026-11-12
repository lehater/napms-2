"""Opt-in local demo supervisor. No production authentication or business logic."""
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener

from .dev import init_demo, load_credentials
from .storage import Database


def run(db_path, credentials_path):
    root = Path(__file__).resolve().parents[2]
    web = root / 'web'
    credentials = Path(credentials_path).absolute()
    db = Path(db_path).absolute()
    if not shutil.which('npm') or not (web / 'node_modules/vite/bin/vite.js').is_file():
        raise RuntimeError('Install Node.js and run npm ci in web before local-demo startup')
    if any(path.resolve().is_relative_to(web.resolve()) for path in (credentials, db)):
        raise RuntimeError('Keep SQLite and private credentials outside web')
    # Check before initializing or spawning; never attach to an unrelated service.
    for port in (8000, 5173):
        try:
            with socket.socket() as probe:
                probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                probe.bind(('127.0.0.1', port))
        except OSError:
            raise RuntimeError(f'Port {port} is busy; stop the existing service and retry') from None
    if credentials.exists() and (credentials.is_symlink() or not credentials.is_file() or credentials.stat().st_mode & 0o077):
        raise RuntimeError('Credentials must be a private regular file (mode 0600)')
    try:
        init_demo(Database(db), credentials)
        load_credentials(credentials)
    except Exception:
        raise RuntimeError('Demo initialization failed; check DB schema/path and private credentials (regular file, mode 0600)') from None
    children = []
    previous = signal.getsignal(signal.SIGTERM)
    def stop_signal(*_):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stop_signal)
    try:
        env = {**os.environ, 'NAPMS_LOCAL_DEMO': '1', 'NAPMS_CREDENTIALS_FILE': str(credentials)}
        children.append(subprocess.Popen([sys.executable, '-m', 'napms.dev', 'serve', '--db', str(db), '--credentials', str(credentials)], cwd=root))
        children.append(subprocess.Popen(['npm', 'run', 'dev', '--', '--mode', 'local-demo'], cwd=web, env=env, start_new_session=True))
        opener = build_opener(ProxyHandler({}))
        deadline = time.monotonic() + 30
        urls = ('http://127.0.0.1:8000/openapi.json', 'http://127.0.0.1:5173/')
        for url in urls:
            while True:
                if any(p.poll() is not None for p in children):
                    raise RuntimeError('Local service exited before readiness; check the startup message above')
                try:
                    with opener.open(url, timeout=1) as response:
                        if response.status == 200:
                            break
                except (URLError, OSError):
                    pass
                if time.monotonic() >= deadline:
                    raise RuntimeError('Local startup timed out; check ports and service prerequisites')
                time.sleep(0.1)
        print('NAPMS LOCAL DEMO ready: http://127.0.0.1:5173/business-processes — Ctrl-C stops both services', flush=True)
        while all(p.poll() is None for p in children):
            time.sleep(0.2)
        raise RuntimeError('Local service stopped unexpectedly; both services have been stopped')
    except KeyboardInterrupt:
        print('Stopping NAPMS local demo.', flush=True)
    finally:
        signal.signal(signal.SIGTERM, previous)
        for i, child in reversed(list(enumerate(children))):
            if i == 1:
                try:
                    os.killpg(child.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
            elif child.poll() is None:
                child.terminate()
        for i, child in enumerate(children):
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                if i == 1:
                    os.killpg(child.pid, signal.SIGKILL)
                else:
                    child.kill()
                child.wait()
