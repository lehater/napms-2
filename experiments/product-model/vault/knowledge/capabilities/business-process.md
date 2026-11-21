---
type: capability
name: C09 · Business Process
epistemic: fact
sources:
- https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md#L54-L54
- https://github.com/lehater/napms-2/blob/main/docs/product.md
capability_code: C09
area: Business Connectivity
scope_classification: A
roadmap_stage: R1
implementation_status: real_slice_documented
implementation_note: Реальный persistent-срез найден в коде и тестах. Поле criticality из C09 отсутствует в текущей схеме и UI; дизайн первого среза явно отложил его до отдельного запроса. Полное покрытие capability не утверждается.
implementation_evidence:
- tests/test_business_processes.py
---

# C09 · Business Process

Сохраняет деловое обоснование связности, процесс, ответственность и criticality.

Источники:
- [1](https://github.com/lehater/napms-2/blob/main/docs/product/capability-map.md#L54-L54)
- [2](https://github.com/lehater/napms-2/blob/main/docs/product.md)
