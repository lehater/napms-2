# Proposal

## Why

Owner review of UX-0 found that a flat Application/Interaction/Revision table obscures the model and sidebar labels consume too much space. UX-0.1 makes the existing hierarchy visible without changing domain identity or real requests.

## What Changes

- Start Applications with application profiles, then show participant roles, directed interactions and their revisions in context.
- Separate actuality/lifecycle, revision immutability and read-only UI mode; introduce no domain states.
- Short English navigation labels, darker sidebar, clear active section and lighter tables with data nature available in details.
- Keep all object URLs, mock isolation, eight workspaces and real-flow regression.

## Capabilities

### New Capabilities

- `ux-research-prototype`: Additional prototype presentation requirements, extending the same capability declared by the merged but unarchived `ux-0-prototype` change. It is not yet in main specs; no duplicate domain capability is introduced.

### Modified Capabilities

None of the accepted product specs change.

## Impact

Prototype presentation, fixture display properties, browser checks and research walkthrough only. No backend/API/SQLite, dependencies, new object identities or persistent relations.

## UX-0.2 baseline implementation

Continue this Draft PR with the approved UI Baseline v0.1: fluid shell, dark resizable sidebar and a bounded Resources collection/detail slice. Existing application semantics remain. Only research presentation requirements change; fixture, product specifications, backend and real API remain unchanged. Other detail compositions and Reconciliation Diff Viewer are deferred.
