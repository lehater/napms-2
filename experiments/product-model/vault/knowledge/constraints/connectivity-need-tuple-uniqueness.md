---
type: constraint
name: ConnectivityNeed is unique per Process, Interaction, and source Component
epistemic: fact
sources:
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L58-L58
- https://github.com/lehater/napms-2/blob/main/openspec/changes/persist-connectivity-need/specs/connectivity-needs/spec.md#L19-L27
constrains:
- '[[knowledge/domain/connectivity-need]]'
- '[[knowledge/functions/record-connectivity-need]]'
---

# ConnectivityNeed is unique per Process, Interaction, and source Component

One tuple identifies one Need. A different Interaction or source participant may create a separate Need for the same Process; a different Process may reuse the same Interaction.
