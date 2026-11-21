---
type: constraint
name: Export использует effective Rule и проверяет authority
epistemic: fact
sources:
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L62-L63
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md
constrains:
- '[[knowledge/domain/policy-export]]'
- '[[knowledge/domain/policy-export-row]]'
- '[[knowledge/domain/policy-rule]]'
- '[[knowledge/domain/authority-grant]]'
---

# Export использует effective Rule и проверяет authority

Экспорт включает только ALLOWED + ACTIVE Rules при условиях на одном evaluationAt и с полномочиями scope.

Источники:
- [1](https://github.com/lehater/napms-2/blob/main/docs/domain.md#L62-L63)
- [2](https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md)
