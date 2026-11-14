# OpenCode V2 — Stage 1 role catalog (candidate)

**Статус:** candidate implementation, **не принят**. Описывает минимальный reusable режим A; [архитектура PR #68](https://github.com/lehater/napms-2/pull/68), [принятый изолированный pilot #69](https://github.com/lehater/napms-2/pull/69).

## Назначение и границы

Вход: принятая ограниченная задача NAPMS с base SHA, scope, allowed paths и acceptance. Выход: только проверенные факты, план, разрешённое изменение, реальные tool/test results, независимое P0–P3 review. Постоянные роли задаёт корневой `opencode.jsonc` в формате V2. В отличие от `pilot/opencode.jsonc` они не привязаны к `pilot/output.md`.

- Orchestrator — primary, управляет одним scoped work item; не редактирует и не запускает shell.
- Explorer (`explore`) — встроенный read-only subagent, переопределён только в части scope/permissions.
- Architect и Planner — read-only subagents с отдельными контекстами и решениями.
- Worker — subagent с `edit: ask` для любого файла; shell и execute запрещены. Это **approval**, а не автоматическая файловая изоляция.
- Validator — временный ограниченный LLM tool-runner, который запускает детерминированные команды; не принимает собственных решений о PASS. Общий target ADR предусматривает в дальнейшем non-LLM Validator; **этот промежуточный адаптер требует отдельной оценки**.
- Reviewer — read-only subagent с `edit`, `shell`, `execute` и nested-subagent deny.

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
