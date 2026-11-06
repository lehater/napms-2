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
