---
type: function
name: Record ConnectivityNeed
epistemic: interpretation
sources:
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md#L55-L55
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L6-L65
- https://github.com/lehater/napms-2/blob/main/docs/research/user-journeys.md#L28-L38
- https://github.com/lehater/napms-2/blob/main/openspec/changes/persist-connectivity-need/specs/connectivity-needs/spec.md
- https://mbse-capella.org/arcadia.html
- https://mbse-capella.org/arcadia-qna.html
level: logical
allocated_to:
- '[[knowledge/components/business-justification]]'
realizes:
- '[[knowledge/functions/maintain-business-justification]]'
- '[[knowledge/capabilities/connectivity-need]]'
- '[[knowledge/operational/express-connectivity-need]]'
---

# Record ConnectivityNeed

## Input

- One BusinessProcess.
- One directed Interaction and its source Component role.
- A compatible published InteractionRevision used to select that Interaction and source Component, when selection is made through a revision option.
- A business basis for the need.

## Output

- One persistent ConnectivityNeed linked to the BusinessProcess and Interaction, with its source Component role preserved.

## Responsibility

Record why the source participant needs the directed communication for a BusinessProcess.

## Preconditions

- The BusinessProcess is active and the Interaction and source Component belong to a valid communication profile.
- The selected revision is compatible with the Interaction and source Component.
- The Need tuple (BusinessProcess, Interaction, source Component) does not already exist.

## Guarantees

- The source participant role is explicit and is not inferred from a generic Component reference.
- The selected revision is not persisted as part of Need identity; the Need depends on Interaction, not a specific InteractionRevision, ComponentDeployment, Resource address, or current IP.
- Recording a Need does not create an AccessRequest, AccessDecision, or PolicyRule.

## Constraints

- ConnectivityNeed is business justification, not permission.
- The source Component is the Interaction's source participant; it must not be recast as the destination or as a deployed instance.
