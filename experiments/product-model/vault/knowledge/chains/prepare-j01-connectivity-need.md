---
type: functional_chain
name: Prepare a J01 ConnectivityNeed
epistemic: interpretation
sources:
- https://github.com/lehater/napms-2/blob/main/docs/research/user-journeys.md#L28-L38
- https://github.com/lehater/napms-2/blob/main/docs/domain.md#L35-L65
- https://github.com/lehater/napms-2/blob/main/docs/first-slice.md
- https://mbse-capella.org/arcadia.html
- https://mbse-capella.org/arcadia-qna.html
level: logical
references:
- '[[knowledge/capabilities/communication-profiles]]'
- '[[knowledge/capabilities/component-roles]]'
- '[[knowledge/capabilities/directed-interaction-revisions]]'
- '[[knowledge/capabilities/business-process]]'
- '[[knowledge/capabilities/connectivity-need]]'
---

# Prepare a J01 ConnectivityNeed

Логическая композиция от профиля коммуникации и его направленного Interaction до process-backed ConnectivityNeed. Граница начинается с наличия или выбора Resource/Endpoint context, но не раскрывает их обслуживание, deployment creation или разрешение IP. Need остаётся независимым от deployment и не выдаёт разрешение.

Порядок фиксирует только зависимости данных: профиль → роли → Interaction; BusinessProcess и Interaction → Need. Между подготовкой Interaction и BusinessProcess отдельный порядок не задан.

Источники:
- [1](https://github.com/lehater/napms-2/blob/main/docs/research/user-journeys.md#L28-L38)
- [2](https://github.com/lehater/napms-2/blob/main/docs/domain.md#L35-L65)
- [3](https://github.com/lehater/napms-2/blob/main/docs/first-slice.md)
