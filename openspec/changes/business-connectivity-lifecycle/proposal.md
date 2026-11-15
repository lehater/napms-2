# Proposal

## Why

REAL BusinessProcesses and ConnectivityNeeds can be created and read, but their descriptive and lifecycle state cannot be managed after creation. A shared contract is needed before the two implementation slices so they preserve stable identities, request history, and authorization boundaries.

## What Changes

- Define the editable fields, lifecycle states, transitions, restoration, and physical deletion policy for BusinessProcess and ConnectivityNeed.
- Define how process and need state affects new Needs and AccessRequests while preserving existing Request, Decision, Rule, and provenance records.
- Define independent authorization actions, HTTP outcomes, migration compatibility, dependency behavior, and REAL UI states for both entities.
- Keep implementation of the BusinessProcess and ConnectivityNeed slices out of this planning change; those remain #110 and #108 after contract acceptance.

## Capabilities

### New Capabilities

- `business-processes`: editable descriptive fields and lifecycle of persisted BusinessProcesses.
- `connectivity-needs`: editable basis and lifecycle of persisted ConnectivityNeeds.

### Modified Capabilities

- `access-requests`: new request admission is constrained by the current lifecycle of its Need and parent Process; existing request history remains stable.

## Impact

This contract affects SQLite migrations and immutable-row triggers, `Service` and HTTP routes, the typed WebUI client and Process/Need detail routes, authorization grants, and focused API/browser acceptance. The shared storage, service, HTTP, and WebUI files overlap between #108 and #110, so the design must establish an implementation order or a shared migration boundary before either starts.
