# План внедрения целевой локальной мультиагентной схемы

**Статус:** proposed implementation plan, *реализация ещё не разрешена*.
**Основа:** [полная архитектура](target-architecture.md), [ADR-001](research-and-decision.md) и [ADR-002 — контроллер непрерывного выполнения](execution-engine.md).
**Принцип:** вся архитектура и вариант выбора описаны сейчас; внедрение — атомарными проверяемыми изменениями без нарушения действующего Codex/продуктовых веток.

## 1. Результаты, которые нужно получить

1. Один локальный Orchestrator, способный инициировать ограниченные задачи Explorer/Architect/Planner/Worker/Reviewer.
2. Роли с отдельными входами/выходами, политиками моделей/инструментов и независимым контекстом; планы и решения фиксируются в существующем Git/OpenSpec.
3. Детерминированная проверка, независимый read-only Reviewer, owner gates и воспроизводимый Draft PR.
4. Использование нескольких реальных провайдеров при их доступности, fallback на Codex без потери проекта; модель не закреплена за ролью навсегда.
5. **Режим A:** непрерывный переход между разрешёнными задачами в одной активной сессии. **Режим B (условный):** если нужен безопасный unattended restart — принятый DAG, checkpoint, owner gates, budget и reconcile без повторных side effects.
6. Инструкция эксплуатации в WSL, safe handling credentials, troubleshooting и rollback. Никаких новых обязательных подписок.

## 2. Work packages (полный план)

