---
type: capability
name: C16 · PolicyRule и lifecycle
epistemic: fact
sources:
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md#L75-L75
- https://github.com/lehater/napms-2/blob/main/docs/product.md
capability_code: C16
area: Access Governance
scope_classification: A
roadmap_stage: R0/R1
implementation_status: code_test_evidence
implementation_note: Код/тесты по области найдены в текущем checkout; тесты не запускались, полнота не утверждается.
implementation_evidence:
- tests/test_current_policy.py
---

# C16 · PolicyRule и lifecycle

Сохраняет желаемый доступ и effective state; только ALLOWED создаёт или находит Rule.

Источники:
- [1](https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md#L75-L75)
- [2](https://github.com/lehater/napms-2/blob/main/docs/product.md)
