---
type: function
name: Maintain BusinessProcess
epistemic: interpretation
sources:
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md#L54-L54
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L6-L65
- https://github.com/lehater/napms-2/blob/main/docs/research/user-journeys.md#L28-L38
- https://mbse-capella.org/arcadia.html
- https://mbse-capella.org/arcadia-qna.html
level: logical
allocated_to:
- '[[knowledge/components/business-justification]]'
realizes:
- '[[knowledge/functions/maintain-business-justification]]'
- '[[knowledge/capabilities/business-process]]'
- '[[knowledge/operational/express-connectivity-need]]'
---

# Maintain BusinessProcess

## Input

- Business purpose, process identity, responsible organization, and business criticality; description may provide additional context.

## Output

- A persistent BusinessProcess identity and its business context.

## Responsibility

Record and maintain the business context that explains why communication is needed.

## Preconditions

- The process is identifiable by its owner and purpose.

## Guarantees

- BusinessProcess remains a domain business justification and can own ConnectivityNeeds.
- Responsibility and criticality remain descriptive business facts.

## Constraints

- BusinessProcess is not an OperationalProcess.
- Business responsibility or criticality does not grant authority or permit traffic.
