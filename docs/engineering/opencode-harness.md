# OpenCode V2 — Stage 1 role catalog (candidate)

**Статус:** candidate implementation; owner acceptance ещё требуется. Описывает минимальный reusable режим A; [архитектура PR #68](https://github.com/lehater/napms-2/pull/68), [принятый изолированный pilot #69](https://github.com/lehater/napms-2/pull/69).

## Назначение и границы

Вход: принятая ограниченная задача NAPMS с base SHA, scope, allowed paths и acceptance. Выход: только проверенные факты, план, разрешённое изменение, реальные tool/test results, независимое P0–P3 review. Постоянные роли задаёт корневой `opencode.jsonc` в формате V2. В отличие от `pilot/opencode.jsonc` они не привязаны к `pilot/output.md`.

- Orchestrator — primary, управляет одним scoped work item; не редактирует и не запускает shell.
- Explorer (`explore`) — встроенный read-only subagent, переопределён только в части scope/permissions.
- Architect и Planner — read-only subagents с отдельными контекстами и решениями.
- Worker — subagent с `edit: ask` для любого файла; shell и execute запрещены. Это **approval**, а не автоматическая файловая изоляция.
- Validator — временный ограниченный LLM tool-runner, который запускает детерминированные команды; не принимает собственных решений о PASS. Общий target ADR предусматривает в дальнейшем non-LLM Validator; **этот промежуточный адаптер требует отдельной оценки**.
- Reviewer — read-only subagent с `edit`, `shell`, `execute` и nested-subagent deny.

Локальный provider объявлен явно: `http://127.0.0.1:11434/v1`, без auth store. Чистый HOME не должен зависеть от пользовательского provider config.

**Политика моделей:** стартовый `orchestrator` выбирает уже проверенную локальную `ollama/qwen3-coder:30b`; остальные роли не задают модель и наследуют модель текущей root-сессии (согласно OpenCode V2). Для ограниченного облачного теста оператор явно указывает `--model openai/gpt-6.1-sol` и проверяет фактический model ID. Сравнение затрат, качества и Effort ещё не проведено. 503 ранее возникал, затем отдельный вызов вернул `OK`.

## Проверка конфигурации (read-only, WSL)

Команды выполнять в **отдельном worktree** на ветке реализации. Они не должны менять основной checkout или `main`.

```bash
cd /path/to/napms-opencode-role-worktree
opencode --version
python3 -m json.tool opencode.jsonc >/dev/null
opencode --standalone debug agents
opencode --standalone run --agent orchestrator --model ollama/qwen3-coder:30b \
  'Read AGENTS.md and delegate to explore and planner only. Return actual sources and a read-only bounded plan. Do not modify files or use shell.'
git status --short
```

Успех: правильные agent IDs и modes, читается `AGENTS.md` и Skill, Orchestrator реально делегирует нужным агентам, ни один файл не меняется. Если `debug agents` возвращает `UnsupportedContentType`, повторить с `--print-logs`; записать фактический workaround.

## Bounded write + test + review: **пока отдельный gate**

1. Возьми маленькую согласованную задачу, в отдельном disposable worktree и с **OS/bwrap sandbox**, где на запись доступны только утверждённые файлы; держи токены и другие секреты вне sandbox. Обычный Git worktree не изолирует файловую систему.
2. Worker должен получить exact allowed_paths и acceptance. `edit: ask` требует интерактивного разрешения; не запускать OpenCode с `--auto`. Если нужен unattended проход, требуется отдельно проверенная временная config/runner с whitelist и OS enforcement.
3. Validator выполняет только заранее разрешённые команды; `git diff --check`, `python3 scripts/check-fast.py --dry-run` и OpenSpec strict прописаны как allowlist. Для `python3 scripts/check-fast.py` требуется явное approval и отдельная ограниченная среда, потому что тесты могут исполнять код. Сохранять exit codes, SHA, scope; не приписывать GitHub CI статус локальным проверкам.
4. Reviewer читает сам diff/criteria и реально пробует запросить недоступные `edit` и `shell`; при их доступности результат FAIL. Проверка в pilot #69 не заменяет smoke текущей конфигурации.
5. На актуальном commit SHA запусти необходимый `Verify` (сейчас `workflow_dispatch`) и проверь FULL, прежде чем делать PR Ready; при каждом изменении HEAD прежний CI не засчитывается.

## Ограничения и откат

- Это первая стадия role catalog, **не готовый защищённый unattended workflow**. Нельзя предполагать запрет на чтение секретов через grep/shell при запуске без изоляции; внешние credentials требуют отдельной политики.
- `model` для Orchestrator локальный по умолчанию. Переход на OpenAI подписку/внешние бесплатные модели выполняется явно и с проверкой privacy. Никаких новых оплачиваемых API.
- Текущие `.codex/`, `AGENTS.md`, `.agents/skills/`, OpenSpec, проектный код и CI не меняются.
- Для отката не выбирать OpenCode как primary; Codex CLI остаётся рабочим. `pilot/` не используется в обычной работе.
- Не выполнять merge или push из роли Worker; публикацию feature-ветки после review выполняет уполномоченный Git-инструмент с явным согласием.

**Достаточный результат данного PR:** статически валидный конфиг, рабочий read-only маршрут в WSL, корректные model IDs и permission denials. Bounded write/test/review можно включать лишь после отдельного OS-sandbox smoke, owner review и исправления выявленных проблем.


## Воспроизводимый PR #70 smoke (Linux/WSL)

Fixture в `docs/engineering/opencode-smoke/` — opt-in проверка данного PR, не production runner и не Controller. Нужны установленные `bwrap`, OpenCode v2.2.0, `rg`, Python 3 и локальная Ollama с `qwen3-coder:30b`. Запускать из disposable worktree ветки PR #70; fixture создаёт только `role-smoke.txt` в checkout и private temporary runtime directories. Не добавлять `--auto`.

```sh
python3 -m unittest discover -s tests -p test_opencode_role_catalog.py
python3 docs/engineering/opencode-smoke/run.py probe
python3 docs/engineering/opencode-smoke/run.py agents
python3 docs/engineering/opencode-smoke/run.py route
python3 docs/engineering/opencode-smoke/run.py worker
python3 docs/engineering/opencode-smoke/run.py reviewer
```

Каждый вызов печатает private evidence directory. Проверить `stream.jsonl` и SQLite `data/opencode/opencode.db`, таблицы `session_v2` и `session_message`. `session_v2.parent_id` связывает свежие дочерние контексты с одним root; `model` фиксирует фактическую модель. Для каждого assistant message JSON `content` содержит tool events: `state.status`, `state.error`, `state.metadata.exit`. CLI exit 0 и текстовый PASS агента сами по себе недостаточны.

`route` использует копию постоянной конфигурации с ровно двумя дополнительными permissions: Worker `edit role-smoke.txt allow` и Validator `shell python3 /tmp/fixture/check_smoke.py allow`. Только `role-smoke.txt` примонтирован writable; весь остальной checkout read-only. Три unittest проверяют реальный артефакт, неправильный разделитель и лишнее содержимое. `worker` и `reviewer` используют постоянные permissions; отказ Worker должен быть `permission.rejected`, три Reviewer tools — недоступны. `agents` загружает постоянную конфигурацию через настоящий CLI. После `route` fixture автоматически проверяет сохранённые session/tool events: порядок и отсутствие пересечения стадий, реальные результаты checks и denials. Offline повтор: `python3 docs/engineering/opencode-smoke/run.py verify /path/to/private-evidence`. Это локальный acceptance fixture, не новый CI gate.

Sandbox скрывает host `/home`, `/tmp` и Git metadata, очищает environment, не монтирует auth store, сохраняет отдельные scratch/state directories и разделяет PID/IPC/UTS/user namespaces. Host networking сохранён для Ollama; это не доказательство сетевой изоляции или универсального сокрытия всех секретов машины. `check-fast.py --dry-run` внутри sandbox ожидаемо видит Git как unavailable и выбирает FULL; он не запускает FULL. Настоящий Git SHA проверяет внешний координатор, настоящий FULL — локальный профиль и Verify на этом SHA.

Результаты и ограничения: [evidence](opencode-role-catalog-evidence-2026-11-14.md). Последние SHA, CI и итоговые runtime sessions фиксируются в PR #70 после финального commit; это позволяет не подменять проверенный HEAD последующим documentation commit.


## A2 — manual segmented diagnostic (owner-approved)

[Инструкция и контракт](opencode-smoke/segmented-run.md) описывают **один логический task run** через отдельные OpenCode sessions: Sol host read-only Explorer/Planner → Qwen Worker в credential-free bwrap → deterministic byte Validator в новом read-only bwrap → Sol read-only Reviewer. Секреты OpenAI не передаются Worker. В fixture добавлены opt-in режимы `segment-worker` и `segment-validate`, постоянный каталог ролей и permissions не изменены.

Это **альтернатива единому root-session E2E**, а не доказанный production flow. Руководитель этапов пока оператор; запуск первого теста требует установленного на пользовательской WSL OpenCode/Ollama/bwrap и актуального worktree PR #70. Никакой Controller B, proxy для credentials, авто-публикации или ослабления acceptance нет. До выполненного сегментированного E2E — `BLOCKED`.
