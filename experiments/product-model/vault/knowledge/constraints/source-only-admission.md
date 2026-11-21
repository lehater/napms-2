---
type: constraint
name: Admission требует полномочие на source Resource
epistemic: fact
sources:
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L59-L59
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md
constrains:
- '[[knowledge/domain/access-request]]'
---

# Admission требует полномочие на source Resource

При подаче проверяется access.request на source Resource; отказ admission не является DENIED.

Источники:
- [1](https://github.com/lehater/napms-2/blob/main/docs/domain.md#L59-L59)
- [2](https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md)
