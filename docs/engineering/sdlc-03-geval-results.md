# SDLC-03 — первые измерения DeepEval и оценка достоверности

**Дата прогона:** 2026-11-07 05:39:29 UTC. **Источник:** JSON, сформированный на пользовательской WSL2 и переданный в Issue #9 через управляющий чат. **Статус:** частичный результат, не принятие инструмента.

## Зафиксированные входы

| Параметр | Значение |
| --- | --- |
| Experiment code | [run_geval.py](../../experiments/sdlc-03/run_geval.py), версия на момент прогона — до diagnostic-only расширения |
| Codex implementation | [commit 4f09406](https://github.com/lehater/napms-2/commit/4f09406ceae0475bba5252b062ff12e3fd24e8e3), candidate SHA-256 `e228b3c033b04627b09c45dab02f86eb56ceaa1b7a466aaa44bca61fd5ce4eb4` |
| Negative control | [negative_control.py](../../experiments/sdlc-03/negative_control.py), SHA-256 `d510696e215d75c1943bb23157cabe15c72c52f5d9c65052882910f6d5d80dc0`; **создан вручную после Codex** |
| Contract SHA-256 | `7d62d218bd7babe4e971fa58c7e393243e8d8732760b8d9e9cb3a960e0c7bed8` |
| DeepEval / local judge | `deepeval==4.3.3`, Ollama `gpt-oss:20b`, temperature 0, `GEval` с фиксированными evaluation_steps |
| Threshold in initial script | `0.5` |
| Repetitions | 3 на образец, фактически запрошено 6 |
| Results file | локальный `/tmp/napms-sdlc03-geval.json`; файл не опубликован целиком |

## Фактический результат

| Образец | Trial 1 | Trial 2 | Trial 3 | Независимый тестовый oracle |
| --- | --- | --- | --- | --- |
| `candidate_codex` | `TimeoutError` | `TimeoutError` | `TimeoutError` | 12/12 PASS |
| `negative_control_manual` | 0.5 | 0.5 | 0.5 | 11/12 PASS, нарушение formula prefix |

Все три обоснования отрицательного образца **правильно назвали** недостающую защиту от интерпретации формул в экспортированных ячейках, включая `request_id`; также отметили соответствие остальным требованиям.

В скрипте `threshold=0.5`: если интерпретировать `metric.is_successful()` / стандартный порог DeepEval как бинарный gate, дефектный образец с оценкой **ровно 0.5 прошёл бы его**. Поэтому **содержательно правильное объяснение не означает правильного автоматического решения**. Успешных GEval-оценок корректного образца нет; false negative / score discrimination по этому прогону **unknown**, а не `0`. Три таймаута корректного образца — **не доказательство** недостаточной способности модели; отдельно исследовать latency/time budget.

### Что доказано и что пока не доказано

- **Доказано:** локальная связка DeepEval + Ollama генерирует содержательные GEval scores/reasons для одного типа дефекта; синтетический negative control публичные проверки пропускают.
- **Не доказано:** автоматическое корректное разделение positive/negative, надёжность выполнения, калибровка score, добавленная ценность по сравнению с **полным** independent oracle и экспертным code review, пригодность как CI quality gate.
- **Важно:** сравнение с неполными public tests показывает потенциальную пользу по сравнению с *неполной* тестовой базой. Это не превосходство над имеющимися полными детерминированными контрактными проверками.
- **Ни одна оценка 0.5 не должна трактоваться как подтверждение исполнения всего контракта.** Порог для будущего gate требуется обосновать после независимой калибровки, а не менять задним числом.

## Диагностический follow-up: ограниченный повтор только корректного образца

[Официальное руководство DeepEval по таймаутам](https://deepeval.com/docs/troubleshooting) и [список переменных окружения](https://deepeval.com/docs/environment-variables) разрешают установить `DEEPEVAL_PER_TASK_TIMEOUT_SECONDS_OVERRIDE` и `DEEPEVAL_RETRY_MAX_ATTEMPTS`.

Для устранения неопределённости — **один diagnostic-only вызов**, не перезапускать Codex и не повторять уже успешный negative control. Время и режим timeout должны войти в отдельный новый результат, **не перезаписывать** исходный JSON. Для проверки механизма временно задаём внешний бюджет 600 секунд и 1 попытку. Значение 600 — инженерный диагностический лимит, **не рекомендуемый CI timeout**:

~~~bash
git pull --ff-only
DEEPEVAL_DISABLE_DOTENV=1 DEEPEVAL_TELEMETRY_OPT_OUT=1 \
DEEPEVAL_PER_TASK_TIMEOUT_SECONDS_OVERRIDE=600 \
DEEPEVAL_RETRY_MAX_ATTEMPTS=1 \
/tmp/napms-sdlc03-venv/bin/python experiments/sdlc-03/run_geval.py \
  --candidate experiments/sdlc-03/policy_csv.py \
  --negative experiments/sdlc-03/negative_control.py \
  --model 'gpt-oss:20b' \
  --only candidate_codex --repeats 1 \
  --out /tmp/napms-sdlc03-geval-positive-diagnostic.json
~~~

Если это тоже завершается `TimeoutError`, зафиксировать время/исключение, не увеличивать таймаут бесконечно. Проверить отдельно, способен ли сервер обработать краткий запрос с этой моделью и не исчерпаны ли системные ресурсы; только после этого решать вопрос смены модели на уже установленную `qwen3-coder:30b`.

**Текущее решение SDLC-03: DEFER (временное)** — не внедрять DeepEval в CI, получить минимум одну успешную оценку подтверждённо корректного образца и проверить правило классификации независимо от score. PR #15 сохранить Draft; issue #9 остаётся открытым.
