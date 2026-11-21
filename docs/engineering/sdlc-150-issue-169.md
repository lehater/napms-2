# Ретроспективный обзор аномалий Harness

**Issue:** [#169](https://github.com/lehater/napms-2/issues/169), дочерняя задача [#150](https://github.com/lehater/napms-2/issues/150).
**Исходная база выборки:** `main@aaee5674c13f3722e494ae62b502f60c74a65695` (2026-11-21).
**Итог:** подтверждён повторяющийся пробел в обнаружении Langfuse-конфигурации; telemetry по фиксированной группе теперь точечно прочитана. Из прежних findings 18 post-terminal status reads остаются кандидатами, не доказанной растратой. В инфраструктуру, сеть, credentials и Harness изменений не вносилось.

## Метод, доступ и границы

До чтения данных была зафиксирована группа принятых outcomes: #126, #151–156, #165, #166 и #168. Для каждой попытки использованы её существующие `(repository, issueId, runId)` из handoff. #165 и #168 приняты как comment-only outcomes; наличие PR не применялось как универсальный критерий. Источниками результата остаются GitHub Issue/Project, PR и Verify run, а Langfuse используется только для структурных наблюдений.

В текущем runtime обнаружена включённая пользовательская конфигурация `~/.codex/langfuse.json` с необходимыми полями подключения; значения не выводились. Файл имеет режим `0600`. Установленный и включённый в `~/.codex/config.toml` `tracing@codex-observability-plugin` версии `0.4.3` зарегистрировал Stop hook и разрешает конфигурацию в порядке `defaults → ~/.codex/langfuse.json → <cwd>/.codex/langfuse.json → environment`; текущих `LANGFUSE_*` overrides нет. Это подтверждается установленным локальным plugin и [его официальной документацией](https://github.com/langfuse/codex-observability-plugin/blob/main/README.md). Репозиторная процедура [task tracing](../../.ai/codex-task-tracing.md) описывает checkout-local metadata, но не объясняет глобальный credential source и этот порядок.

Hook плагина отправляет traces при Stop; он не предоставляет отдельный query tool. Для чтения применён существующий Langfuse Public API с HTTP Basic auth из локальной конфигурации и только GET. Health вернул HTTP 200, версия Langfuse — `4.82.0`; Observations API v2 также вернул HTTP 200. Официальный [Public API guide](https://langfuse.com/docs/api-and-data-platform/features/public-api) подтверждает v2 endpoint, ограничение окна, фильтрацию metadata, выбор групп полей и cursor pagination. Подтверждён успешный read-only запрос, но отдельная проверка полного набора прав ключа не выполнялась; запросов на запись не было.

Окно запроса: `2026-11-19T00:00:00Z <= startTime < 2026-11-22T00:00:00Z`. Запрашивались только `core,basic,metadata,usage,time,metrics`; `io`, prompts, model parameters и trace context не запрашивались. Перед выводом локально оставлялись только совпадения по `repository`, `issueId`, `runId`, типам/уровням и числовому покрытию usage/time. Raw observation/trace IDs, произвольная metadata и свободный текст не выводились и не сохранялись.

В группе 10 заранее выбранных попыток все 10 запросов по runId дали точное совпадение repository/issueId/runId. Совокупно API вернул **1,568 целевых строк** без cursor. Все 10 runId-запросов получили HTTP 200; #151 запрашивалась три раза в рамках той же фильтрации, поэтому её 76 строк включены в знаменатель один раз. С учётом повторных чтений и health всего выполнено **13 GET** за **8 мин 14 сек** — в пределах лимитов исполнителя 15 GET и 15 минут. Упомянутая пользователем предшествующая ручная проверка также была успешна; её число запросов отдельно не указано и в счётчик этой попытки не включено. Широкий inventory и содержательный разбор #168 не повторялись.

## Результаты точечных запросов

Суммы `inputUsage`, `outputUsage` и `totalUsage` ниже относятся только к `GENERATION` rows. Это Langfuse usage units, а не USD, подписочная стоимость или доказательство эффективности. Observation type counts не равны уникальным действиям агента.

| Issue | Rows (GENERATION / TOOL / AGENT) | Input usage | Output usage | Total usage |
|---|---:|---:|---:|---:|
| #126 | 470 (235 / 232 / 3) | 32,070,182 | 146,354 | 32,216,536 |
| #151 | 76 (38 / 35 / 3) | 2,736,359 | 25,674 | 2,762,033 |
| #152 | 106 (53 / 49 / 4) | 6,400,465 | 29,269 | 6,429,734 |
| #153 | 186 (93 / 88 / 5) | 12,763,547 | 73,778 | 12,837,325 |
| #154 | 150 (75 / 69 / 6) | 7,899,083 | 40,306 | 7,939,389 |
| #155 | 126 (63 / 59 / 4) | 6,793,061 | 56,300 | 6,849,361 |
| #156 | 178 (89 / 85 / 4) | 12,001,692 | 76,357 | 12,078,049 |
| #165 | 96 (48 / 47 / 1) | 5,050,691 | 57,020 | 5,107,711 |
| #166 | 138 (69 / 68 / 1) | 8,557,855 | 88,946 | 8,646,801 |
| #168 | 42 (21 / 20 / 1) | 3,450,829 | 34,324 | 3,485,153 |
| **Всего** | **1,568 (784 / 752 / 32)** | **97,723,764** | **628,328** | **98,352,092** |

- `inputUsage`, `outputUsage`, `totalUsage` и `usageDetails` присутствовали во всех 1,568 rows; `latency` — в 932/1,568 (59.4%); `timeToFirstToken` — в 0/1,568. Поле cache-detail с числовым значением присутствовало во всех 784/784 `GENERATION` rows. Его отдельные значения не агрегировались по всей выборке, поэтому cache amount и доля реально использованных cached units остаются `unknown`, а не нулём.
- В 1,568 rows уровень был `DEFAULT`; записанных `WARNING`/`ERROR` не найдено. Это не исключает retries или ошибки, не отражённые уровнем observation. Последовательности действий по девяти новым runId не реконструировались.
- Из агрегатов input usage нельзя восстановить рост контекста по поколениям: временной ряд не сохранялся в проекции. Полная длительность задач также не выводится из trace envelope. Стоимости не агрегировались; сравнение usage между разнородными задачами не доказывает экономии или регрессии.
- Существующие GitHub crosswalk подтверждают шесть merged PR и exact-head Verify для #151–156, принятый PR #157 для #126 и PR #167 для #166. #165 и #168 остаются корректными принятыми issue-comment outcomes без отдельного PR. Telemetry сама по себе не заменяет acceptance или CI.

## Подтверждённый пробел обнаружения конфигурации

Два зафиксированных capability handoff (#156 и первоначальный #169) проверяли наличие Langfuse CLI/MCP и переменных `LANGFUSE_*`, после чего делали вывод о недоступности query route. Они не проверяли пользовательский `~/.codex/langfuse.json` и не исследовали уже установленный tracing plugin. Отсутствие environment variables и CLI оказалось ложным отрицательным сигналом: штатный plugin поддерживает глобальный файл и приоритетно читает его до checkout-local конфигурации и env overrides. В текущем runtime файл был включён, имел необходимые ключи и был доступен; известные runId дали 200 и точные metadata matches.

Поэтому подтверждён не сетевой или credential сбой, а пробел в процедуре discovery и её документации. Предыдущий отчёт #169 ошибочно зафиксировал «0 GET / нет route», а #156 отложил живой пилот. Это повлияло на полноту и срок аналитики; фактическую потерю времени/стоимости и наличие той же конфигурации во всех исторических моментах отдельно измерить нельзя.

**Минимальное исправление к рассмотрению:** дополнить существующий capability-check в `docs/engineering/sdlc-150-issue-156.md`: (1) явно проверять `~/.codex/langfuse.json` и документированный plugin precedence; (2) отделять глобальные credentials от checkout-local task `metadata`; (3) выводить только boolean-проверки конфигурации, затем при owner-authorized read-only доступе проверять health/version и выполнять один ограниченный v2 GET по известному runId с разрешёнными `fields` и пагинацией. Отсутствие CLI или `LANGFUSE_*` тогда не будет считаться отсутствием маршрута. В рамках #169 предложение зафиксировано только в отчёте; сама процедура и Harness не изменялись. Новые CLI, MCP, wrappers, infra и permissions для этого вывода не требуются.

## Ранжированные выводы

| Ранг | Вывод | Распространённость / effect | Уверенность и приоритет |
|---|---|---|---|
| 1 | **Подтверждён пробел discovery глобальной Langfuse-конфигурации.** #156 и первый handoff #169 использовали CLI/env-only проверку; фактический runtime имел включённый глобальный конфиг и доступный API v2. | 2 документированных неполных capability-check; один live-analysis outcome (#169) был отложен до owner confirmation. Потерянное время/стоимость не измерены. Историческая доступность файла на даты #156/#169 не проверялась независимо. | Высокая для дефекта discovery-процедуры, средняя для исторического эффекта. **P1 для компактного документального исправления**, если владелец принимает его. |
| 2 | **18 post-terminal status-read observations #166 остаются подозрительным, но не подтверждённым паттерном.** #168 сохранил matching run/head и terminal signals, но не последовательность нового события/необходимого read-back. | 1/1 выбранного post-change case; 18 candidate observations, 0 подтверждённых redundant calls. | Высокая для наличия observations, низкая для избыточности. **P1 для следующей диагностики**; не открывать новый Finding о растрате. |
| 3 | **Eligibility crosswalk #168 неверно трактовал #165 как outcome без completion evidence.** Контракт #165 требовал issue-comment report, owner acceptance есть, PR не требовался; текущий точный run lookup нашёл 96 строк. | 1 принятый comment-only outcome в фиксированной группе. Риск — недосчёт eligible outcomes при общем PR/Verify proxy. | Высокая для расхождения с контрактом #165; эффект на общую частоту не вычислен. **P2: исправить population rule в дальнейших сравнительных отчётах.** |
| 4 | **Snapshot #166 имеет неизвестную provenance и count drift.** В исходном срезе 1,458/4,813 project rows без repository attribution; #168 повторно получил 3,479 строк в prior window, на 124 больше #166 без manifest/page ledger. | Значимая доля project-wide строк не относится к известному repository; это не означает потери 30.3% NAPMS runs. | Высокая для сохранённых count/coverage, низкая для причины расхождения. **P2 перед широкими frequency claims.** |
| 5 | **#168 была закрыта completed при Project Status Review**, затем статус синхронизировали с Done. | 1/9 проверенных child Issues; исправлено. | Высокая для события, низкая для системной причины. **Наблюдать**, не менять workflow по одному случаю. |

## Сопоставление с реестром и следующие вопросы

- HE-005/006 в Draft PR #138 охватывают polling/reasoning. 18 post-terminal observations #166 остаются evidence для того же кандидата; новая причина не подтверждена. #146/PR #149 остаётся принятой мерой с неизвестным операционным effect.
- Snapshot и attribution gaps согласуются с HE-007/008. Конфигурационный discovery gap не найден как отдельный канонический Problem; не создавать автоматический дубль до дедупликации по #153–154.
- До трёх следующих ограниченных проверок: (1) классифицировать 18 status-read observations по последовательности CI events/read-back; (2) при отдельном bounded окне агрегировать cache detail значения и trace timing без raw data; (3) объяснить +124 snapshot delta по сохранённым ID/page ledger, не повторяя весь inventory.

## Источники

- Принятые outcome/trace handoffs: [#126](https://github.com/lehater/napms-2/issues/126#issuecomment-7042123888), [#151–156 и crosswalk](https://github.com/lehater/napms-2/issues/168#issuecomment-7068470134), [#165](https://github.com/lehater/napms-2/issues/165#issuecomment-7064993411), [#166](https://github.com/lehater/napms-2/blob/55566c59bf8ec83350033b91466ed3f2b55f45f1/docs/engineering/sdlc-150-issue-166.md), [#168 analysis](https://github.com/lehater/napms-2/issues/168#issuecomment-7068443662) and [owner acceptance](https://github.com/lehater/napms-2/issues/168#issuecomment-7068508294).
- Существующая методика: [#152 access/correlation](sdlc-150-issue-152.md), [#153 Finding/dedup](sdlc-150-issue-153.md), [#154 Problem lifecycle](sdlc-150-issue-154.md), [#155 effect/coverage](sdlc-150-issue-155.md), [SDLC improvement roadmap](sdlc-improvement-roadmap.md).
- Штатная интеграция и чтение: [Langfuse Codex plugin configuration](https://github.com/langfuse/codex-observability-plugin/blob/main/README.md), [Observations API v2](https://langfuse.com/docs/api-and-data-platform/features/public-api).

**Ограничение:** это целевая выборка десяти принятых результатов, не случайная выборка всех NAPMS runs. Ранжирование и измерения не устанавливают причинность, качество всех промежуточных действий или финансовый эффект. Harness, Langfuse data, network и credentials не менялись.
