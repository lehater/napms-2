# NAPMS 2.0

Управление сетевым доступом: `BusinessProcess → ConnectivityNeed → InteractionRevision →
AccessRequest → AccessDecision → PolicyRule`.

Рабочий стек: FastAPI, SQLite, React/TypeScript, Vite, OpenSpec и Playwright.
**Единственный источник предметных данных в работающем интерфейсе — FastAPI/SQLite.**
Клиентских mock-коллекций и маршрута `/prototype` нет.

## Запуск в Ubuntu/WSL

Все команды выполняются из корня репозитория:

```bash
make setup        # установить Python/Node зависимости
make init-auth    # ЯВНО создать локальные учётные записи и grants (без бизнес-данных)
make run          # запустить FastAPI + React, http://127.0.0.1:5173/
```

`make run` не создаёт бизнес-процессы, приложения, ресурсы, взаимодействия,
потребности, заявки или правила. Если actors отсутствуют, выполнение
останавливается с подсказкой `make init-auth`. Остановка: Ctrl+C.

`make help` показывает ключевые команды; `make test` запускает backend pytest,
`make check` — быстрые проверки, `make check-full` — полный профиль.

### Полный сброс SQLite

```bash
# Сначала остановите ранее запущенный NAPMS (Ctrl+C).
make reset-db     # введите RESET для необратимого удаления ВСЕХ строк
```

**Результат сброса:** актуальная структура SQLite v8, **ноль записей во всех
прикладных таблицах**, включая `actors`, `grants`, `processes`,
`applications`, `resources`, `interaction_revisions`, `access_requests` и
`policy_rules`. После reset приложение автоматически ничего не засеивает.

Внешний приватный файл `var/dev-credentials.json` сохраняется — в нём только
локальные токены, а не предметные записи. Для продолжения работы необходимо
отдельно выполнить `make init-auth`, который явно создаст только
учётные записи и локальные grants. **Он не создаёт предметные объекты**.

Сброс также доступен через `napms-dev reset-demo --yes`, без HTTP endpoint.
Команда проверяет принадлежность БД проекту, отказывается работать при занятых
портах 8000/5173, неизвестной схеме и небезопасном пути или permissions.
Файлы SQLite WAL и SHM не удаляются вручную.

Настраиваемые пути для `make init-auth`, `make run` и `make reset-db`:

```bash
make reset-db DB=var/other.sqlite3 CREDENTIALS=var/other.json
make init-auth DB=var/other.sqlite3 CREDENTIALS=var/other.json
make run DB=var/other.sqlite3 CREDENTIALS=var/other.json
```

### Локальная авторизация

`make init-auth` создаёт три реальные локальные учётные записи в SQLite:
Requester (создание каталогов, процессов и потребностей), Decider (решения),
Exporter (просмотр/экспорт при наличии ресурсных grants). Токены хранятся
в `var/dev-credentials.json` с permissions 0600 и не публикуются.

В профиле `local-demo` переключатель actor — только локальный способ выбрать
реальный серверный credential; сетевые ответы и права по-прежнему определяет
FastAPI по таблицам SQLite. Анонимный пользователь получает 401.

Для подачи заявок по **вновь созданным через UI ресурсам** требуется явно
выдать реальные scope-grants. После создания Resource используйте для каждого
ресурса, которому необходим доступ или экспорт:

```bash
.venv/bin/python -m napms.dev grant-demo-resource --resource-id UUID_РЕСУРСА
```

Команда добавляет в SQLite `access.request`, `access.options.read` и
`policy.export` для соответствующих локальных actor. Она не создаёт
ресурсы, заявки или разрешения автоматически. Сервер проверяет grants при
каждом действии. Настройка прав через полноценный IAM UI — отдельная задача.

### Ручной запуск

```bash
# После make setup / make init-auth:
.venv/bin/python -m napms.dev serve
cd web && npm run dev
```

Web UI: http://127.0.0.1:5173/; Swagger: http://127.0.0.1:8000/docs.
При ручном запуске Bearer token вводится в интерфейс и хранится только
в памяти вкладки. Vite/FastAPI работают только на loopback.
`var/` исключён из Git.

## Работа с пустой базой

1. Создайте первый BusinessProcess и Application через рабочие страницы.
2. Добавьте Components и Interaction с Revision #1 (1..N TrafficClause).
3. Создайте Resources, задайте Endpoints и Deployments.
4. Свяжите BusinessProcess с Interaction через ConnectivityNeed.
5. Явно выдайте ресурсные grants локальным actor и отправьте AccessRequest.
6. Примите решение: ALLOWED создаёт PolicyRule, DENIED — нет.

Повторное создание Interaction для той же направленной пары компонентов
отклоняется SQLite UNIQUE / API 409. Изменения трафика публикуются новой
неизменяемой Revision. Исторические Requests и Rules ссылаются на точную
Revision.

**Ограничение текущего среза:** переход v7→v8 с дублирующими Interaction
имеет открытое архитектурное замечание P1 в PR #78. Для одноразовой локальной
БД предпочтителен явный reset вместо автоматической консолидации, пока
архитектурное решение не принято.

## Проверки

```bash
make test
make check
make check-full
cd web && npm run test:semantic
```

Автоматические тесты имеют право **явно** вызвать `napms-dev init-demo`
для создания фикстуры в **изолированной тестовой SQLite**. Эта команда не
вызывается `make run` и `make reset-db`. Тестовые записи не являются
источником данных работающего UI и не подменяют API ответы.

Документация:
- [Доменная модель](docs/domain.md)
- [UI/IA Baseline v0.2](docs/research/ui-baseline-v0.2/README.md)
- [OpenSpec ACC ревизий](openspec/changes/acc-revision-traffic-clauses/specs/application-catalog/spec.md)
- [Реальный UI-контракт](docs/contracts/README.md)
- [Исторические UX-исследования](docs/research/ux-0-prototype.md)
