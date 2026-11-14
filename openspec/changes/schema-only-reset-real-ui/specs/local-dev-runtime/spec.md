# Local development runtime — schema-only data boundary

## ADDED Requirements

### Requirement: Destructive local reset produces schema without records

The system SHALL provide an explicitly confirmed local CLI reset that removes
all rows from every application table and reconstructs the current SQLite schema.
The reset SHALL NOT seed actors, grants, catalog entities or business records.
It SHALL refuse unsafe targets and running local services.

#### Scenario: Reset populated training database
- **WHEN** a developer confirms reset of a recognized stopped NAPMS SQLite file
- **THEN** all application tables exist with zero rows, including actors/grants, while schema constraints remain active

#### Scenario: Reset is repeated
- **WHEN** schema-only reset is executed again on an already empty NAPMS SQLite
- **THEN** the schema remains valid and every application table remains empty

### Requirement: Runtime startup never seeds domain data

Local runtime startup SHALL initialize or upgrade the schema without inserting
fixture entities. A separate explicit authorization bootstrap MAY create actor
and grant records but SHALL NOT create business or catalog data.

#### Scenario: Start after a schema-only reset
- **WHEN** the developer starts the local runtime without actors or credentials
- **THEN** startup fails with a safe actionable authorization-bootstrap instruction instead of silently creating demo records

#### Scenario: Explicit local authorization
- **WHEN** the developer initializes local authorization in an empty schema
- **THEN** only local actors and grants are persisted, while all business and catalog tables remain empty

### Requirement: Working frontend has one persisted data source

The working browser interface SHALL retrieve collections and details through
FastAPI backed by SQLite. It SHALL NOT expose a fictional prototype route,
synthetic in-memory collections, or a fallback that substitutes data when the API fails.

#### Scenario: Open empty collections
- **WHEN** a freshly reset and explicitly authorized local instance displays each collection
- **THEN** the interface renders an empty state matching the zero-row API responses, not a browser fixture

#### Scenario: Legacy research URL
- **WHEN** a user navigates to a previous prototype URL
- **THEN** the application displays Not Found and no simulated data is loaded
