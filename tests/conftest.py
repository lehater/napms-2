import json

import pytest
from fastapi.testclient import TestClient

from napms.dev import init_demo, load_credentials
from napms.http import create_app
from napms.storage import Database


@pytest.fixture
def env(tmp_path):
    db = Database(tmp_path / 'test.sqlite3')
    path = tmp_path / 'credentials.json'
    init_demo(db, path)
    credentials = json.loads(path.read_text())
    app = create_app(db, load_credentials(path))
    with TestClient(app) as client:
        yield db, path, app, client, credentials


def auth(env, role):
    return {'Authorization': 'Bearer ' + env[4][role]['token']}
