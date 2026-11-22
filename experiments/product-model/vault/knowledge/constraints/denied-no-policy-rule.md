---
type: constraint
name: DENIED не создаёт PolicyRule
epistemic: fact
sources:
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L60-L60
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md
constrains:
- '[[knowledge/domain/access-decision]]'
- '[[knowledge/domain/policy-rule]]'
---

# DENIED не создаёт PolicyRule

Только ALLOWED для exact AccessSubject создаёт или находит единственный Rule.

Источники:
- [1](https://github.com/lehater/napms-2/blob/main/docs/domain.md#L60-L60)
- [2](https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md)
