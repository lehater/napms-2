# Spec Delta

## Purpose

Lets operators create and inspect network Resources and resolve the current address of each Resource's stable logical Endpoint without breaking the established Deployment → Request → Rule path.

## ADDED Requirements

### Requirement: REAL Resource catalog and navigation
The system SHALL expose an authenticated, bounded, deterministic REAL Resource collection, a create form, and a Resource detail with Overview and Endpoints tabs. The Sidebar SHALL include Resources under Catalogs before Application Profiles and Deployed Components. Existing Resource direct URLs and related Deployment links SHALL continue to work.

#### Scenario: Browse Resources
- **WHEN** an authenticated catalog reader opens the Resources collection
- **THEN** persisted seeded and newly created Resources are listed with stable Resource IDs and names, with bounded paging

#### Scenario: Open a Resource
- **WHEN** a reader opens an existing Resource detail
- **THEN** the REAL UI shows the current logical Endpoint and a navigable relation to relevant Deployments without MOCK data

#### Scenario: Maintain accepted REAL navigation contract
- **WHEN** the Resources Sidebar entry is added
- **THEN** the normative REAL navigation JSON, docs, semantic checker, and exact browser navigation expectations describe the same six links in the same order

### Requirement: Atomic Resource and unresolved Endpoint creation
The system SHALL allow a catalog creator to create a named Resource with a server-assigned immutable Resource ID and **exactly one** stable Endpoint ID, initially without an assigned address. Resource and Endpoint identities SHALL be created in the same transaction, and no API SHALL create a second Endpoint for the same Resource.

#### Scenario: Create a Resource
- **WHEN** a caller with `catalog.create` submits a valid nonblank Resource name
- **THEN** the system persists the Resource, its name, and one Endpoint with null address/kind atomically and returns the new Resource

#### Scenario: Reject invalid Resource input
- **WHEN** a caller supplies an empty, whitespace-only or overlong name or unsupported fields
- **THEN** the system returns a validation error and persists neither Resource nor Endpoint

#### Scenario: Reject unauthorized Resource creation
- **WHEN** a caller lacking `catalog.create` submits a Resource
- **THEN** the system denies the operation without persisting records, even if local-demo shared-read is enabled

### Requirement: Assign or replace a stable Endpoint's current address
The system SHALL expose a protected read of the single Endpoint for a Resource and an authorized operation to assign or replace its `HOST` or `PREFIX` IP address. The Endpoint ID and its parent Resource ID SHALL remain unchanged. Address and kind SHALL remain consistent; `HOST` denotes an IP host, `PREFIX` a canonical IP network.

#### Scenario: Resolve a new Endpoint
- **WHEN** an authorized catalog creator provides `HOST` and a valid IPv4/IPv6 host address
- **THEN** the system stores the canonical address in the existing Endpoint and preserves its ID

#### Scenario: Assign a network prefix
- **WHEN** an authorized catalog creator provides `PREFIX` and a valid canonical CIDR network
- **THEN** the system stores the canonical prefix without changing Endpoint identity

#### Scenario: Replace an address
- **WHEN** an authorized creator changes an existing Endpoint address
- **THEN** the Endpoint ID stays stable and subsequent policy exports use the current address while preserving the existing AccessSubject and PolicyRule identities

#### Scenario: Reject malformed addresses
- **WHEN** the caller supplies a hostname, malformed IP, missing prefix length, host-bit-set CIDR, empty address, or an unsupported kind
- **THEN** the API rejects the input without changing the persisted Endpoint

#### Scenario: Reject unauthorized address changes
- **WHEN** an actor without `catalog.create` attempts to change an Endpoint address
- **THEN** the API returns forbidden and the stored address is unchanged

### Requirement: Newly created Resources feed existing Deployment and policy flows
The Resource catalogue SHALL expose newly created Resources through the existing REAL Deployment selector and keep AccessRequest admission, decision, canonical Rule creation, and computed JSON/CSV export behavior intact. Resource/Endpoint mutation SHALL NOT automatically provision access-request or policy-export authority.

#### Scenario: End-to-end new destination Resource
- **WHEN** a requester with an existing `access.request` grant on a seeded source Resource creates a new destination Resource, sets its Endpoint address, deploys a compatible Component, submits a valid Need-backed request, and a decider allows it
- **THEN** one ACTIVE PolicyRule is created for the exact Deployments/Revision and a local-demo JSON/CSV export includes the new destination address and stable Endpoint ID with `READY` readiness

#### Scenario: New source does not imply access-request authority
- **WHEN** a requester without `access.request` on a newly created source Resource tries to submit a request from it
- **THEN** submission fails with 403 and no AccessRequest or PolicyRule is created

#### Scenario: Address is absent
- **WHEN** an allowed rule references a newly created Resource whose Endpoint address has not yet been assigned
- **THEN** export reports `INCOMPLETE` rather than failing or claiming network readiness

### Requirement: Preserve minimal one-Endpoint scope
The initial implementation SHALL support exactly one logical Endpoint per Resource under the existing SQLite v5 uniqueness constraint. Bulk resource management, multiple Endpoints, deletion, general CRUD editing, live network discovery, and IAM provisioning SHALL remain out of scope.

#### Scenario: Existing Resource with Endpoint
- **WHEN** an operator views a seeded Resource
- **THEN** the existing Endpoint ID/address remains visible and unchanged until an explicitly authorized address operation
