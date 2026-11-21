---
type: constraint
name: Идентичность Resource и Endpoint не зависит от IP
epistemic: fact
sources:
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L53-L54
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md
constrains:
- '[[knowledge/domain/resource]]'
- '[[knowledge/domain/resource-endpoint]]'
- '[[knowledge/domain/component-deployment]]'
---

# Идентичность Resource и Endpoint не зависит от IP

Смена или отсутствие IP не создаёт новый Resource или Endpoint.

Источники:
- [1](https://github.com/lehater/napms-2/blob/main/docs/domain.md#L53-L54)
- [2](https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md)
