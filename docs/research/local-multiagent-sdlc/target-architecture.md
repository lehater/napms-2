# Целевая архитектура локального SDLC Harness

**Статус:** proposal, требуется архитектурная приёмка владельца; проектирование выполнено целиком, описанные роли ещё не развёрнуты.
**Связанный выбор:** [ADR-001](research-and-decision.md#4-adr-001--выбрать-целевой-рантайм).
**Приоритет:** контракт обязанностей → контекст → маршрутизация → средства и разрешения; модель/рантайм — сменяемая реализация.

## 1. Система, а не «команда говорящих моделей»

### Вход, выход, границы

- **Вход задачи:** ссылка Issue, база `main@SHA`, утверждённые требования/ограничения, ожидаемый пользовательский результат.
- **Выход:** изменённая ветка, OpenSpec/ADR при необходимости, проверяемые tests/evidence, независимый review, Draft PR и воспроизводимый ручной smoke. Итоговое принятие и merge — владелец.
- **Состояние:** GitHub Issues/PR, `main`, документы и код в Git; краткие сообщения агентов *не являются* истиной. Любая ссылка на старый SHA требует актуализации.
- **Границы:** работа с репозиторием локально; внешние сервисы не получают секреты/credentials из публичных файлов; изменения другой ветки/PR и `main` запрещены.
- **Однозначность ответственности:** один агент владеет записью в конкретный файл/модуль в данный момент; ревью не выполняется в той же ветке рассуждений, где создавался код.

### Уровни

1. **Human Product/Architecture Owner** — утверждает значимые развилки, новые зависимости/расходы, изменения политики безопасности, приёмку и merge.
2. **Orchestrator** — управляет конкретной задачей, выбирает маршрут/агентов/модели, собирает результаты, останавливает процесс при конфликте и готовит один handoff.
3. **Specialists** — выполняют ограниченные задания в отдельных контекстах; не изменяют основной контракт без запроса.
4. **Deterministic toolchain** — Git, OpenSpec, pytest, Ruff, TS, Playwright, проверки HTTP/permissions и выборочный/полный CI: решает воспроизводимые вопросы *без LLM*.
5. **GitHub contract** — Issues, review, diff, evidence, base/head SHA, разрешённые переходы Draft → Ready → Accepted → Merged.

## 2. Каталог ролей: назначение → ответственность → вход/выход

| Логическая роль | Ответственность | Вход | Проверяемый выход | Право менять код |
| --- | --- | --- | --- | --- |
| **Orchestrator** | Определить маршрут, бюджет, зависимости, владельцев файлов, переходы и отчёт; остановить при P0/P1/неясном праве | Issue + `main@SHA` + режим модели | Task contract, вызовы специалистов, единый handoff | Может инициировать Worker, не заменяет независимого Reviewer |
| **Explorer** | Собрать *факты* о реализации и контрактах | Точный вопрос + scoped paths | Файлы/символы/строки, связи, наблюдения и пробелы | Нет |
| **Architect** | Предложить границы, инварианты, риски, ADR и условия отказа | Требования + Explorer evidence | Один предпочтительный design, trade-offs, explicit owner decisions | Нет |
| **Planner** | Превратить принятый дизайн в минимальный исполнимый OpenSpec/task graph | ADR/acceptance + affected files | Plan/список задач, AC, риски, test map, порядок | Только документы в отведённом planning scope при разрешении |
| **Worker** | Реализовать точно заданный минимальный срез | Утверждённый task contract + допустимые файлы | Diff + focused tests + blockers и SHA | Да, только своё рабочее пространство |
| **Reviewer** | Найти реальные нарушения требований, security, инвариантов, тестов | Чистый diff против базы + AC + требуемые зависимости | P0–P3 findings с доказательствами либо explicit no finding | Нет |
| **Validator** *(не LLM)* | Проверить воспроизводимые утверждения и вернуть коды выхода | Область diff + версия команд | Команда, exit code, фактический output, suite scope | Не меняет продукт, кроме временных test artifacts |
| **Integrator** *(функция Orchestrator, не новый агент)* | Сверить SHA/базу, устранённые замечания, привести PR к handoff | Review/тесты/owner approval | Final PR summary, ограничения, сценарий проверки | Merge только по явной команде владельца |

**Не выделять по умолчанию отдельные роли** «researcher external», «tester LLM», «documentation agent», «scrum master», «debater» и «release manager». Их функции выполняют Explorer, Validator, Planner и Orchestrator. Добавлять роль, только если есть специфичный вход/выход, отдельные инструменты, границы и доказанная экономия/качество.

### Конфликты и полномочия

- Architect проектирует, но *не* разрешает запуск несогласованной миграции.
- Planner может предложить альтернативный порядок, но не подменяет требования.
- Worker не переписывает архитектуру или OpenSpec по факту удобства кода.
- Reviewer имеет право блокировать handoff обоснованным P0/P1; не имеет права менять код «за Worker».
- Orchestrator не закрывает замечания голосованием агентов: требуется исправление/повторная проверка/решение владельца.

## 3. Контракт любой субзадачи

Перед делегированием Orchestrator формирует небольшую структуру:

```yaml
task_id: "ISSUE-123:step-2"
role: worker
base_sha: "<verified main SHA>"
branch: "feat/issue-123"
goal: "one testable behavior"
inputs:
  - "accepted OpenSpec change reference"
  - "explorer evidence paths"
allowed_paths:
  - "src/napms/..."
  - "tests/..."
forbidden:
  - "main edits and merge"
  - "change permission model without approval"
acceptance:
  - "specific domain invariant and API result"
  - "focused tests"
budget: "standard; escalate if ambiguity"
output:
  - "changed files + diff SHA"
  - "commands and results"
  - "blockers, unresolved decisions"
```

Текстовая форма эквивалентна YAML; **не вводить новый парсер ради шаблона**. Для read-only ролей `allowed_paths` означает разрешённые файлы чтения, `write_paths` отсутствует. Не передавать полный чат/PR discussion, когда достаточно 2–3 релевантных артефактов.

## 4. Сквозной pipeline и переходы

```text
ISSUE / USER GOAL
  |
  v
ORCHESTRATOR: classify + snapshot main/base + route + budget
  |  simple bug ---------------------------+
  |                                       |
  +-- complex / unknown --> EXPLORER      |
                             |             |
                             v             |
                         ARCHITECT         |
                             |             |
                      owner decision?      |
                             |             |
                             v             |
                          PLANNER          |
                             |             |
                      OpenSpec/AC ready ---+
                                           |
                                           v
                                  WORKER (write owner)
                                           |
                                           v
                                  VALIDATOR focused
                                           |
                                           v
                                  REVIEWER read-only
                                   | P0/P1 => WORKER (bounded)
                                   | ambiguity => OWNER/ARCHITECT
                                   v
                             ORCHESTRATOR handoff
                                   |
                                   v
                             DRAFT PR + evidence
                                   |
                          owner UX/functional smoke
                                   |
                          final integration checks
                                   |
                          approval → squash merge
```

- **Fast path**: один Worker + deterministic checks + Reviewer только если изменение рискованное; для документной мелочи достаточно контрактов и ручной проверки.
- **Complex path**: Explorer и Architect перед Planner, особенно изменение domain model, authority, DB migration, network subject, API boundary и shared UX primitives.
- **Параллелизм**: только независимый сбор фактов или раздельные непересекающиеся file ownership области. Архитектура → план → реализация → проверка результата преимущественно последовательны.
- **Revision loop**: максимум два согласованных прохода Worker ↔ Reviewer по тем же AC; затем escalation владельцу/Architect с явным описанием разрыва. Это ограничение процесса, не обещание завершить любую задачу.
- **Stopping rules**: нет подтверждённой модели/доступа, неожиданное разрушение состояния, запрещённая запись, неверная база, отсутствие полномочия, P0, противоречие OpenSpec — остановить изменение, не «угадывать» и не замыкаться в автоцикле.

## 5. Раздельность контекста и артефактов

| Контекст | Содержимое | Не передавать |
| --- | --- | --- |
| Orchestrator | Issue, ограничение, ссылки на принятые ADR/OpenSpec, статусы и решения | Полную историю мелких инструментальных вызовов |
| Explorer | Вопрос, paths, исходные файлы | Разрешение переписывать требования |
| Architect | Цель, ограничения, подтверждённые факты Explorer | Несвязанный код, секреты, логи токенов |
| Planner | Принятый ADR, AC, взаимодействующие модули | Неутверждённые гипотезы как обязательные требования |
| Worker | Точная задача, contract, API, affected source/test files | Весь разговор внешнего координатора |
| Reviewer | Diff against base, спецификация и соседние контракты | Сообщение Worker «всё отлично», не подтверждённые прогоны |

**Source of truth**: только принятые PR/`main` + актуальный git diff и воспроизводимые evidence. Короткий handoff — индекс источников, а не вторая конкурирующая память. Не создавать отдельную векторную БД/граф памяти для этого без обнаруженной проблемы.

**Миграция между рантаймами:** роли и их контракты выражены Markdown/AGENTS/OpenSpec, а привязка к исполнителю — в `.codex/agents` либо `.opencode/agents`/config V2. Не копировать в два места разошедшиеся доменные правила.

## 6. Политика моделей, бюджета и failover

### Возможности важнее имени модели

- `critical`: доменные/безопасностные развилки, миграции, auth, решение неоднозначности, критичное ревью; сильнейшая реально доступная модель/усилие, при недоступности — human escalation.
- `standard`: планирование принятых дизайнов, реализация ограниченного среза, обычный review; проверенная coding-модель средней стоимости.
- `economy`: чтение scoped файлов, summarization, механическая документация, простые локальные правки; дешевая/бесплатная модель **если tool-use и конфиденциальность проверены**.
- `local`: приватные/низкорисковые операции и простые преобразования через Ollama; не предполагать качество для архитектуры/безопасности.

### Матрица defaults (политика, не обещание доступных моделей)

| Роль | Обычный уровень | Повышение | Понижение |
| --- | --- | --- | --- |
| Orchestrator | standard | critical при сложном планировании и конфликте | economy на простом bounded issue |
| Explorer | economy | standard при сложных зависимостях | local при подтверждённой пригодности |
| Architect | critical | владелец решает непреодолимую неоднозначность | standard только при утверждённом contract и явном review |
| Planner | standard | critical при новой архитектуре | economy по принятому ADR |
| Worker | standard | critical при domain/security changes | economy при ясном маленьком diff |
| Reviewer | standard, **независимый контекст** | critical для auth/migration/security | economy только для lint/docs; не для security |

Встроенные тесты и линтеры **не потребляют LLM-токены** и первыми проверяют механические свойства результата.

### Переключение

1. Проверить live модель/провайдера, tool-use, эффективную роль и лимиты из реально доступных метаданных.
2. Выбрать tier по риску работы и оставшемуся подтверждённому доступу; сохранить `requested` и `actual` model id (если инструмент раскрывает).
3. При исчерпании квоты прекратить текущий опасный шаг, передать короткий handoff другому агенту/сеансу; не повторять слепо tool calls.
4. Если quota API недоступно — **ручной профиль** `quality`/`balanced`/`budget`, а не выдуманный автоматический роутер по остаткам.
5. Не отправлять внутренние данные стороннему free-hosted provider без просмотра privacy/data retention и решения владельца.

## 7. Инструменты и enforcement

- GitHub branch protection и явное разрешение на squash merge — внешний control plane.
- Worker — допустимый scope записи в отдельном worktree при независимой реализации; read-only роли должны иметь **технический запрет** `edit` + осторожную политику shell, если рантайм её поддерживает. Текст `do not edit` не enforcement.
- **OpenCode V2**: project agents/permissions ограничивают инструменты по ролям, но не доказывают OS-level sandbox; проверять запрет `shell`, `edit`, `external_directory` и `git push` на практике. V2 синтаксис существенно отличается от V1.
- **Codex**: субагенты наследуют sandbox/approval и provider; reviewer TOML — только инструкция. Для изоляции использовать отдельный root session/worktree, при необходимости sandbox.
- Worktrees для *параллельных writers*, не обязательны для каждого read-only Explorer. Раздельные процессы/DB при тестах; shared `local-demo` SQLite не трогать с несколькими Worker.
- Секреты: не хранить в Markdown prompts, git, screenshots, logs, model routing; брать из разрешённого локального credential store, не копировать provider tokens между средами.
- Skills: переиспользовать `.agents/skills/openspec-*`. MCP добавлять только под конкретную задачу, не как архитектурную цель.
- **P1 CI contract drift:** в `main` `verify.yml` только ручной; любые docs о Draft FAST/Ready FULL должны быть явно пересмотрены при внедрении. Состояние «test passed locally» и «GitHub Verify passed on final SHA» — разные факты.

## 8. Quality/acceptance gates

| Gate | Owner | Проверка | Решение |
| --- | --- | --- | --- |
| Problem / scope | Orchestrator + Owner при изменениях цели | Issue, source-first, границы | Continue / clarify |
| Architecture | Architect + Owner | ADR, доменные инварианты, DB/permissions, влияние на UI/API | Approve / revise |
| Plan | Planner | OpenSpec strict, точные AC, task ownership | Apply-ready / revise |
| Apply | Worker | Малый diff, focused tests, net-new tests | Review / fix |
| Independent review | Reviewer | P0/P1/Р2+ evidence `file:line`, impact and reproduction | Block on P0/P1 |
| Integration | Orchestrator + Validator | Base/head freshness, affected tests, single necessary FULL on candidate, manual workflow if required | Ready / back to Worker |
| Product acceptance | Owner | Реальный сквозной сценарий, не MOCK, контролируемая роль | Accept / reject |
| Merge | Owner explicit action | Squash+protected main; PR description true to SHA | Merge / defer |

Инварианты NAPMS, критичные для любой модели: Need ≠ permission; AccessRequest отделён от Allow/Deny; DENIED не создаёт запрещающего Rule; PolicyRule canonical для exact `(src Deployment, dst Deployment, InteractionRevision)`; ALLOWED не доказывает сетевую доступность; export только авторизованного ACTIVE subset, независимые `policy.export` grants; source-only admission; неизменяемая история/ID, сохранённая база и server-side authorization.

Reviewer не вправе утверждать «PASS» на основании чужого summary. Он может указать `NOT RUN` либо `REPORTED BY WORKER` и проверить исходный лог/CI.

## 9. Ошибки, повторы и восстановление

- **Неверный output роли:** проверить входной контракт и перезапустить только один scoped шаг; не переисполнять pipeline с нуля.
- **Разные архитектурные решения:** вернуть owner один ADR с конфликтом и последствиями, не инициировать голосование нескольких моделей.
- **Ошибка тестов:** Worker получает точный командный лог, тест, границы; исправляет причину, а не удаляет test или ослабляет gate.
- **Недоступная модель:** отметить `blocked: quota/provider`, сменить tier/провайдера на следующем шаге; не переключать в середине небезопасной записи.
- **Загрязнение контекста:** новый агент читает принятый ADR/OpenSpec, новые факты Explorer и diff, не старую историю.
- **Git conflicts:** обновить `main`/base и заново проверить затронутые части; не заявлять, что прежний CI относится к новому merge candidate.
- **Reviewer loop:** максимум 2 bounded итерации, затем escalation; никогда не делать self-approved merge.
- **Rollback:** базовый Codex остаётся работоспособным до полной приёмки нового рантайма. Удаление/архивирование пилотных файлов — отдельное решение, основную ветку не менять до согласия.

## 10. Проверяемые архитектурные критерии

- Один пользовательский Issue приводит к одному наблюдаемому локальному процессу; роли возвращают раздельные артефакты и bounded контексты.
- Для каждой задачи доступны база, HEAD, разрешённые файлы, фактическая модель, выполненные команды и исходы без выдумывания.
- Read-only Reviewer не может писать через доступные ему инструменты в тестовой среде; провал enforcement запрещает миграцию.
- Простое исправление проходит без многоролевого церемониала; сложное изменение всегда рассматривает инварианты и решение владельца.
- Независимые read задачи могут работать параллельно; параллельные writers изолированы отдельными worktree/файловой областью.
- Результат совместим с OpenSpec, установленными тестами, existing UI contract и GitHub protected main.
- Можно вернуться к Codex без потери доменных правил: они живут в Git/OpenSpec, не в особенностях одного агента.

**Вывод:** полная целевая схема определена. Новая роль считается полезной только при отдельной ответственности и проверяемом результате; базовый комплект — Orchestrator, Explorer, Architect, Planner, Worker, Reviewer и не-LLM Validator.