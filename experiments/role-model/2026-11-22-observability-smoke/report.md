# Codex participant observability smoke

**Date:** 2026-11-22 UTC
**Codex CLI:** `0.171.0`
**Status:** **PARTIAL**

## Result

Native Codex journals identify the coordinator and its direct child thread and retain separate per-thread token usage. The parent-child link is explicit in the child journal, so attribution does not depend on execution time. This establishes a workable local measurement source for session/thread identity, model-call input size, token usage, model-call counts, tool-call events, and a completed child duration.

The requested `Luna Medium` setting was not effective for the child: the coordinator used `gpt-6-luna / medium`, while the child used `gpt-6-luna / high`. The exact model and effective effort are visible in the journal. The coordinator thread was still active at the measurement cutoff, so its final duration is unavailable. The Langfuse query for the coordinator's explicit session ID returned HTTP 200 with zero rows while the session was still open; that does not establish whether the Stop Hook will export it later. A `spawn_agent` event is also present in the child's journal, but no descendant session journal linked to it was found, so the smoke cannot confirm whether an additional nested agent was created.

## Exact identifiers and settings

- Coordinator thread/session: `01a204bf-15ef-7672-b613-aad3db796453`.
- Direct child Agent/thread: `01a204c0-bf14-7022-8d63-50e200bd9d03`, path `/root/native_usage_smoke`.
- Child journal records `parent_thread_id=01a204bf-15ef-7672-b613-aad3db796453`, depth `1`, and `thread_source=subagent`.
- The child journal's `session_id` is the coordinator session ID; the child `id` and journal filename carry its distinct thread ID. Langfuse session ID alone therefore cannot distinguish these participants.
- Catalog display name: `GPT-6-Luna`; exact model slug: `gpt-6-luna`. Codex config selected `gpt-6-luna / medium`; the coordinator journal confirms it. The child journal confirms `gpt-6-luna / high`.

## Measurements

| Metric | Source | Coordinator | Subagent | Достоверность | Ограничения |
|---|---|---:|---:|---|---|
| Session ID / Agent ID | Codex journal `session_meta` (`id`, `session_id`) | Session/thread `01a204bf-15ef-7672-b613-aad3db796453` | Shared session ID `01a204bf-15ef-7672-b613-aad3db796453`; Agent/thread `01a204c0-bf14-7022-8d63-50e200bd9d03` | Высокая | В Langfuse один `sessionId` не различает участников; нужен thread/Agent ID, которого в ответе Langfuse не было. |
| Parent-child связь | Child `session_meta.source.subagent.thread_spawn` | Parent thread ID `01a204bf-15ef-7672-b613-aad3db796453` | Child depth 1; path `/root/native_usage_smoke` | Высокая | В child-журнале есть ещё событие `spawn_agent`, но соответствующий descendant thread не найден; наличие второго уровня не подтверждено. |
| Model / reasoning effort | Codex `thread_settings_applied` и текущий model catalog | `gpt-6-luna` / `medium` | `gpt-6-luna` / `high` | Высокая | Effort дочернего потока не совпал с запрошенным Medium; одинаковые условия для сравнения не получены. |
| Максимальный prompt за один вызов | Максимум `event_msg.token_count.info.last_token_usage.input_tokens` | 78,097 токенов | 62,794 токена | Высокая | Это фактический input текущего thread на один вызов; `model_context_window=258400` — размер окна модели, не максимальный фактический prompt. Координатор включает исследование и подготовку этого отчёта до среза. |
| Суммарные input / cached input / output | Последний `info.total_token_usage` на thread | 1,221,827 / 1,146,368 / 19,503 | 62,794 / 6,784 / 79 | Высокая | Срез локального журнала на 19:39:42.550Z; coordinator ещё работал. `cached_input_tokens` входит в `input_tokens`; reasoning output входит в `output_tokens`. |
| Model calls | Число `event_msg.token_count` | 24 | 1 | Высокая | Счётчик относится к событиям токенизации/usage в локальном журнале; Langfuse пока не дал независимого подтверждения. |
| Tool calls | `response_item` вызовы Codex tools | 24: 22 `exec`, `spawn_agent`, `list_agents` | 14: 13 `exec`, `spawn_agent` | Средняя | Считаются внешние вызовы инструментов, записанные в потоке Codex. Вызовы, сгруппированные внутри `exec`, не раскрыты как отдельные операции; событие `spawn_agent` у child не имеет найденного descendant-журнала. |
| Длительность | Временные метки локального журнала | Не завершена; минимум 7 мин 00.961 с от начала сессии до среза | 6.068 с (19:34:30.429–19:34:36.497Z) | Средняя для child; отсутствует для coordinator | Child завершён. Coordinator thread активен, поэтому итоговая wall-clock длительность неизвестна. |
| Langfuse наблюдения | Langfuse CLI 1.4.0, `observations list` по явному `sessionId` | HTTP 200, 0 строк | Не отделяется по общему `sessionId` | Низкая / неприменимо | Запрос сделан до Stop Hook закрытия текущей сессии; пустой результат не доказывает сбой экспорта. Не делалась атрибуция по времени. |

## Семантика usage и двойной учёт

Локальный `info.total_token_usage` — накопительный счётчик текущего thread, а `info.last_token_usage` — usage последнего model call. В измерениях использован один конечный cumulative snapshot на thread; промежуточные snapshots не суммировались. Проверка полей показывает `total_tokens = input_tokens + output_tokens`. Cached input является подмножеством input, а reasoning output — подмножеством output; добавлять их к этим totals нельзя. Child имеет собственный journal/thread ID и отдельный usage record. В отчёте child usage не добавлялся повторно к coordinator total.

Такой срез не проверяет будущую семантику Langfuse export или подсчёт provider billing units: в доступном запросе observations не было. Для следующего эксперимента необходимо явно задавать и проверять `reasoning_effort=medium` при создании subagent, а затем проверять итоговый экспорт по participant/thread ID, а не по времени.

## Воспроизводимость и источники

- Локальные журналы Codex: `rollout-2026-11-22T19-32-41-01a204bf-15ef-7672-b613-aad3db796453.jsonl` и `rollout-2026-11-22T19-34-30-01a204c0-bf14-7022-8d63-50e200bd9d03.jsonl` в `~/.codex/sessions/2026/11/22/`. Опубликованы только производные метрики; сырые журналы и prompts не копировались.
- Локальная настройка модели: `~/.codex/config.toml`; каталог модели: `codex debug models`.
- Langfuse: read-only запрос observations с фильтром по точному coordinator `sessionId`; HTTP 200, 0 rows. Конфигурация/ключи не публиковались.
- Числа по участникам и ограничения также вынесены в [`measurements.csv`](measurements.csv).
