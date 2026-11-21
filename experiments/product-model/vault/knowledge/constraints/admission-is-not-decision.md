---
type: constraint
name: Admission и решение независимы
epistemic: fact
sources:
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L59-L60
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md
constrains:
- '[[knowledge/domain/access-request]]'
- '[[knowledge/domain/access-decision]]'
---

# Admission и решение независимы

Успешный admission создаёт PENDING; ALLOWED/DENIED требует отдельного полномочия решающего.

Источники:
- [1](https://github.com/lehater/napms-2/blob/main/docs/domain.md#L59-L60)
- [2](https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md)
