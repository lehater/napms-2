# NAPMS 2.0

Локальный первый продуктовый срез: `AccessRequest → ALLOWED/DENIED → PolicyRule → JSON/CSV`.
FastAPI/Swagger UI, Pydantic, SQLite (WAL), Python 3.12+. React/TypeScript Web UI; без ORM.
Принятые требования: [первый срез](docs/first-slice.md),
[дизайн](openspec/changes/archive/2026-11-07-first-access-policy-slice/design.md).
NAPMS 1.0 используется только как источник знаний; код и Harness не перенесены.

**Дальнейший приоритет:** развитие SDLC/Harness и измеряемого качества разработки.
[Roadmap и вход для нового чата](docs/engineering/sdlc-improvement-roadmap.md) · [SDLC-01 baseline](docs/engineering/quality-gates-baseline.md) · [Issue #7](https://github.com/lehater/napms-2/issues/7).

## Установка и запуск

Для совместного запуска FastAPI/React и выбора demo actor без копирования токенов
используйте [явный профиль local-demo](#запуск-одной-командой-без-копирования-токенов)
после установки зависимостей. Ниже сохранён ручной диагностический запуск.

Из свежего клона:

```bash
git clone https://github.com/lehater/napms-2.git
cd napms-2
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[test]'
napms-dev init-demo
napms-dev serve
```

На Debian/Ubuntu для `venv` может потребоваться системный пакет `python3.12-venv`.
Открыть <http://127.0.0.1:8000/docs>. API schema: `/openapi.json`.
Поддерживаемый launcher принимает только `--host 127.0.0.1` (default) или `--host ::1`.
Доступны `--port`, `--db` и `--credentials`; указывать одинаковые пути при init и serve.

`init-demo` явно создаёт `var/napms.sqlite3` и `var/dev-credentials.json` (0600).
Токены случайные, минимум 256 бит, разные для `requester`, `decider`, `exporter`.
Файл содержит `{role: {actorId, token}}`; откройте его локально, скопируйте нужный `token`
в Swagger **Authorize** (без префикса `Bearer`). Перед сменой роли нажмите Logout и введите другой токен.
Не помещайте credentials в Git, отчёты, скриншоты или логи.
`var/` игнорируется Git. Сервер и init не печатают токены; HTTP access log выключен.

Повторный `init-demo` сохраняет существующие данные и credentials, не перезаписывает
адреса, grants и решения. Начальных заявок, ALLOWED и Rules нет. Автоматического reset нет;
для независимого сценария используйте новую пару путей DB/credentials в отдельной локальной директории.
Остановка/перезапуск `serve` сохраняет данные в SQLite. Неизвестная версия схемы отклоняется;
схемы v1/v2 атомарно обновляются до v3 при `init-demo`.
Исторические дубли потребностей останавливают миграцию без удаления записей. Исторические процессы
сохраняют неизвестные описательные поля как NULL; имя отображается как «Название не указано».

## Web UI (локальный demo)

Исследовательский [UX-0 прототип](docs/research/ux-0-prototype.md) доступен по
<http://127.0.0.1:5173/prototype> без API и token после запуска Vite.
Поддерживаемая точка входа — <http://127.0.0.1:5173/>: `/` перенаправляет в
`/business-processes`. Основной Sidebar содержит только две рабочие коллекции:
«Бизнес-контекст → Бизнес-процессы» и «Управление доступом → Заявки на доступ».
Потребности доступны во вкладке процесса; Rule Detail и скачивание JSON/CSV — по ссылке
из ALLOWED заявки. Не реализованные каталоги и общий список правил не показываются.
Источник данных — FastAPI/SQLite и серверные grants; ошибки API не подменяются fixture.

Исторические `/prototype/*` URL сохранены как отдельный учебный контекст с семью
синтетическими коллекциями. В основной навигации ссылок на него нет; Simulation и fixture
подключаются только при прямом открытии прототипа и не участвуют в рабочем состоянии.
Общие каркас, стили и resize Sidebar сохранены. См. [контракт навигации](docs/ux/real-navigation.md).
Без local-demo настоящие экраны используют ручной ввод bearer в памяти вкладки.

Нужны Python 3.12+ и Node.js 22.12+ (CI: Node 24). Сначала выполните установку,
`napms-dev init-demo` и `napms-dev serve`, как описано выше. В другом терминале:

```bash
cd web
npm ci
npm run dev
```

Открыть <http://127.0.0.1:5173>. Vite и FastAPI слушают только loopback;
относительные `/access-requests` и `/business-processes` запросы проходят через Vite proxy к `127.0.0.1:8000`.
Поддерживаемая конфигурация отклоняет non-loopback `--host`; backend использует порт 8000.
Production build проверяется, но не является способом deployment или запуска API.

Для приёмки BusinessProcess откройте «Бизнес-процессы» в Sidebar и введите token
`requester`. Только этому demo actor явно выдаются `business.process.read` и
`business.process.create` в локальном scope `demo-business`; права заявок/решений/экспорта
их не заменяют. Ответственная организация — описательный текст, не полномочие.
Нажмите «Создать бизнес-процесс», заполните название (до 300 символов), описание
(до 10000) и организацию (до 300), затем «Сохранить». Откроется карточка с серверным
UUID; вернитесь в список и откройте её снова. Обновите страницу и повторно введите
credential. Перезапустите `napms-dev serve` с той же SQLite и повторите чтение:
значения сохраняются. На вкладке «Потребности» выберите серверную коммуникацию и нажмите
«Создать потребность». После reload и перезапуска с той же SQLite запись сохраняется.
Уже выбранная коммуникация исчезает из вариантов этого процесса, но доступна другому.
Повторный POST возвращает 409. Need не создаёт заявку или разрешение доступа.
Для чтения нужны `business.need.read` и `business.process.read`, для выбора и создания —
`business.need.create` и `business.process.read`; grants выдаются только requester. Изменение/удаление процесса в этом срезе не предусмотрено.

Выберите requester и вручную введите его token из приватного `var/dev-credentials.json`
в маскированное поле Bearer token. Откройте сохранённую потребность на вкладке «Потребности», выберите Revision, Source Deployment
и Destination Deployment из серверных вариантов, проверьте сводку и отдельно подтвердите заявку.
Откроется сохранённая PENDING с Need и точным Subject; UUID вручную не вводятся.
`/access-requests/new` ведёт к выбору процесса и потребности. Переключите mode на decider, заново введите соответствующий token и подтвердите
ALLOWED или DENIED. После переключения на requester и повторного ввода token перечитайте
статус. ALLOWED даёт ссылку на REAL `/policy-rules/{ruleId}`. На ней независимо
переключитесь на Exporter (либо введите его bearer token) для просмотра и скачивания
настоящих JSON/CSV выбранного Rule. Requester и Decider этих export grants не получают.
INACTIVE экспортируется без строк; отсутствие адреса сохраняет строку INCOMPLETE.
Для обновления существующей v3 SQLite явно повторите `init-demo`: добавятся два
Requester `access.options.read` grant без замены credential и продления истёкших grants.
DENIED хранит `policyRuleId=null` и не отзывает ранее созданные Rules.

Mode — только подсказка интерфейса: полномочия проверяет backend по token/grants.
Смена mode или Clear credential удаляют token, отображённые данные и ожидающее подтверждение.
Перезагрузка страницы требует повторного ввода token; SQLite сохраняет заявки и решения.
Не используйте persistent browser storage, Vite env, URL, отчёты, снимки экрана или логи
для токенов. Не публикуйте порты, не используйте forwarding, tunnels или внешний proxy.
Это demo-only граница, не production IAM.

Проверки frontend и браузерного сценария (из `web/`):

```bash
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Перед E2E остановите ручные API/Vite: порты 8000 и 5173 должны быть свободны.
Playwright запускает настоящий `napms.dev serve`, Vite и Chromium, создаёт временные
SQLite/credentials вне репозитория и удаляет их после проверки. Mock/intercept API нет.
По умолчанию используется `../.venv/bin/python`; для другой установки задайте
`NAPMS_PYTHON=/absolute/path/to/python`. На чистом Linux для browser dependencies
может потребоваться `npx playwright install --with-deps chromium`.
Trace, video и screenshots отключены, чтобы не записывать credentials.

## Сценарий через Swagger UI

1. Авторизоваться токеном `requester`. Выполнить **POST /access-requests** с готовым example:

   ```json
   {
     "sourceDeploymentId": "00000000-0000-0000-0000-00000000000a",
     "destinationDeploymentId": "00000000-0000-0000-0000-00000000000b",
     "interactionRevisionId": "00000000-0000-0000-0000-000000000009",
     "connectivityNeedId": "00000000-0000-0000-0000-00000000000d"
   }
   ```

   Ответ 201: новый `requestId`, стабильный `subjectId`, `PENDING`, timestamp и source authority evidence.
   **GET /access-requests/{requestId}** позволяет инициатору просмотреть заявку и решение.
2. Сменить токен на `decider`. **POST /access-requests/{requestId}/decision**:

   ```json
   {"outcome": "ALLOWED"}
   ```

   Ответ 201: `decisionId`, actor/time и `policyRuleId`. Сохранить этот Rule ID.
3. Сменить токен на `exporter`. **GET /policy/export**: `ruleId` из шага 2, `format=json`.
   Одна строка READY: `192.0.2.10 → 192.0.2.20`, TCP, destination port 443–443,
   стабильные Resource/Endpoint/subject IDs и provenance запроса/решения/Need/revision.
   `format=csv` возвращает ту же семантику; **GET /policy-rules/{ruleId}** — состояние и все allowances.
4. Для DENIED создать отдельную заявку токеном `requester`, затем решить токеном `decider`:

   ```json
   {"outcome": "DENIED"}
   ```

   Решение сохраняется, `policyRuleId=null`. Оно не создаёт Rule и не отменяет ранее разрешённый Rule.
   Для демонстрации DENIED без существующего Rule используйте свежую отдельную DB.

Повторная подача создаёт другую заявку с тем же subject. ALLOWED повторно использует Rule,
сохраняя исходное и последующие решения, и не активирует INACTIVE.
Второе решение для уже завершённой заявки — 409. Неизвестные поля тела/query — 422,
невалидные семантические комбинации — 400, отсутствующие ссылки — 404.
Недействительные credentials — 401, недостаточные server-held grants — 403 с общим сообщением.
Actor/grants из тела или заголовков не предоставляют полномочий.

Стабильные demo IDs (UUID, последние hex-разряды):

| Объект | Суффикс |
|---|---|
| Source / destination Resource | `001` / `002` |
| Source / destination Endpoint | `003` / `004` |
| Application; sender / receiver Component | `005`; `006` / `007` |
| Interaction / immutable Revision | `008` / `009` |
| Source / destination Deployment | `00a` / `00b` |
| BusinessProcess / ConnectivityNeed | `00c` / `00d` |
| requester / decider / exporter Actor | `00e` / `00f` / `010` |

Полные значения также определены в `src/napms/dev.py`.
`access.request` — только source Resource; `access.decide` — отдельный scope `demo-policy`;
`policy.export` — оба Resource. CLI используется только для инициализации и запуска,
заявки и решения подаются по HTTP.

## Export и согласованность

JSON: `{evaluationAt, selectedRuleId, rows}`. Фиксированный порядок CSV columns:

```text
ruleId,subjectId,sourceResourceId,destinationResourceId,sourceEndpointId,destinationEndpointId,sourceAddress,destinationAddress,ipProtocol,destinationPortStart,destinationPortEnd,readiness,interactionRevisionId,connectivityNeedId,requestId,requesterActorId,decisionId,deciderActorId,evaluationAt,requestSubmittedAt,decisionAt,sourceAddressKind,destinationAddressKind
```

CSV metadata headers: `X-Evaluation-At`, `X-Selected-Rule-Id`, в том числе при пустом результате.
INACTIVE даёт пустой rows / CSV только с заголовком. Отсутствующий адрес — строка INCOMPLETE,
JSON null / пустая CSV cell; это не готовый permit. HOST/PREFIX хранятся отдельно от identity.
Изменения IP/состояния проверяются только изолированными fixtures; admin HTTP CRUD не добавлен.

Каждый export сначала фиксирует один committed SQLite snapshot, затем один UTC `evaluationAt`.
Grants, Rule, адреса и provenance читаются в этой же транзакции. `valid_from` включительно,
`valid_until` исключительно. Отзыв grant после фиксации snapshot влияет на следующие exports;
уже начатый может завершиться по прежнему snapshot. `evaluationAt` не является историческим
as-of запросом или точным временем DB commit; клиентский timestamp не принимается.

## Локальная граница безопасности

Это dev/test, не production IAM. Любой, кто читает credentials, может действовать всеми demo-ролями.
Не запускайте Uvicorn напрямую на публичном интерфейсе (`--host 0.0.0.0`), не публикуйте Docker
порты, не используйте reverse proxy, tunnels, WSL/host forwarding: они обходят loopback-границу
launcher и могут раскрыть токены и политику. Swagger UI и bearer-токены не обеспечивают
production network security. Для сетевой эксплуатации потребуется отдельная спецификация.
Никаких seed/reset/token issuance endpoints нет; приложение создаётся только с явными локальными credentials.

## Проверки

```bash
python -m pytest -q
openspec --version  # утверждённая версия 1.16.0
openspec validate --all --strict
```

Тесты используют только временные SQLite DB: AC-01…AC-08, HTTP authorization/forgery,
семантика и ограничения БД, сохранность после перезапуска, атомарный rollback,
конкурентные решения и snapshot при изменении IP, grants и Rule state, границы времени grants,
JSON/CSV parity, отсутствие токенов в выводе. GitHub Actions Verify запускает pytest и строгую OpenSpec validation.
Основные модули следуют D1: `http.py`, `use_cases.py`, `domain.py`, `storage.py`, `dev.py`.
Актуальные спецификации находятся в `openspec/specs/`. Завершённый change с 17/17 задачами
сохранён в `openspec/changes/archive/2026-11-07-first-access-policy-slice/`.

### Business-to-policy MOCK journey

Run `npm run dev --prefix web` and open http://127.0.0.1:5173/prototype/processes (no backend needed).
Open Settlement → Потребности → need-001 → Профиль → Order-to-Ledger HTTPS → Коммуникации → OrderClient → LedgerApi → Ревизии → rev-1 → Участники / Ресурс.
Open the Need card's «Коммуникация» tab: `/prototype/needs/mock-need?tab=communication`. The inline form shows directed communication, immutable Revision, compatible deployments, exact-subject history and the submission summary. The Revision card links back to this form.

Use «Сценарное состояние» (or `&scenario=A|B|C`) to reproduce the accepted [UX Visual Baseline](docs/ux/access-request/README.md): A defaults to `dep-order-1 → dep-ledger-2 / rev-1` on `ledger-api-02`; B selects the historical `dep-order-1 → dep-ledger-1 / rev-1` with P1; C explicitly has no compatible destination and cannot submit. The first new request is Q3; its first ALLOWED creates P2. Historical Q1/Q2 remain independent requests for the same subject and P1 is not changed.

Confirm submission, then switch the demonstration role to Decider (or enable «MOCK режим принятия решения»). Neither ALLOWED nor DENIED is preselected: choose one, inspect its confirmation panel and separately confirm that outcome. Completed decisions cannot be changed. «Открыть PolicyRule» shows the declared permission and provenance; it does not prove network availability. Switch back to Requester to inspect the saved result. Repeated ALLOWED reuses the canonical Rule, including an INACTIVE Rule without reactivating it; DENIED creates no Rule and revokes none. Role selection is mock context, not real authorization; protected Rule viewing is an explicitly permitted mock `policy.export` context.

SPA navigation preserves React simulation state. «Сбросить mock-state» or a full reload resets it without changing historical fixtures. The mock never calls the real API; the separate real API UI remains available.

## Запуск одной командой без копирования токенов

После установки Python-зависимостей и `npm ci` в `web/`, из корня репозитория:

```bash
.venv/bin/python -m napms.dev run --profile local-demo
```

Команда проверяет порты 8000/5173, вызывает существующий безопасный `init-demo`
(включая миграцию SQLite), запускает FastAPI и Vite, ждёт их готовности и печатает
ссылку. `Ctrl-C` останавливает оба сервиса. Повторный запуск сохраняет SQLite,
credentials, grants и пользовательские данные. Можно задать `--db` и `--credentials`
с путями вне `web/`. При занятых портах сначала остановите ручные процессы.
Ничего автоматически не скачивается и не устанавливается.

Откройте <http://127.0.0.1:5173/>. В единственном контроле **Demo actor** в topbar
выберите Requester: можно создать процесс и заявку. Переключитесь на Decider:
создание/чтение процесса вернёт настоящий 403, а решение заявки разрешено.
В local-demo отдельного **Demo mode** нет; полномочия определяет FastAPI.
В ручном bearer-режиме **Demo mode** остаётся подсказкой отображения и не даёт прав.
Exporter не получает права
создания/решения. «Без авторизации» проверяет настоящий backend 401.
Смена actor удаляет формы, защищённые данные и ожидающие подтверждения; выбор
сохраняется при переходах React и сбрасывается при полной перезагрузке страницы.
MOCK Simulation имеет собственную независимую роль и фиктивные данные.
На MOCK-экранах показан только независимый MOCK-контрол роли; возврат в REAL
сохраняет выбранного Demo actor до полной перезагрузки.

Ручная приёмка UI Integration Baseline:

1. Откройте `/`, выберите Requester и создайте бизнес-процесс. Проверьте «Обзор»
   и честное сообщение на вкладке «Потребности».
2. Из того же Sidebar перейдите в «Заявки на доступ» и создайте заявку
   с существующими demo-ссылками. Это отдельная реальная заявка, не связь с
   только что созданным процессом: серверный read path Need ещё не подключён.
3. Выберите Decider, начните ALLOWED, смените actor: подтверждение должно исчезнуть.
   Снова выберите Decider и подтвердите ALLOWED; проверьте «Решение и основания».
4. Вернитесь к процессу, обновите страницу, снова выберите Requester. Процесс и
   результат заявки по сохранённым прямым URL должны сохраниться, включая перезапуск.
5. Через MOCK Simulation пройдите Need → Request → Decision → Rule. Убедитесь,
   что роль MOCK независима, а mock-ID отсутствуют в REAL-коллекциях.
6. Проверьте Anonymous (401), Exporter (403 на карточке заявки), размеры
   1920×1080, 1440×900, 2560×1440 и 390 px. Завершите команду через Ctrl-C.

В этом профиле браузер передаёт только имя demo actor и специальный header.
Node-плагин Vite читает существующий приватный credentials-файл (обычно
`var/dev-credentials.json`, regular file, без symlink, mode 0600) и подставляет
Bearer только при вызове фиксированного FastAPI `127.0.0.1:8000`.
Токены не возвращаются React, не попадают в URL, storage или production bundle.
Cookies/сессии не используются. FastAPI и server-held grants не меняются.

Граница: только доверенная локальная разработка. Требуются loopback peer, точный
Host `127.0.0.1:5173`, same-origin контекст и `X-NAPMS-Dev: 1`; для POST обязателен
точный Origin `http://127.0.0.1:5173`. Cross-origin/null Origin, preflight, неизвестные
actors и конфликтующий Authorization отклоняются. Vite не обслуживает файлы вне
`web/`, credentials внутри `web/` запрещены. Произвольный локальный процесс и
зловредный same-origin JS не входят в эту demo-защиту; это не production IAM.

Активация требует одновременно dev server mode `local-demo` и server-only
`NAPMS_LOCAL_DEMO=1`; supervisor задаёт их сам. Build/preview с этими флагами
отказывают в запуске. Без профиля прежний ручной bearer workflow остаётся доступен.
Нельзя выставлять этот профиль наружу, использовать forwarding или remote proxy.

`npm run test:e2e` последовательно запускает proxy unit checks, прежние браузерные
регрессии и отдельный harness E2E с реальными FastAPI/SQLite, переключением actor,
перезапуском, 401/403, CSRF и production-отказами. Перед запуском освободите порты.
