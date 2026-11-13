# SDLC-01 — Python Quality Gates: baseline и правила

**Issue:** [#7](https://github.com/lehater/napms-2/issues/7).
**Дата измерения:** 2026-11-07 (запуск GitHub Actions от 2026-11-06 22:56 UTC).
**Источник:** `main` на момент ответвления — `195391e86b0b8d0b9e0a752e71f6aceab3bb306c`;
измерительный commit — `c53f1a3e6bdeaf54b98f568264c241f3f9ed7f7c`;
[Verify run #22](https://github.com/lehater/napms-2/actions/runs/42308341688).
**Подтверждение gate policy:** [Verify run #23](https://github.com/lehater/napms-2/actions/runs/42308615660) — оба jobs PASS, Ruff core 0 замечаний; три advisory шага имеют исходный outcome `failure` в job summary, без блокировки CI.
**Область:** `src/`, `tests/`, 60 существующих pytest-тестов; исходный код и контракты продукта не изменены.

## 1. Воспроизводимое выполнение

Python 3.12 (в исходном CI — 3.12.16), Linux runner; зависимости устанавливаются в виртуальную среду. Для Pyright нужен Node.js, используемый Python-обёрткой Pyright; отдельный проектный Node-пакет не создаётся.

```bash
python -m pip install -e '.[test,quality]'
python -m pytest -q --cov=napms --cov-report=term-missing
python -m ruff check --select E4,E7,E9,F src tests
python -m ruff check src tests
python -m ruff format --check src tests
python -m pyright
```

GitHub `Verify` выполняет те же команды в job `application` и отдельно проверяет `openspec validate --all --strict` в `validate`. Локально каждый инструмент возвращает ненулевой код при нарушениях. В CI **только расширенный Ruff, форматирование и Pyright** имеют `continue-on-error`, их исходные outcomes показаны в summary и логах. Инструменты измерения закреплены через extra `quality`: Ruff **0.17.4**, Pyright **1.1.414**, pytest-cov **7.1.0**. Pyright: Python 3.12, `basic`, `src/` и `tests/`; Ruff: Python 3.12.

## 2. Измеренный baseline

| Проверка | Результат измерения | Режим |
|---|---|---|
| pytest и HTTP/AC-01…AC-08 | **60 passed**, 1 существующее deprecation warning | blocking |
| OpenSpec | **PASS** | blocking |
| Ruff core `--select E4,E7,E9,F` | **0 диагностик**, PASS на run #23 | blocking |
| Coverage (`napms`, statements) | **324 / 341**, **95%** округлённо | измерение; порога нет |
| Ruff расширенный `check src tests` | **19 диагностик**, exit 1 | advisory |
| Ruff `format --check` | **10 из 11** Python-файлов требуют форматирования, exit 1 | advisory |
| Pyright `basic` | **8 errors**, 0 warnings, exit 1 | advisory |

Детализация покрытия: `dev.py` — **51/68, 75%**; `domain.py` — 19/19; `http.py` — 127/127; `storage.py` — 40/40; `use_cases.py` — 87/87; `__init__.py` — 0 инструкций. Подпроцессы, запускаемые интеграционными тестами, не собираются обычным `pytest-cov` автоматически; показатель отражает измеренные процессы и ветки, а не гарантию полной проверки CLI или безопасности.

Распределение 19 Ruff-диагностик: `C408` — 7, `I001` — 4, `PLW1510` — 3, `SIM117` — 3, `C401` — 1, `UP017` — 1. Ошибки Pyright находятся в `src/napms/http.py`: `reportInvalidTypeForm` — 5, `reportArgumentType` — 3. В частности, проверяющий выявляет динамические аннотации и недостаточно точные типы при построении ответа. Не следует исправлять их массовыми `ignore` или `Any` без проверки API-контрактов.

## 3. Gate policy

- **Сразу blocking:** существующие 60 тестов, OpenSpec и минимальный Ruff `--select E4,E7,E9,F` (синтаксические/критичные ошибки и неопределённые имена). На run #23 выбранный набор проходит с 0 диагностик.
- **Advisory:** расширенный Ruff, полный Ruff format, Pyright. Сейчас их массовое включение в обязательный gate сломало бы `main` на уже существующих нарушениях. Каждое последующее изменение должно анализировать новые диагностические сообщения.
- **Coverage:** фиксируем покрытие по модулю и общее число; не вводим `--cov-fail-under` без оценки риска конкретных непройденных сценариев. Следующая итерация может добавить subprocess coverage, если это влияет на решения.
- **Повышение строгости:** сначала отдельный небольшой PR исправляет конкретный класс существующих замечаний; при подтверждённом нулевом baseline и зелёном CI правило переводится в blocking. Реформатирование всех файлов и аннотация всей кодовой базы — отдельные изменения, не часть этого измерения.
- **Версии:** инструменты измерения закреплены точно; runtime-зависимости проекта пока заданы диапазонами, что оставляет дрейф транзитивных версий между запусками. В долгоживущем сравнении следует сохранять перечень фактически установленных версий или закреплять environment snapshot.

## 4. Минимальная security-оценка

В текущем `Verify` уже существуют негативные HTTP/security-тесты и OpenSpec-ограничения dev/test boundary; Ruff-core обнаруживает отдельные статические ошибки, но **не является SAST**. Постоянный dependency-audit не добавлен: runtime/транзитивные версии пока не lock-фиксированы, а результаты внешней базы уязвимостей меняются во времени. Кандидат для следующего изолированного эксперимента — `pip-audit` на сохранённом resolved dependency snapshot с датой и URL advisory, сначала informational. Вводить новый blocking security gate можно после проверки сигнала и false positives.

## 5. Границы результата

Это baseline **качества продукта**, а не доказательство эффективности Codex/Harness. CI не записывает внутренние решения агента, его токены и стоимость. Метрики процесса `PR → CI → merge` — отдельная задача [#8](https://github.com/lehater/napms-2/issues/8). Результат не служит разрешением эксплуатации NAPMS вне локального dev/test.

## 6. Локальные профили проверок для PolicyRule

[Issue #57](https://github.com/lehater/napms-2/issues/57) вводит ограниченный локальный профиль для коротких итераций над REAL PolicyRule. Это выбор набора локальных проверок, а не изменение GitHub `Verify`: workflow, required checks, docs-only классификация и security-регрессии остаются прежними. Размер экономии времени не измерялся; парные прогоны и бенчмарки не выполняются.

Перед правками можно посмотреть решение и команды без запуска:

```bash
python3 scripts/check-fast.py --dry-run
```

Для подходящих PolicyRule-only изменений выполнить FAST. Для остальных правок выбрать локальные проверки по области влияния; FULL использовать при неизвестном влиянии или для диагностики. Полный GitHub `Verify` остаётся обязательным перед интеграцией.

Когда выбран FAST, запуск:

```bash
python3 scripts/check-fast.py
```

Селектор сравнивает весь рабочий набор с `git merge-base origin/main HEAD`: staged и unstaged изменения tracked-файлов плюс untracked-файлы. Список путей и rename/delete статусы читаются в NUL-разделённом формате. Кандидат FAST допустим только когда все изменения относятся к существующим `web/src/PolicyRule.tsx` и `web/src/PolicyRules.tsx`; удаление, rename/copy, неизвестный путь/статус, пустой diff, отсутствующая база или ошибка классификации выбирают FULL. При неготовой среде скрипт останавливается с ненулевым кодом, печатает отсутствующие зависимости и сохраняет требование выполнить полный выбранный профиль после подготовки. Ошибка или пустой набор local-demo тестов не считается PASS.

| Профиль | Команды | Назначение |
|---|---|---|
| FAST | `npm --prefix web run build`; `(cd web && npx --no-install playwright test --config playwright.harness.config.ts)` | TypeScript, production dist и весь `local-demo` suite; suite должен содержать тесты |
| FULL | pytest с coverage; Ruff core; advisory Ruff extended/format и Pyright; web build; semantic contract; proxy и полный Playwright E2E; OpenSpec strict | Полный локальный набор действующего Verify; advisory-исходы печатаются отдельно и сами по себе не меняют blocking итог |

Команды FULL выполняются в следующем порядке:

```bash
python -m pytest -q --cov=napms --cov-report=term-missing
python -m ruff check --select E4,E7,E9,F src tests
python -m ruff check src tests
python -m ruff format --check src tests
python -m pyright
npm --prefix web run build
npm --prefix web run test:semantic
npm --prefix web run test:e2e
openspec validate --all --strict
```

Классификация пограничных примеров:

| Накопленный diff | Профиль | Причина |
|---|---|---|
| Только два существующих PolicyRule UI-файла | FAST | Разрешённая узкая область |
| Backend-файл остался staged, его worktree восстановлен к базе, а PolicyRule изменён в worktree | FULL | Объединяются base→index и index→worktree; один слой не скрывает другой |
| PolicyRule UI вместе с `src/napms/*` или `web/src/api.ts` | FULL | Backend и API — общие границы |
| Любой неизвестный путь | FULL | Классификатор не предполагает независимость |
| Untracked файл вне двух UI-файлов | FULL | Новый путь расширяет область изменений |
| Rename или delete | FULL | Требуется проверить обе стороны изменения и зависимости |
| Пустой diff или нет merge-base с `origin/main` | FULL | Контрольная база недостаточна для локального PASS |
| Не установлены зависимости или Playwright не находит тесты | Остановка | Ненулевой статус и явная инструкция; профиль остаётся обязательным |

FAST автоматически доступен только после появления обоих целевых файлов в базисе. Пока этого нет, даже UI-пути выбирают FULL. Локальный результат не заменяет полный GitHub `Verify` на PR HEAD и merge-кандидате.
