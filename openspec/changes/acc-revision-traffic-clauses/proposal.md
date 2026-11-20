## Why

The current REAL Interaction editor creates a new Interaction and one implicit revision per command, allowing indistinguishable duplicates. The accepted ACC domain requires stable Interaction identity, numbered immutable revisions, and an owned nonempty set of TrafficClauses. The user reviewed the desktop form and rejected this semantic gap.

## What Changes

- Preserve Interaction identity by Application and directed source/destination Component pair; carry purpose as an optional description across numbered revision snapshots, not as identity.
- Publish 1..N canonical TCP/UDP TrafficClauses atomically. The editor holds an unsaved draft; only a published snapshot is persisted.
- Reject duplicate clause signatures within a revision and any second Interaction for the same directed pair, regardless of purpose, protocol or ports.
- Preserve historic revision IDs and all AccessSubject/PolicyRule references under additive SQLite migration.
- Propagate all clause semantics to revisions, Need/Rule labels, and per-clause policy export.
- Keep deleted draft clauses local; reject hard deletion of published history.

## Dependencies

Stacked on PR #73 (independent source and destination ports). Do not merge to main before base PR has merged and owner has accepted the UX.
