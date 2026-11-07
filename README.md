# NAPMS 2.0

Локальный первый продуктовый срез: `AccessRequest → ALLOWED/DENIED → PolicyRule → JSON/CSV`.
FastAPI/Swagger UI, Pydantic, SQLite (WAL), Python 3.12+. React/TypeScript Web UI; без ORM.
Принятые требования: [первый срез](docs/first-slice.md),
[дизайн](openspec/changes/archive/2026-11-07-first-access-policy-slice/design.md).
NAPMS 1.0 используется только как источник знаний; код и Harness не перенесены.

**Дальнейший приоритет:** развитие SDLC/Harness и измеряемого качества разработки.
[Roadmap и вход для нового чата](docs/engineering/sdlc-improvement-roadmap.md) · [SDLC-01 baseline](docs/engineering/quality-gates-baseline.md) · [Issue #7](https://github.com/lehater/napms-2/issues/7).

## Установка и запуск

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
миграции пока не предусмотрены.

## Web UI (локальный demo)

Исследовательский [UX-0 прототип](docs/research/ux-0-prototype.md) доступен по
<http://127.0.0.1:5173/prototype> без API и token после запуска Vite.
Восемь read-only разделов используют только явно помеченный связанный mock fixture;
настоящие заявки и credentials остаются в `/access-requests`.

Нужны Python 3.12+ и Node.js 22.12+ (CI: Node 24). Сначала выполните установку,
`napms-dev init-demo` и `napms-dev serve`, как описано выше. В другом терминале:

```bash
cd web
npm ci
npm run dev
```

Открыть <http://127.0.0.1:5173>. Vite и FastAPI слушают только loopback;
относительные `/access-requests` запросы проходят через Vite proxy к `127.0.0.1:8000`.
Поддерживаемая конфигурация отклоняет non-loopback `--host`; backend использует порт 8000.
Production build проверяется, но не является способом deployment или запуска API.

Выберите requester и вручную введите его token из приватного `var/dev-credentials.json`
в маскированное поле Bearer token. Создайте заявку с публичными demo UUID, откройте список
и детали. Переключите mode на decider, заново введите соответствующий token и подтвердите
ALLOWED или DENIED. После переключения на requester и повторного ввода token перечитайте
статус. DENIED хранит `policyRuleId=null` и не отзывает ранее созданные Rules.

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
