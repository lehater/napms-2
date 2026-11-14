# OpenCode WSL capability evidence — 2026-11-14

**Статус:** проверка частично завершена по отчёту отдельного локального чата. **Источник:** сообщение владельца о выполненных диагностических командах в WSL; координатор GitHub не получал необработанные логи и не запускал команды на пользовательской машине. Факт прохождения здесь означает «reported pass», а не independently verified pass.

## Среда

| Компонент | Наблюдение из отчёта |
| --- | --- |
| OpenCode | v2.2.0, npm `@opencode/cli`, Node через nvm; сохраняется без обновления |
| Node.js / npm | v24.22.0 / 11.19.1 |
| Ollama | 0.40.5; доступна в обычной пользовательской WSL |
| OpenSpec | 1.16.0 |
| Python | 3.12.3 |
| Репозиторий | `git status --short` пустой; NAPMS не изменялся |

## Реальные результаты

| ID | Проверка | Статус | Evidence / ограничение |
| --- | --- | --- | --- |
| C1 | OpenCode CLI `--version`, `--help`, `debug config` | **REPORTED PASS** | Интерактивный CLI базово работоспособен |
| C2 | `opencode --standalone --print-logs debug agents` | **REPORTED PASS** | Ранее возникшая `UnsupportedContentType` повторно не воспроизвелась; причина неизвестна |
| C3 | Ollama discovery | **REPORTED PASS** | В обычной WSL `ollama list`; OpenCode обнаруживает локальные модели |
| C4 | `qwen3-coder:30b` через встроенный `--agent plan` | **REPORTED PASS** | Read-only чтение заголовка `AGENTS.md`, перечисление шести skills и загрузка `openspec-explore` |
| C5 | `gpt-oss:20b` | **DISCOVERED / NOT TESTED** | Генерация не выполнялась |
| C6 | 12 `opencode/*-free` | **DISCOVERED / NOT TESTED** | Наличие в каталоге не означает успешный prompt, реальную стоимость 0 или подходящую политику данных |
| C7 | ChatGPT/OpenAI account | **NOT READY** | `auth list` → `No authenticated integrations`; sign-in истёк, повторный device flow отменён |
| C8 | Project skill loading | **REPORTED PASS** | `AGENTS.md` и `.agents/skills` прочитаны; OpenSpec skill загружен |
| C9 | Reviewer/Worker permissions enforcement | **NOT TESTED** | Не тестировались попытки обхода `edit` через shell, записи вне рабочей директории, push/merge |
| C10 | Полный сквозной Task run → diff → tests → independent review | **NOT TESTED** | Есть только read-only smoke, без настройки кастомных ролей |

## Вывод для ADR-001

- Требование **«хотя бы один реально работающий provider/model + чтение инструкций/skills»** достигнуто **по отчёту**.
- Ollama подходит для экономичного scoped Explorer/Planner-smoke; качество в роли Architect/Orchestrator или сложного Worker **не установлено**.
- OpenCode пока не выбран как основной рантайм: для сравнения с Codex нужны авторизация сильной модели, реальная role isolation и один bounded task run.
- Никаких прав на платный API или GitHub Copilot исходя из имеющихся подписок не предполагать.

## Следующий локальный gate (A1/A2, без новых проектных агентов)

1. Завершить официальный ChatGPT/OpenAI `/connect` или соответствующий интерактивный `auth login` в пользовательском терминале. Не выдавать device code, refresh token или auth-store в отчёт. При истечении flow начать новый; не пытаться исправлять копированием секретов.
2. После `opencode auth list` и просмотра `/models` проверить конкретную подключённую model ID одним ограниченным запросом. Записать фактическую доступность, не придумывать тариф/лимиты.
3. В disposable worktree с **внешней изоляцией** выполнить негативные тесты permission: для read-only агента `edit` и shell-write должны быть запрещены; для Worker — граница записи и запрет публикации. Не выполнять опасные команды на реальном дереве проекта.
4. Один scoped read-only orchestration flow с двумя разными ролями/контекстами; после этого — отдельный безопасный write-and-review smoke. Нет оснований менять `main` или продуктовые PR.
5. При отсутствии доступного ChatGPT-провайдера **не блокировать** испытания локальных ролей и permissions. Просто пометить сильную облачную модель как unavailable и оставить Codex baseline.

## Классификация готовности

- **A1 environment:** **PARTIAL PASS** — локальный OpenCode/Ollama установлены, OpenAI auth отсутствует.
- **A2 capability smoke:** **PARTIAL PASS** — чтение/skills подтверждены, роль-based sandbox и запись ещё не проверены.
- **A3 orchestration mode A:** **NOT STARTED** — отсутствие read-only/write + review маршрута.

До следующего gate ни ADR-001, ни ADR-002 не переводить в `Accepted`. GitHub PR #68 — проектирование и evidence, не установка агента.
