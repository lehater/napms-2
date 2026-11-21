---
type: function
name: Define Component roles
epistemic: interpretation
sources:
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md#L37-L37
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L6-L65
- https://github.com/lehater/napms-2/blob/main/docs/research/user-journeys.md#L28-L38
- https://mbse-capella.org/arcadia.html
- https://mbse-capella.org/arcadia-qna.html
level: logical
allocated_to:
- '[[knowledge/components/catalog-and-placement]]'
realizes:
- '[[knowledge/functions/manage-communication-contracts]]'
- '[[knowledge/capabilities/component-roles]]'
- '[[knowledge/operational/define-communication]]'
---

# Define Component roles

## Input

- One Application profile identity.
- Role identities and descriptions for communication participants.

## Output

- Component role identities owned by the Application.

## Responsibility

Record the communicating roles inside an Application so that later Interaction definitions can preserve the source and destination roles.

## Preconditions

- The Application profile is selected or recorded.
- Each role is meaningful within that profile.

## Guarantees

- Every output Component is a role of the specified Application.
- Component role identity is not interpreted as a device, Resource, or Logical Component.

## Constraints

- Does not place a Component on a Resource.
- Does not assign network authority or define a directed Interaction.
