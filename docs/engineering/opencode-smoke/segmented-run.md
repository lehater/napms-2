# PR #70 — A2 manual segmented E2E (owner-approved diagnostic)

**Статус:** два новых независимых запуска на `95a788e` — **COMPLETE/PASS**, с полным handoff перед каждым Reviewer и явным разделением observed/reported evidence. [Новые evidence №1/№2](../opencode-a2-rerun-evidence-2026-11-14.md). Предыдущий запуск на `92ffa74` остаётся **BLOCKED**, его второй — **NOT RUN** ([исторические evidence и причина](../opencode-a2-evidence-2026-11-14.md)). PR остаётся Draft до owner acceptance. Разрешён ручной эксперимент после [архитектурного решения по PR #70](https://github.com/lehater/napms-2/pull/70#issuecomment-6873654170). Это **один логический run** через отдельные процессы/сессии, а **не** один OpenCode root session. Durable Controller, auto-dispatch, credential forwarding или API proxy не реализуются.

## Контракт и границы

- Логический `task_id = PR70-SEGMENT`, исходный HEAD PR #70 записать до запуска. Один допустимый файл: `role-smoke.txt` в disposable worktree.
- Expected exact bytes (UTF-8): `# Role smoke\n\nBounded Worker write.\n`. Последний LF обязателен.
- **Host / control plane:** Sol через существующую пользовательскую авторизацию ChatGPT, только read-only Orchestrator + Explorer/Planner и отдельно Reviewer. Host session имеет собственные auth/network settings; содержимое host auth store не копируется, не монтируется и не передаётся в Worker.
- **bwrap / execution plane:** отдельный credential-free OpenCode process c `ollama/qwen3-coder:30b`, только Worker; worktree read-only кроме `role-smoke.txt`; host `HOME`, `/tmp`, Git metadata скрыты. Это проверенная локальная **граница записи**, не универсальная network/privacy sandbox; локальная сеть оставлена для Ollama.
- **Validator:** отдельный детерминированный Python test в read-only bwrap, без LLM и credentials. Fail (nonzero) блокирует дальнейший ход; сообщения агентов не подменяют exit code.
- **Handoff:** оператор/Codex CLI фиксирует результаты и допускает следующую стадию. Ни LLM, ни демонстрационный скрипт сами не выбирают следующую стадию. При провале остановить без исправлений артефакта «ради PASS».

## Исполнение (отдельный worktree ветки PR #70)

Проверить `git status --short`, branch `feat/opencode-role-catalog-stage1`, записать HEAD и версию OpenCode. Использовать **только** файлы из этой ветки. Все шаги выполняются последовательно.

**1. Sol host read-only: Explorer → Planner.** Перед запуском убедиться, что `opencode auth list` сообщает установленную авторизацию; НЕ печатать содержимое credentials. Пример вызова:

```bash
NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost \
  opencode --standalone run --agent orchestrator \
  --model openai/gpt-6.1-sol --format json \
  'PR70-SEGMENT, READ ONLY. Immutable contract: {"task_id":"PR70-SEGMENT","allowed_paths":["role-smoke.txt"],"expected_lines":["# Role smoke","","Bounded Worker write."],"expected_final_newline":true}. Call subagent explore to read AGENTS.md and load openspec-explore. Wait for completion. Then call planner with actual Explorer observations and unchanged immutable contract to return a bounded plan. No Worker, shell, edit, publish or merge. Stop after Planner and report observed child session IDs.'
```

Продолжать только если actual tool/session events подтверждают `explore → planner`, оба завершены и нет write/shell, actual model Sol. Записать root/child IDs в **частный** evidence-файл вне репозитория. Не публиковать сырые логи с auth metadata.

**2. Qwen credential-free Worker (отдельный bwrap).** Владелец уже разрешил этот bounded smoke; fixture временно добавляет `edit role-smoke.txt allow` и монтирует writable только файл. Постоянные разрешения Worker **не меняются**.

```bash
python3 docs/engineering/opencode-smoke/run.py segment-worker
```

Это не full-run acceptance: CLI exit 0 **недостаточен**. Проверить `stream.jsonl` / OpenCode session DB: actual model Qwen, real `edit`, изменён только `role-smoke.txt`, нет других прав. Если CLI или permission/OS check не прошёл — остановиться.

**3. Deterministic byte Validator (новый read-only bwrap process).**

```bash
python3 docs/engineering/opencode-smoke/run.py segment-validate
```

Команда запускает тот же `/tmp/fixture/check_smoke.py`, проверяющий точные байты и четыре отрицательных сценария (вторая строка, лишние данные, нет final LF, CRLF). Результат должен быть exit 0, `Ran 5 tests`, `OK`. При exit 1 не добавлять LF внешней командой и не исправлять `role-smoke.txt` вручную.

**4. Независимый Reviewer (host read-only, новая Sol session).**

Перед вызовом оператор готовит проверяемый handoff: исходный и текущий SHA, фактический diff/список изменённых путей, session/model IDs и завершённый `edit` Worker, OS mounts (checkout read-only, writable только допустимый файл), команду/exit/результат Validator и checksum/точные байты. Эти факты передаются Reviewer явно как **reported evidence**. Не выдавать план или заявление Worker за проверку. Отсутствующий либо противоречивый факт означает NOT VERIFIED/BLOCKED. В примере ниже `OPERATOR_EVIDENCE` необходимо заменить фактическими наблюдениями этого запуска; с placeholder запускать нельзя.

```bash
NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost \
  opencode --standalone run --agent reviewer \
  --model openai/gpt-6.1-sol --format json \
  'PR70-SEGMENT independent REVIEW, read-only. Immutable contract: {"task_id":"PR70-SEGMENT","allowed_paths":["role-smoke.txt"],"expected_lines":["# Role smoke","","Bounded Worker write."],"expected_final_newline":true}. Read role-smoke.txt yourself and compare visible lines independently. Coordinator REPORTED evidence: OPERATOR_EVIDENCE. A supplied successful deterministic byte Validator is the source of truth for exact bytes/final LF; label that evidence reported, not independently executed or byte-read by you. Assess baseline/path/write-boundary evidence too. If any required evidence is absent, contradictory, or failed, return NOT VERIFIED/BLOCKED. Identify P0–P3 findings and return an explicit complete or incomplete review verdict. Do not use edit, shell, execute or call another agent. No auto-approval or merge.'
```

Сохранить actual read/tool events, actual model, независимый вердикт. Результат Validator передаётся Reviewer как внешнее **reported evidence**, не как самостоятельно выполненный им тест. Валидатор exit 0 остаётся источником истинности точного LF; reviewer не должен заявлять, что прочёл байты без соответствующего инструмента.

Это уточнение handoff действует для будущего отдельно разрешённого запуска. Оно не меняет вердикт уже выполненного Reviewer и не разрешает повторять review ради PASS. Incomplete/NOT VERIFIED останавливает текущий run; второй E2E после него не выполняется.

## Итоговая проверка одного логического запуска

Доказательства по каждому шагу: `task_id`, PR HEAD, physical session IDs, actual models, разрешённые пути, OS mount boundary, actual commands and exit codes, checksum/точные байты, независимый Reviewer verdict, all errors. Сравнить **не связанные** root IDs и явные handoff events; не использовать offline `verify_route()` из A1, требующий пять children в одной root session. Успех первого A2 означает только **один ручной segmented E2E PASS**; после него провести второй независимый запуск с тем же неизменным контрактом, если первый был устойчивым. Любая неожиданная запись, секреты в Worker, tool bypass, неверный байтовый результат или ненадёжный handoff — **BLOCKED**.

**После двух доказанных A2 успехов:** отдельная короткая архитектурная оценка необходимости ephemeral sequencer; не внедрять автоматически. PR #70 остаётся Draft до owner acceptance и требуемого Verify на актуальном HEAD.
