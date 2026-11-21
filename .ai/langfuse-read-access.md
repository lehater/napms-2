# Read Langfuse telemetry with the existing connection

Use this procedure only for an authorized read of Langfuse telemetry. It is separate from [task-scoped tracing](codex-task-tracing.md), which prepares metadata for sending/export through the existing Codex Stop Hook. The project-local tracing file is not the Public API connection configuration.

## Existing connection and authentication

The global connection is stored in `~/.codex/langfuse.json`. Read the existing values in memory; do not print or copy them:

- `base_url`: configured Langfuse endpoint
- `public_key`: HTTP Basic Auth username
- `secret_key`: HTTP Basic Auth password

Do not create or edit this file, add credentials elsewhere, or reveal the endpoint or keys in logs, Issue comments, PRs, or tool output.

## Verify read capability

Make this authorized GET from the runtime that will read telemetry:

`GET {base_url}/api/public/v2/observations?limit=1&fields=core`

An HTTP `200` confirms that this runtime can read the Observations API. The response row is only a capability probe; do not print or persist it.

The following standard-library check reads the existing config, sends HTTP Basic Auth, and prints only the actual HTTP status or transport-error class:

```python
import base64
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

config = json.loads((Path.home() / ".codex" / "langfuse.json").read_text())
base_url = config["base_url"].rstrip("/")
if base_url.endswith("/api"):
    base_url = base_url[:-4]
credentials = base64.b64encode(
    f"{config['public_key']}:{config['secret_key']}".encode()
).decode()
request = Request(
    base_url + "/api/public/v2/observations?limit=1&fields=core",
    headers={"Authorization": "Basic " + credentials, "Accept": "application/json"},
    method="GET",
)
try:
    with urlopen(request, timeout=15) as response:
        print(f"HTTP {response.status}")
        response.read()  # Consume locally; do not print or persist the row.
except HTTPError as error:
    print(f"HTTP {error.code}")
except URLError as error:
    print(f"Transport error: {type(error.reason).__name__}")
```

Report the result that actually occurred. For example, report `HTTP 401`, `HTTP 403`, `HTTP 404`, or the transport-error class returned by the check. Do not infer that the service is unavailable from an authorization, route, or transport error; the response itself does not establish that conclusion. If the config cannot be read or lacks a required field, report that local configuration result and state that no HTTP request was made.

This probe sends only a GET and does not test write permissions. Do not use ingestion or write endpoints. For a telemetry analysis, follow its approved data-minimization and exact-run scope after the read capability is confirmed.
