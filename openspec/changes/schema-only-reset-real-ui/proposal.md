## Why

The previous reset command recreated demo records after dropping SQLite tables, and
the normal local launcher repeated the seed. A separately reachable research
prototype also displayed fictional collections in browser memory regardless of SQLite.

The owner requires a truly empty database after reset and one source of truth:
FastAPI/SQLite for all runtime collections.

## What Changes

- Explicit schema-only reset deletes all SQLite records and reconstructs only
  the current v8 schema, including constraints and triggers.
- Runtime startup never inserts fixture objects.
- A separate opt-in `init-auth` prepares real local actor/grant records; it
  never creates business/catalog entities.
- Resource grants can be explicitly assigned to existing resources in SQLite.
- Remove the browser prototype route and all executable frontend fixture data.
- Keep synthetic data generation only in isolated tests via explicit `init-demo`.

## Dependencies

Stacked on Draft PR #78, after source-port PR #73. The independent v7→v8
historical consolidation issue in #78 remains a separate P1 blocker.
No squash merge without owner acceptance.
