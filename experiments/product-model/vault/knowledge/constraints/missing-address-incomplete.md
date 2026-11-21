---
type: constraint
name: Missing address сохраняется как INCOMPLETE
epistemic: fact
sources:
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L64-L64
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md
constrains:
- '[[knowledge/domain/policy-export-row]]'
---

# Missing address сохраняется как INCOMPLETE

Строка effective Rule остаётся с Resource identity и null address; она не становится READY.

Источники:
- [1](https://github.com/lehater/napms-2/blob/main/docs/domain.md#L64-L64)
- [2](https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md)
