# local-dev-runtime Specification Delta

## ADDED Requirements

### Requirement: Loopback-only browser client for demo workflows
The local development profile SHALL provide a documented Vite browser client bound to loopback only, with a development-time proxy to the existing loopback FastAPI for protected request operations. The supported client SHALL use relative API URLs and SHALL NOT require CORS wildcard, public API bind, remote tunnels, credential issuance endpoint, or production authentication.

#### Scenario: Supported local startup
- **WHEN** the operator starts the documented FastAPI and Vite commands using loopback hosts
- **THEN** the browser reaches the UI at `127.0.0.1`, and protected calls reach the real local backend through the dev proxy

#### Scenario: Unsupported network exposure
- **WHEN** the documented web runtime is configured for a non-loopback host
- **THEN** that configuration is rejected by the supported setup; publishing ports, tunnels, and proxying to non-loopback are explicitly unsupported

### Requirement: Private reusable demo credentials
The browser workflow SHALL reuse the existing locally generated requester and decider credentials without copying tokens into code, frontend build variables, URLs, browser persistent storage, version control, CI logs, or screenshots. Credential switch SHALL require an explicitly entered token for the next role; the backend SHALL still resolve actor/grants from the bearer token only.

#### Scenario: Local manual mode switch
- **WHEN** the operator copies a token from the already initialized private demo credential file into the masked client field
- **THEN** the client authenticates subsequent requests by bearer header and a role change drops the previous token and displayed data

#### Scenario: Reinitialization and browser restart
- **WHEN** the backend is restarted using the same DB and private credential file, or the browser is refreshed
- **THEN** SQLite and server credential mappings remain consistent, while the browser requires re-entry of the bearer token
