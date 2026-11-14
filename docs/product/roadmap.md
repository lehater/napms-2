# NAPMS 2.0 — Product Roadmap

**Назначение:** последовательность проверяемых продуктовых результатов, независимая от постоянной [Capability Map](capability-map.md) и технического [SDLC Roadmap](../engineering/sdlc-improvement-roadmap.md). **Актуализировано:** 2026-11-14. **Сроки и даты релизов:** не назначены.

## Product Vision

NAPMS 2.0 управляет обоснованной сетевой связностью: от ресурсов, коммуникационных профилей и бизнес-потребности через авторизованную заявку и решение — к текущей объяснимой vendor-neutral политике доступа. Система сохраняет происхождение разрешения и явно показывает неполноту адресной реализации.

**Вход:** Resource/Endpoint, профили Application/Component/Interaction/Revision, ComponentDeployment, BusinessProcess/ConnectivityNeed, действующие actor grants и решения об открытии доступа.

**Выход:** прослеживаемые AccessRequest, AccessDecision и PolicyRule, а также текущая или выбранная vendor-neutral политика JSON/CSV со статусом READY/INCOMPLETE и единым моментом оценки. `DENIED` заявки не означает технического запрета и не заменяет отзыв действующего доступа.

**Принятая граница MVP:** локальный React → FastAPI → SQLite, серверная авторизация, авторизованный просмотр и экспорт. **За границей:** production IAM, deployment в production, автоматическая настройка firewall, network reconciliation и операционный мониторинг; включение этих направлений требует отдельного решения.

## Этапы и результаты

| Этап | Проверяемый продуктовый результат | Capabilities | Статус / подтверждения |
|---|---|---|---|
| **R0 · Локальное ядро** | AccessRequest → PENDING → ALLOWED/DENIED → один canonical PolicyRule → scoped JSON/CSV | C12, C14–C16, C18 | Реализовано в [PR #5](https://github.com/lehater/napms-2/pull/5), затем расширено [PR #55](https://github.com/lehater/napms-2/pull/55). Исторический локальный срез |
| **R1 · Реальный сквозной MVP** | Созданные пользователем Resource/Endpoint, Profile/Component/Interaction/Deployment, BusinessProcess/Need → выбор участников → Request → Decision → Rule → выбранный и текущий policy export | C01–C02, C05–C10, C12–C16, C18 | Реализация объединена в main ([#44](https://github.com/lehater/napms-2/pull/44), [#51](https://github.com/lehater/napms-2/pull/51), [#55](https://github.com/lehater/napms-2/pull/55), [#65](https://github.com/lehater/napms-2/pull/65), [#67](https://github.com/lehater/napms-2/pull/67)). Владелец принял результат [в PR #55](https://github.com/lehater/napms-2/pull/55#issuecomment-6864315294); остаётся формально связать/закрыть Issues #36/#37 и проверить Project #6 |
| **После MVP · Неблокирующие улучшения** | Адресные UX/семантические правки по подтверждённой ценности | C07 и связанные функции | [#72](https://github.com/lehater/napms-2/issues/72) / [Draft PR #73](https://github.com/lehater/napms-2/pull/73) — source/destination port ranges; [#71](https://github.com/lehater/napms-2/issues/71) — retry Request Detail. Ни одна не считается автоматическим блокером R1 |
| **D · Product Discovery** | Проверка ценности, пользователей, сценариев и границ для ещё не принятых возможностей | C03, C04, C11, C17, C19–C25, C35–C38 | Кандидаты без сроков, Epics и обязательств реализации. Вход — [User Journeys](../research/user-journeys.md) J03/J05/J06/J08 |
| **O · Вне текущего плана** | Потенциальная цепочка target policy → provider configuration → сравнение → изменение → независимая проверка | C26–C34 | Не создавать обязательств до отдельного Product Discovery и решения владельца |

**R1 включает ранее предлагавшийся R2 (просмотр/экспорт и завершающая приёмка)**: это один проверяемый результат, а не два искусственных релиза. Доставка и формальное закрытие Issues — разные аспекты. Завершённые PR не дают права объявлять продукт production-ready.

## Один пилотный Epic для Project #6

**Рабочее название:** `Epic: REAL business-to-policy journey`.

**Outcome:** реальный сквозной путь от созданного бизнес-контекста и Need до авторизованного решения, конкретного PolicyRule и JSON/CSV экспорта, без подмены MOCK, с сохранением данных и действующими серверными grants.

| Существующая Issue | Delivery evidence | Действие в пилоте |
|---|---|---|
| [#64](https://github.com/lehater/napms-2/issues/64) — Application/Deployment каталоги | [PR #65](https://github.com/lehater/napms-2/pull/65) merged | Подключить завершённой sub-issue |
| [#37](https://github.com/lehater/napms-2/issues/37) — business-to-request read path | [PR #38](https://github.com/lehater/napms-2/pull/38), [#51](https://github.com/lehater/napms-2/pull/51), [#55](https://github.com/lehater/napms-2/pull/55) merged | Зафиксировать свидетельства и owner acceptance, затем закрыть как выполненную |
| [#36](https://github.com/lehater/napms-2/issues/36) — Rule detail/export | [PR #55](https://github.com/lehater/napms-2/pull/55) merged; [PR #56](https://github.com/lehater/napms-2/pull/56) спецификация | Зафиксировать свидетельства и owner acceptance, затем закрыть как выполненную |

**Не включать автоматически:** #72 (развитие source-port semantics), #71 (UX recovery), #10/#57 (SDLC/Harness), #74 (само проектное управление). Не создавать новых feature-Issues, чтобы объяснить уже доставленные PR.

**Условия закрытия Epic:** подтверждены ссылки на реализацию и принятые критерии всех трёх sub-issues; владелец принимает родительский результат; проверена работа существующих GitHub Project workflows. Прогресс sub-issues — показатель выполнения работ, не процент продуктовой готовности.

## Правила управления в GitHub

- [Project #6](https://github.com/users/lehater/projects/6) — **единый обзор**; репозиторий хранит продуктовую модель, Issues — изменяемые планы работ, PR — свидетельство доставки.
- Capability ≠ Epic: одна capability может развиваться несколькими срезами; один Epic объединяет конкретный ограниченный результат.
- Использовать уже существующие `Status`, Parent/Sub-issues, `Sub-issues progress`, `Linked pull requests`; **не** создавать собственную систему отслеживания.
- Если не хватает классификации, рассмотреть **одно** поле `Workstream` (Product/SDLC) после проверки labels/native issue types; не смешивать с `Epic/Task/Bug`.
- Не задавать выдуманные даты/Story Points. Без дат Roadmap лучше показывать табличным представлением, не фиктивной timeline.
- Прежде чем масштабировать структуру, провести **один пилот** по [Issue #74](https://github.com/lehater/napms-2/issues/74) и проверить GitHub workflows, особенно автоматическое закрытие.

## Источники

- [Product basis](../product.md), [Domain model](../domain.md), [First slice](../first-slice.md)
- [Capability Map](capability-map.md), [Capability Inventory](../research/product-capability-inventory.md), [User Journeys](../research/user-journeys.md)
- [Issue #74](https://github.com/lehater/napms-2/issues/74) — план и контроль изменений Project #6
