---
type: function
name: Maintain Application profile
epistemic: interpretation
sources:
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md#L36-L36
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L6-L65
- https://github.com/lehater/napms-2/blob/main/docs/research/user-journeys.md#L28-L38
- https://mbse-capella.org/arcadia.html
- https://mbse-capella.org/arcadia-qna.html
level: logical
allocated_to:
- '[[knowledge/components/catalog-and-placement]]'
realizes:
- '[[knowledge/functions/manage-communication-contracts]]'
- '[[knowledge/capabilities/communication-profiles]]'
- '[[knowledge/operational/define-communication]]'
---

# Maintain Application profile

## Input

- A named communication profile with the intended reusable communication context.
- An existing Application identity when the profile is selected from the catalog.

## Output

- The selected or newly recorded Application profile identity.

## Responsibility

Create or select an Application profile that represents reusable network communication semantics, not a software product instance.

## Preconditions

- The profile has a user-understood identity and is within the authorized catalog scope.

## Guarantees

- Downstream Component roles are scoped to this Application.
- Selecting an existing profile preserves its identity.

## Constraints

- Does not create Component roles, Interaction, deployments, business justification, or permission.
- A profile name alone does not imply traffic semantics or authority.
