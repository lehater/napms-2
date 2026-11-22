# Read Langfuse telemetry with the existing connection

Use this procedure only for an authorized read of Langfuse telemetry. It is separate from [task-scoped tracing](codex-task-tracing.md), which prepares metadata for sending/export through the existing Codex Stop Hook. The project-local tracing file is not the Public API connection configuration.

## Existing connection and authentication

The global connection is stored in `~/.codex/langfuse.json`. Read the existing values in memory; do not print or copy them:

- `base_url`: configured Langfuse endpoint
- `public_key`: HTTP Basic Auth username
- `secret_key`: HTTP Basic Auth password

Do not create or edit this file, add credentials elsewhere, or reveal the endpoint or keys in logs, Issue comments, PRs, or tool output.

Treat this owner-maintained configuration as the single trusted source of connection parameters. No separate endpoint confirmation is required in each handoff. Task authorization still determines the allowed read scope; it does not grant write access. Do not substitute default cloud endpoints, discover alternative hosts, or use inherited connection values instead of this file.

## Preferred read path: installed Langfuse CLI

Read the installed official Langfuse Skill when using the CLI. Load the existing connection in the same shell invocation as the query; do not rely on variables inherited from the launcher. For example, on the verified VM with CLI 1.4.0 and `jq`, the following bounded capability probe returns only HTTP status and row count:

```bash
(
  set +x
  set -euo pipefail
  LANGFUSE_BASE_URL="$(jq -er '.base_url | strings | select(length > 0)' ~/.codex/langfuse.json)"
  LANGFUSE_PUBLIC_KEY="$(jq -er '.public_key | strings | select(length > 0)' ~/.codex/langfuse.json)"
  LANGFUSE_SECRET_KEY="$(jq -er '.secret_key | strings | select(length > 0)' ~/.codex/langfuse.json)"
  export LANGFUSE_BASE_URL LANGFUSE_PUBLIC_KEY LANGFUSE_SECRET_KEY
  langfuse --api-version 4 api observations list --limit 1 --fields core --json 2>/dev/null |
    jq -e '{status: .status, rows: (if (.body.data | type) == "array" then (.body.data | length) else null end)}'
)
```

For an authorized analysis, replace the probe query with the task-scoped read query and project the response to approved fields before exposing it to the model. Never use `--curl`, verbose authentication logs or raw payload output. If the CLI or configuration is missing, or a request fails, report the observed blocker and safe status/exit code; do not install tools, change the connection or retry alternative endpoints on your own. A successful scoped query itself confirms read capability; an extra probe is not required for every task. The direct HTTP example below remains an alternative when explicitly needed, not a mandatory additional step.

## Direct HTTP capability probe (alternative)

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
