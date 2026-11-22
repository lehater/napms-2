# F16 run-006 — native metrics aggregation, candidate C2

## Decision and criterion

Review prior candidates in [run-002](run-002.md), [run-003](run-003.md), [run-005](run-005.md). C1 is demonstrated native retrieval, C3 remains deferred (no separate reuse need). C4 is a new report-derived candidate: immutable command delivery and execution instead of reconstructing Bash, demonstrated by [F17 run-002](../F17-skill-utilization/run-002.md) after a delivery failure. No causal savings or new tool claimed.

C2: test whether server-side Metrics API v2 replaces client-side grouping/counting for one exact historical attempt. Compare against previously retrieved [run-005](run-005.md) and its [query scope](run-004.md): #151, 76 unique exactly attributed observations, 35 TOOL, 38 GENERATION, 3 AGENT. Reference uses another native read path on the same data, not independent ground truth. One query, no raw observations. No token/cost evaluation, no performance comparison with unmatched command timings. Source: [Metrics API v2](https://langfuse.com/docs/metrics/features/metrics-api), [API schema](https://github.com/langfuse/langfuse/blob/main/fern/apis/server/definition/metrics.yml), [TraceCompiler](https://arxiv.org/abs/2608.02680). Server support for these metadata filters in installed version is unverified. Use the documented native GET directly with Python standard library transport (explicit alternative in canonical read instruction), not an unverified new CLI command alias or a custom aggregation client.

## Executor scope

Previous experiment worktree, current session, low reasoning, 2 minutes. Read canonical .ai/langfuse-read-access.md from origin/main. Owner launch authorizes only one exact filtered read of native aggregate counts, same time window and tuple/source SHA as run-005 (already published in run-004.md). No other queries, retry, redirects, new installations, config edits, credentials printing, commits or pushes. Execute this sole Bash block verbatim from its immutable commit, not manual reconstruction; run bash -n before execution. Python syntax and built-in synthetic projection checks run before network. Return safe JSON and elapsed time only. All exceptions sanitized; do not emit URL, metadata, keys, response body or arbitrary exception text. HTTP errors are reported by code, no fallback.

```bash
python3 - <<'PY'
import base64
import json
import time
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError

expected = {"TOOL": 35, "GENERATION": 38, "AGENT": 3}

def project(body):
    data = body["data"]
    if not isinstance(data, list):
        raise ValueError()
    counts = {}
    for row in data:
        kind = row["type"]
        value = row["count_count"]
        if kind not in expected or kind in counts:
            raise ValueError()
        if type(value) is int and value >= 0:
            count = value
        elif isinstance(value, str) and value.isascii() and value.isdecimal():
            count = int(value)
        else:
            raise ValueError()
        counts[kind] = count
    return {"groups": counts, "total": sum(counts.values()),
            "matches_reference": counts == expected}

def run():
    started = time.monotonic()
    result = {"evaluated": False}
    stage = "synthetic_control"
    try:
        fixture = {"data": [{"type": k, "count_count": str(v)}
                            for k, v in expected.items()]}
        if not project(fixture)["matches_reference"]:
            raise ValueError()
        for invalid in ({"data": [{"type": "OTHER", "count_count": 1}]},
                        {"data": fixture["data"] + fixture["data"][:1]}):
            try:
                project(invalid)
            except ValueError:
                pass
            else:
                raise RuntimeError()
        result["control"] = "PASS"
        stage = "configuration"
        config = json.loads((Path.home() / ".codex" / "langfuse.json").read_text())
        for key in ("base_url", "public_key", "secret_key"):
            if not isinstance(config[key], str) or not config[key].strip():
                raise ValueError()
        base = config["base_url"].rstrip("/")
        if base.endswith("/api"):
            base = base[:-4]
        parsed = urlsplit(base)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError()
        auth = base64.b64encode((config["public_key"] + ":" + config["secret_key"]).encode()).decode()
        stage = "request"
        scope = {"repository": "lehater/napms-2", "issueId": "151",
                 "runId": "618fdd192d6240c29f3d90329a4a6545",
                 "sourceSha": "2fdd3c9a7b32db891fdd3216ee1d55f85e8d06c4"}
        query = {"view": "observations", "dimensions": [{"field": "type"}],
                 "metrics": [{"measure": "count", "aggregation": "count"}],
                 "filters": [{"column": "metadata", "key": k, "type": "stringObject",
                              "operator": "=", "value": v} for k, v in scope.items()],
                 "fromTimestamp": "2026-11-18T00:00:00Z",
                 "toTimestamp": "2026-11-22T00:00:00Z",
                 "config": {"row_limit": 20}}
        class NoRedirect(HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None
        request = Request(base + "/api/public/v2/metrics?" + urlencode({"query": json.dumps(query)}),
                          headers={"Authorization": "Basic " + auth, "Accept": "application/json"},
                          method="GET")
        with build_opener(NoRedirect()).open(request, timeout=15) as response:
            result["status"] = response.status
            stage = "projection"
            if response.status != 200:
                raise ValueError()
            payload = response.read(65537)
            if len(payload) > 65536:
                raise ValueError()
            result.update(project(json.loads(payload)))
            result["evaluated"] = True
    except HTTPError as error:
        result.update(status=error.code, failed_stage=stage)
    except URLError:
        result.update(failed_stage=stage, error="transport")
    except Exception:
        result.update(failed_stage=stage, error="local_or_schema_error")
    result["elapsed_seconds"] = round(time.monotonic() - started, 3)
    print(json.dumps(result, sort_keys=True))
    return 0 if result["evaluated"] and result.get("matches_reference") else 1

raise SystemExit(run())
PY
```

Acceptance: HTTP 200 and all three type counts exactly match the row-level reference. If mismatched, unknown type, response error or unavailable filters, record outcome and stop; no expansion, alternate endpoint or further pilot. A match demonstrates native aggregation for this selected query, not semantic trace analysis or proof of full attribution beyond the server's filter contract. Server counts cannot replace row-level uniqueness or coverage checks when those are required. No efficiency improvement claim until end-to-end comparative measurement. No product/Harness changes.
