---
type: function
name: Define directed Interaction and traffic revisions
epistemic: interpretation
sources:
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md#L38-L38
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L6-L65
- https://github.com/lehater/napms-2/blob/main/docs/research/user-journeys.md#L28-L38
- https://github.com/lehater/napms-2/blob/main/docs/first-slice.md
- https://mbse-capella.org/arcadia.html
- https://mbse-capella.org/arcadia-qna.html
level: logical
allocated_to:
- '[[knowledge/components/catalog-and-placement]]'
realizes:
- '[[knowledge/functions/manage-communication-contracts]]'
- '[[knowledge/capabilities/directed-interaction-revisions]]'
- '[[knowledge/operational/define-communication]]'
---

# Define directed Interaction and traffic revisions

## Input

- One Application profile and two Component roles from that Application.
- Directed traffic semantics, including protocol and port clauses.

## Output

- One directed Interaction with an immutable traffic revision.

## Responsibility

Record what communication is intended from the source Component role to the destination Component role and version changes to its traffic semantics.

## Preconditions

- Both roles belong to the same Application.
- The directed source-to-destination pair has no existing Interaction; otherwise the existing Interaction is revised.

## Guarantees

- Interaction direction is retained; reversing the pair is a distinct direction.
- Traffic changes create a new revision and do not rewrite prior traffic semantics.

## Constraints

- The directed pair is unique within an Application; traffic clauses and reasons belong to revisions.
- Does not identify deployments, current IP addresses, a BusinessProcess, ConnectivityNeed, or permission.
