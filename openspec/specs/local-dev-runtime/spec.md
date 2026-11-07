# local-dev-runtime Specification

## Purpose

Provide a reproducible, loopback-only development environment and server-controlled actor credentials for exercising NAPMS access policy behavior without a production identity provider.

## Requirements

### Requirement: Explicit repeatable demo initialization
The system SHALL initialize a reproducible local dataset containing two Resource/Endpoint pairs, one Application with two Component roles, one immutable InteractionRevision with traffic protocol and ports, two ComponentDeployments, one BusinessProcess and ConnectivityNeed, and independently authorized demo actors. Initialization SHALL NOT create any ALLOWED decision or PolicyRule.

#### Scenario: Fresh demo installation
- **WHEN** the developer explicitly initializes an empty local database
- **THEN** the complete referenced dataset and server-owned grants exist, and there are zero AccessRequests, decisions and PolicyRules

#### Scenario: Repeated initialization
- **WHEN** initialization is repeated against an already populated database without an explicit reset
- **THEN** existing request/decision/rule data is retained and seed entities are not duplicated or silently overwritten

### Requirement: Local-only supported execution
The system SHALL provide a documented supported development launcher bound to loopback only, and SHALL reject non-loopback bind settings in that launcher. The profile SHALL be clearly identified as unsuitable for production authentication.

#### Scenario: Local startup
- **WHEN** the supported development launcher is started with the provided demo configuration
- **THEN** the API and Swagger UI are reachable at a loopback address and the launcher does not bind a public interface

#### Scenario: Unsafe bind configuration
- **WHEN** the supported development launcher is configured to bind to `0.0.0.0` or another non-loopback address
- **THEN** startup fails before the API is served

### Requirement: Server-resolved actor and grants
Every protected API operation SHALL authenticate a bearer credential to a server-side actor and grants registry. The system SHALL reject missing/invalid credentials; it SHALL NOT accept caller-supplied actor IDs, roles, grants or decision assertions as proof of authority. Dev credentials SHALL be generated locally with high entropy and stored outside Git.

#### Scenario: Missing or invalid credential
- **WHEN** a protected operation is invoked without a recognized bearer credential
- **THEN** it returns 401 and creates no business mutation or policy disclosure

#### Scenario: Client attempts to assign authority
- **WHEN** a caller includes forged actor/grant fields or uses a requester credential to submit a privileged operation
- **THEN** the server does not grant the claimed authority and returns 422 for unsupported fields or 403 for insufficient server-held grants

#### Scenario: Distinct identities
- **WHEN** demo requester, decision maker and exporter credentials are presented in separate requests
- **THEN** the server resolves the configured corresponding actor and action grants independently

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
