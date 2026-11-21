---
type: constraint
name: InteractionRevision traffic semantics are immutable
epistemic: fact
sources:
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L14-L14
- https://github.com/lehater/napms-2/blob/main/openspec/changes/real-application-deployment-catalogs/specs/application-catalog/spec.md#L39-L56
constrains:
- '[[knowledge/domain/interaction-revision]]'
- '[[knowledge/functions/define-directed-interaction-revisions]]'
---

# InteractionRevision traffic semantics are immutable

Published traffic semantics remain unchanged. A change is represented by a new revision, preserving the exact historical values used by dependent requests and rules.
