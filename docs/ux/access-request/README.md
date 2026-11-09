# NAPMS 2.0 — UX Visual Baseline: NID-first Access Request

**Статус:** на приёмке в Draft PR; композиция S02–S05 принята координатором 2026-11-09, две P1-правки S03/S04 внесены.  
**Источник:** [согласованный UX Scenario Contract](./scenario.md) и [UI/IA Baseline v0.2](../../research/ui-baseline-v0.2/README.md).  
**Формат:** 8 статических PNG **1920 × 1120**; `RESEARCH / MOCK`. Это визуальная спецификация, **не** функционирующий UX и не real API.

## 1. Состав

| Экран | PNG | Назначение |
|---|---|---|
| S02-A | [s02-a.png](./s02-a.png) | ConnectivityNeed Detail: exact subject выбран, нет видимого разрешения, можно подать заявку |
| S02-B | [s02-b.png](./s02-b.png) | Тот же Detail: для exact subject существует ACTIVE PolicyRule P1; повторная подача допустима |
| S02-C | [s02-c.png](./s02-c.png) | Для выбранной Revision и source нет совместимого destination; отправка недоступна |
| S03 | [s03.png](./s03.png) | AccessRequest Collection: доступные заявки, контексты Requester и Decider |
| S04 PENDING | [s04-pending.png](./s04-pending.png) | Q3: Decider выбирает ALLOWED или DENIED; **изначально ни одно решение не выбрано** |
| S04 ALLOWED | [s04-allowed.png](./s04-allowed.png) | Q3: терминальное ALLOWED, ссылка на канонический Rule при праве чтения |
| S04 DENIED | [s04-denied.png](./s04-denied.png) | Q3: альтернативное терминальное DENIED; **новый Rule не создаётся и существующие не отзываются** |
| S05 | [s05.png](./s05.png) | P2: read-only PolicyRule Detail для ветки Q3 ALLOWED, exact subject и provenance |

## 2. Цепочка пользовательских действий

```text
S02-A ConnectivityNeed Detail
  -> подтверждение AccessRequest (Q3, PENDING)
  -> S03 AccessRequest Collection (Requester видит свою Q3)
  -> mock-переключение Requester -> Decider
  -> S03 -> S04 PENDING (проверка subject, Need, admission)
  -> явный выбор ALLOWED / DENIED -> подтверждение ровно одного решения
       |-> S04 ALLOWED -> S05 P2 [только при праве policy.export для обоих Resource]
       \-> S04 DENIED [нет P2; ранее существующий P1 не отозван]
  -> Requester открывает Q3 и проверяет сохранённое состояние
```

В S04 PENDING выбор **пустой по умолчанию**, кнопка подтверждения **недоступна**. После явного выбора показывается диалог/панель подтверждения выбранного исхода; второе решение запрещено. Раздельные роли являются только mock-симуляцией, не авторизацией.

## 3. Инварианты и фиктивные сценарные данные

- **Exact AccessSubject** — упорядоченная тройка `(source ComponentDeployment, destination ComponentDeployment, InteractionRevision)`. Ни Need, ни IP не входят в identity.
- **Исторический fixture `main`:** Q1 (ALLOWED) и Q2 (DENIED) имеют **одинаковые Need и exact AccessSubject** `(dep-order-1, dep-ledger-1, rev-1)`. P1 — ACTIVE Rule для этого же subject. Q2 — самостоятельная повторная DENIED-заявка, не отзыв P1.
- **Дополнительная ветка S02-A / S03–S05 (только сценарный mock):** `dep-ledger-2` на `ledger-api-02`, `(dep-order-1, dep-ledger-2, rev-1)`, новая Q3 (PENDING). При ALLOWED возникает D3 и P2; при DENIED — D3 DENIED, **P2 отсутствует**. Изображения ALLOWED и DENIED показывают **альтернативные исходы**, а не последовательные решения Q3.
- **S02-C:** отсутствие совместимого destination — **явно заданный тестовый контекст**, не утверждение о содержимом реальных каталогов.
- `AccessRequest`/`AccessDecision`/`PolicyRule` имеют независимые жизненные состояния. `ALLOWED` повторно использует существующий канонический Rule для same subject, но не активирует INACTIVE Rule.
- `ACTIVE PolicyRule` — декларированное разрешение; фактическая доступность, доставка пакетов, ACL и конфигурация устройств не подтверждены.
- Право увидеть собственную заявку не предоставляет право решать её и не раскрывает защищённые детали PolicyRule. Для `GET /policy-rules/{id}` нужен `policy.export` на **оба** Resource.

## 4. Приёмка двух замечаний P1

| ID | Было | Стало | Проверка |
|---|---|---|---|
| P1-S03 | Q2: «Тот же Need, иной subject» | «Тот же Need и exact AccessSubject; отдельная DENIED-заявка» | Сверить Q1/Q2 и колонки subject на `s03.png` |
| P1-S04 | ALLOWED предварительно выделен | ALLOWED/DENIED не выбраны, кнопка подтверждения неактивна; подтверждение появляется после выбора | Проверить `s04-pending.png` и затем интерактивный mock |

## 5. Граница принятия и передача в Penpot

Сохранение PNG в GitHub завершает визуальный этап; **не** проверяет интерактивность, persistence и серверные полномочия. Следующий отдельный шаг: воспроизвести экраны в одном редактируемом Penpot Cloud-файле, используя PNG как пиксельный референс, с едиными компонентами Sidebar, Breadcrumbs, Tabs, Table, Form/Choices, Status, Rule Detail. Не требуется придумывать новые страницы/Sidebar-разделы.

В интерактивном mock проверить: роль Requester/Decider, явный выбор + подтверждение, обработку конкурирующего решения, связанные переходы, отсутствие/ограничение видимости/ошибку данных, терминальные состояния и альтернативные ветки. Backend, IAM, REST API и применение сетевой политики — **отдельная реализация**.

**Reference baseline:** [main `642a6f8`](https://github.com/lehater/napms-2/tree/642a6f8) (09.11.2026); настоящий backend/fixtures этой публикацией не меняются.