| ID | Область | Работа | Критерий приёмки |
| --- | --- | --- | --- |
| A0 | Architecture | Рассмотреть ADR-001 и ADR-002, выбор рантайма и режимов A/B | Владелец согласовал исходные constraints и нужный уровень непрерывности; финальный runtime после A1–A2 |
| A1 | Environment | На WSL записать версии Codex/OpenCode/Ollama, доступность моделей/провайдеров; без публикации credential data | Протокол `available/unavailable`, IDs, возможности tools, без секретов |
| A2 | Capability smoke | В **disposable worktree** проверить V2 синтаксис, `AGENTS.md`, `.agents/skills`, привязку модели к роли и право edit/shell/external_directory | Все критические запреты работают; нет влияния на продуктивные файлы |
| A3 | Local Orchestrator (A) / Controller (B) | Сначала проверить **одну OpenCode-сессию** с последовательным выполнением и реальными gates. Если нужен unattended restart и возможности runtime недостаточны — отдельным решением реализовать минимальный **не-LLM Controller** (DAG, checkpoint, lock, budget, resume/reconcile) | A: один целевой run без новых промптов, safe stop и handoff; B: E1/E3/E6/E8/E11 из ADR-002 |
| A4 | Roles | Реализовать локальные `orchestrator`/`architect`/`planner`/`reviewer` и использовать встроенных `explore`/`general` как фактические Explorer/Worker, если покрывают contract | Роли читают нужное и не имеют лишних tool rights; нет дубликатов |
| A5 | Model policy | Настроить named profiles `quality`/`balanced`/`budget`; реальное распределение провайдер/модель/effort из доступного каталога | Переключается без редактирования принятой архитектуры; фактический model ID отмечен |
| A6 | Source and Skills | Убедиться в корректной загрузке `AGENTS.md`, `openspec`, UI contract; общие ограничения в одном источнике | OpenSpec spec-first соблюдается, нет дублирования разнонаправленных инструкций |
| A7 | Quality and review | Подключить существующий `check-fast.py`, OpenSpec strict, pytest, Playwright, Ruff; независимый Reviewer; согласовать реальную ручную политику Verify | Вывод различает not-run/reported/verified; неверный SHA не считается passed |
| A8 | Real workflow pilot | На отдельной тестовой задаче (не PR #66/#67) пройти issue → facts → ADR/plan → bounded code → tests → independent review → Draft PR | Контракт роли, доказательства, отсутствие секретов, smoke и ручная приёмка |
| A9 | Evaluation and decision | Сопоставить с известным Codex baseline: ошибки, переделки, elapsed time, токены если доступны, риск | Осмысленное `adopt` / `keep Codex` решение, не синтетический балл |
| A10 | Operationalize | Нормативный runbook, модели и разрешения, диагностика, rollback; если принято — один основной локальный путь | Владелец самостоятельно запускает типовую работу из WSL |

### Минимальный набор проектных конфигураций для кандидата OpenCode V2

После проверки установленной версии и только в последующем implementation PR:
- `opencode.jsonc` либо принятая V2 schema в проверяемой версии: модели, permissions, default primary-agent, явные запреты на `git push` и секреты; external-directory policy.
- `.opencode/agents/orchestrator.md`, `architect.md`, `planner.md`, `reviewer.md` — точные пути/схему подтвердить локальным CLI. Предпочитать встроенные Explore/General, не плодить копии ради названий.
- `.opencode/commands/` для явных операций `/design`, `/apply`, `/review` только если ручной интерфейс оправдался; **не писать LLM orchestration daemon**. Для режима A достаточно локальной сессии и сохранённых Git/OpenSpec артефактов. Для B, только при подтверждённом требовании restart, нужен ограниченный детерминированный Controller с проверенным CLI/SDK adapter (ADR-002).
- Версионированный принятый план в Git. Для режима B дополнительно локальный журнал статусов *вне* репозитория + single-writer lock; первоначально JSON atomic write, без распределённой очереди или отдельного сервера.
- `AGENTS.md` — общий жизненный цикл и решение-вход/выход; project Skills `.agents/skills` переиспользовать.
- `docs/engineering/` — единственный runbook и точная актуальная политика CI.

**Важно:** это целевая конфигурация, а не готовый совместимый конфиг. У OpenCode V1 и V2 разные ключи; не копировать старые JSON-примеры без проверки `opencode --version` и встроенной справки.

### Сохранённый Codex fallback

Текущие `.codex/config.toml`, `.codex/agents/reviewer.toml`, `AGENTS.md` не изменять при capability smoke. При отказе OpenCode реализовать эквивалентные Architect/Planner роли в Codex, с явной оговоркой наследования provider/sandbox и без автоматического multiprovider. Зависимость от нового провайдера не должна блокировать работу в Codex.

## 3. Порядок и границы PR

1. **Этот Draft PR (research/design only):** сравнение, ADR, полная целевая архитектура, план и неизвестные. Никакой runtime-конфигурации и тестов продукта.
2. **Implementation PR A (capability + protected config):** только после принятия ADR; экспериментальная настройка OpenCode в отдельном worktree, минимальный локальный smoke с evidence. Если не проходит — отказ без миграции.
3. **Implementation PR B (workflow):** роли, маршрутизация, рутина планирования/реализации/review и runbook; отдельные файловые границы. Адаптировать принятый Harness без переписывания OpenSpec.
4. **Integration acceptance:** одна полноценная контрольная задача для режима A, сравнение с Codex, проверка owner gate/permissions; если требуется B — дополнительно restart/дубликаты PR/budget по E1–E12 ADR-002; финальное решение о переходе, ручной Verify и final SHA. Legacy Codex не ломать и не удалять автоматически.

Это *границы изменения и зависимости*, а не требование многодневных стадий или набора новых агентов для каждой мелочи. Если работа мала и проверки надёжны, A/B могут быть объединены в один implementation PR с сохранением контрольной точки.

## 4. Сценарий внедрения «одним заходом»

1. Владелец принимает границы, разрешённые операции и необходимость режима A или B. ADR-001 фиксирует OpenCode как кандидата, не как заранее принятый runtime; до окончательного выбора потребуется capability smoke.
2. Исполнитель подготавливает OpenCode в disposable worktree; первый smoke подтверждает модель, роли и действительные запреты без изменений продукта. **Controller не создаётся, пока не подтверждён режим B**.
3. Локальный Orchestrator получает **целый** принятый план A0–A10 и последовательно запускает разрешённые bounded tasks. В режиме B эту функцию выполняет Controller по DAG. Planner может уточнять шаги без расширения scope или permissions.
4. После каждого package фиксируются Git/OpenSpec/evidence и краткий handoff. В режиме B Controller дополнительно сохраняет checkpoint и при `resume` сверяет Git/PR/evidence перед любым повтором. В режиме A после аварии требуется явная сверка, без обещания unattended exactly-once.
5. Orchestrator/Controller останавливается на owner gates, P0, неразрешённом P1, hard budget и неисправимом сбое; никакой агент не создаёт фиктивный approval. Действие владельца должно быть проверено по identity и конкретному plan/gate.
6. Завершение возможно, когда A0–A10 доказательно DONE и принятый final package соответствует необходимым проверкам; автоматический merge запрещён.

**Условные команды для контроллера режима B** (дизайн CLI, **не существующий сейчас инструмент**): `napms-agent plan validate <file>`, `napms-agent run <file>`, `napms-agent resume <run-id>`, `napms-agent status <run-id>`. Имя и синтаксис будут утверждены при реализации, после проверки возможностей OpenCode CLI/SDK; не создавать команды ради документации.

**Существующий подтверждённый интерфейс OpenCode:** `opencode run`, `opencode run --continue`, `opencode run --session <id>`, `opencode run --format json`; он поддерживает сессии, но не гарантирует контроль зависимостей/безопасного restart. См. [CLI](https://opencode.ai/docs/cli/commands).

### Детальный порядок bootstrap и последующей автоматизации

- **A0**: архитектурное согласование двух ADR — owner gate.
- **A1 → A2**: версии, auth capabilities, права и skills; если среда не поддерживается, fallback Codex и повторная приёмка.
- **A3**: сначала проверить session-run (A); если нужен restart без оператора — отдельное согласование B, минимальный Controller с E1/E3/E6/E8/E11 до разрешения unattended A4–A10.
- **A4 → A7**: роли, профили моделей, Skills, проверки; зависимость последовательная для общего конфигурационного слоя.
- **A8**: одна bounded E2E задача и проверки E2/E4/E5/E7/E9/E10/E12.
- **A9 → A10**: сопоставление фактов, owner decision и runbook/rollback.

## 5. Локальные проверки для владельца / будущего исполнителя

Команды ниже только читают состояние либо проверяют доступ; **в этой исследовательской ветке не выполнялись**:

```bash
git fetch origin main
git status --short
git log -1 --oneline origin/main
codex --version
codex debug models --bundled
opencode --version
opencode run --help
ollama list
openspec --version
python3 scripts/check-fast.py --dry-run
```

Проверка providers в OpenCode: открыть `opencode`, затем `/connect` и `/models` в приватной локальной сессии. Не экспортировать credentials, логин-токены, JSON профиля или whole-model context в GitHub. Не считать Copilot entitlement доказанным на основании GitHub Pro.

### Smoke 1 — read-only

- В тестовом worktree Orchestrator поручает Explorer узнать точные файлы/вызовы PolicyRule, а Reviewer анализировать небольшой historical diff без записи.
- Запретить `edit`, опасный `shell` и внешнюю запись. Проверить реальным инструментальным отказом, а не только итоговым self-report.
- Убедиться, что обе роли видят `AGENTS.md`, адресованное OpenSpec Skill и правильный model ID; `git status` остаётся пустым.

### Smoke 2 — write + acceptance

- В disposable ветке на безопасной автономной маленькой задаче Planner формирует AC, Worker вносит минимальный diff и targeted test; Reviewer независимо возвращает findings, Orchestrator готовит Draft PR.
- Проверить sha, scope, отрицательные тесты и policy/gate; хозяин выполняет smoke и принимает/отклоняет.
- Для продуктовых задач фиксировать защищённую `main`, `gh pr view` и актуальность CI; не выдавать `workflow_dispatch` за автоматический Required Verify.

### Smoke 3 — fallback

- На одном bounded Explorer вопросе запустить разные *реально доступные* model tiers; записать явный `actual model`.
- Принудительно переключить tier **между** task units после ручного остановленного шага. Проверить, что контракт, версии/границы и результаты не потеряны.
- Автоматический quota-based router — опция только если найден достоверный API квот и предсказуемое управление отказами.

## 6. Матрица приёмки и контроль качества

- **P0:** нет утечки токенов, несанкционированной записи вне worktree, изменённого `main` и автоматического merge. При провале — немедленный rollback.
- **P1:** роли соблюдают полномочия; правильно передают артефакты; модели выбираются по задачам; ACL/Policy invariants не теряются; независимый review без фиктивных PASS.
- **P1:** принимает существующие OpenSpec и test gates; manual Verify на final candidate организован явно, без устаревшего описания.
- **P2:** рабочее переключение budget-tier; минимальный дополнительный расход/латентность; разумный лимит параллелизма.
- **P3:** удобные CLI-команды, наблюдаемость, визуальное представление процесса.

Таблица в отчёте каждого smoke: `environment version | task/role | requested model | actual model (or unknown) | permissions test | changed files | checks and exit codes | base/head | outcomes | limitations`.

## 7. Решение по итогам пилота

**Adopt OpenCode**, если требуемые доступные провайдеры и роли подтверждены, OpenSpec и tests не деградировали, права действительно контролируются, а выигрыш в автономности/маршрутизации перевешивает поддержку новой среды.

**Keep Codex**, если доступ к моделям/permissions/Skills нестабилен, миграция требует платных интеграций, или качество ограниченных задач не улучшается. Тогда обновить только проектные роли/политику Codex и оставить multiprovider как отложенную способность.

Никаких заявлений о снижении стоимости или повышении качества до измерений.

## 8. Вопросы владельцу перед внедрением

1. Принять или скорректировать ADR-001 (OpenCode как кандидат) и ADR-002 (A = active session, B = durable Controller только при подтверждённой необходимости).
2. Подтвердить, что проектирование можно считать достаточным для *отдельного* implementation PR после локальной проверки среды.
3. При выборе внешних free models отдельно принять границу допустимой отправки исходного кода внешним провайдерам.

**Непосредственное следующее действие:** принять архитектурные границы и разрешённые действия, затем выполнить capability smoke OpenCode в disposable worktree **без нового Controller**. После smoke сравнить с Codex и начать один разрешённый session-run A4–A10. Если нужен unattended restart — отдельно внедрить Controller B по acceptance E1–E12.