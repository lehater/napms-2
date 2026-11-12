# Proposal

## Why
The accepted UI/IA Baseline v0.2 provides a BusinessProcess collection and detail, but both are backed only by a fictional React fixture. The existing FastAPI/SQLite flow persists AccessRequests, Decisions and PolicyRules, yet the real `processes` table stores only IDs and exposes no create/list/detail API. A small write-backed BusinessProcess slice establishes the first new catalog operation through the accepted UI without committing to a generic CRUD framework.

## What Changes
- Add a server-authorized `POST /business-processes`, `GET /business-processes` and `GET /business-processes/{processId}` for a stable BusinessProcess with a required name and optional description and responsible organization.
- Upgrade SQLite from schema v1 to v2 transactionally, retaining existing processes, linked Needs, immutable history and authorization records. Allow older records to have unknown display metadata instead of inventing values.
- Provide a real BusinessProcess create → list → detail experience in the **existing** seven-collection UI shell, clearly separated from the fictional mock scenario.
- Test the complete browser → FastAPI → domain/application → SQLite → browser loop and persistence after a backend restart.

## Capabilities
### New Capabilities
- `business-processes`: minimal real create/list/detail, scoped authorization, persistence and browser acceptance.

### Modified Capabilities
None. Existing `local-dev-runtime`, `access-requests`, `access-decisions` and `policy-export` requirements remain in force.

## Impact
- `src/napms/storage.py`, `domain.py`, `use_cases.py`, `http.py`, `dev.py`.
- Existing React/Vite shell and business-process collection/detail views, API adapter, pytest and Playwright.
- No new DB engine, service framework, screen shell, dependencies or general catalog CRUD.
- The proposed read model in Draft PR #38 (Issue #37) is **research, not accepted API**. Its potential future metadata/migration work must reuse this change rather than introduce a competing v2 schema. Draft PR #43 remains separate and unmerged.

## Success
With an explicitly granted local demo actor, a user creates a BusinessProcess, finds it in the server-backed collection, opens it, refreshes the browser and restarts FastAPI without losing it. Missing/invalid grants fail on the server, and the mock scenario and existing real AccessRequest APIs continue to work.
