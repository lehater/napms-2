## Boundary and responsibilities

**SQLite** is the persistence authority. Reset is a CLI-only, explicit destructive
operation: validate target, stop active servers, drop recognized application schema
within SQLite transaction, rebuild the latest schema, leave all rows empty.

**Local auth bootstrap** is a separate explicit operation and may create only
actors, names and scoped grants. Real business data is always created via API.
The private token file is outside SQLite and is not a business-data source.

**Runtime launcher** initializes/validates schema and credentials and starts
real FastAPI/Vite, without a call to test fixture seeding.

**Frontend** uses only existing `api.ts` requests to FastAPI; the research
simulation/fixture module and its routable UI are removed. Client-side drafts
and presentation preferences are transient UI state, not domain datasets.

**Tests** may explicitly initialize isolated SQLite fixture data.
Tests verify all schema tables are empty after reset, a new auth bootstrap
leaves domain tables empty, and the REAL UI renders empty collections.

## Non-goals

No production identity provider, no HTTP reset route, no fake response fallback,
no rewrite of migration v7→v8 semantics in this change.
