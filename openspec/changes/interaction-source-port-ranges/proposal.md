## Why

The REAL Interaction form describes only destination TCP/UDP ports, while user workflows need independent source-port ranges. These facts must survive immutable revisions and PolicyRule exports.

## What Changes

- Add optional paired source-port start/end to Interaction revisions. NULL/NULL means ANY; omitted POST fields remain ANY.
- Migrate SQLite v1–v5 additively without changing historical revision, request or PolicyRule identities.
- Preserve source ports in Need options, Rule collection/detail and selected/current JSON/CSV exports.
- Use a compact REAL form without additional libraries or steps.

## Impact

Application catalog, immutable revisions, network labels, SQLite v6, HTTP/TypeScript DTOs, CSV header and tests. CSV gains two new columns; strict positional CSV consumers require an update.
