# Issue #34 — реализация UI/IA Baseline v0.2

Основа: GitHub `main` на `be15f30`. Только read-only UI на неизменённом синтетическом fixture. Результат передаётся одним Draft PR; merge выполняет координатор после review.

| Коллекция | Строка таблицы и содержание карточки |
| --- | --- |
| Бизнес-процессы | BusinessProcess: назначение, ответственность, связанные потребности. Обзор → Потребности → ConnectivityNeed. Старый detail `/prototype/needs/mock-process` сохранён; breadcrumbs и выделение Sidebar указывают на процессы. |
| Потребности в коммуникациях | ConnectivityNeed: процесс, Interaction, участник, обоснование. Обзор → Коммуникация / Бизнес-процесс / Заявки / Правила. Need не разрешает доступ. |
| Ресурсы | Resource: scope, Endpoints с текущими адресами внутри ячейки, площадка, ответственность. Обзор → Endpoints / Развёрнутые компоненты / История. Одна строка на Resource. |
| Профили приложений | Application: многострочная колонка Components, коммуникации отдельно, назначение. Обзор с направлением и назначением → Компоненты / Коммуникации → Interaction → Ревизии → InteractionRevision. |
| Развёрнутые компоненты | ComponentDeployment: Component, Application, Resource, состояние. Обзор → Компонент и профиль / Ресурс / Коммуникации. |
| Заявки на доступ | AccessRequest: точный предмет, заявитель, время подачи при наличии, независимый статус. Обзор → Предмет доступа / Решение и evidence / Бизнес-основание; только у ALLOWED есть переход к Rule. |
| Правила политики | Только PolicyRule: exact subject, состояние правила, authorization provenance. Обзор → Предмет доступа / Основания разрешения / Бизнес-основание / Вычисляемая проекция. Участники subject читаются из ALLOWED provenance. |

Один общий `Collection` обеспечивает поиск, применимые фильтры, таблицу и пагинацию; конфигурации колонок и вкладок задают предметное содержание. Внутри вкладок разные Kind показываются отдельными таблицами. Decision, AccessSubject и Component не получили выдуманные fixture-записи или ID: используются существующие поля/роли и связи. Вкладки появляются только при наличии содержания. История Resource содержит подтверждённые интервальные факты, не выдуманный журнал событий.

Сохранены технические `/prototype/network`, `/prototype/comparison`, все прежние object deep links и redirect `/prototype/policy/mock-request-*`. Их нет в Sidebar. Исторический `/prototype` остаётся вводной страницей с переходом к процессам. REAL API вынесен в отдельный блок и не получает mock ID. DENIED не создаёт и не отзывает Rule. Экспорт обозначен как авторизованный вычисляемый результат API; фиктивной кнопки и отдельного Effective Policy workspace нет.

## Проверки и визуальные доказательства

- `npm run build` (включает `tsc --noEmit`) — PASS.
- `npm run test:semantic` — PASS: 16 Kind, 7 top-level collections, canonical request/rule routes, DENIED provenance и 2 негативных validator sentinels.
- `npm run test:e2e` — **26 PASS**, включая пять сценариев настоящего FastAPI с временной SQLite. Проверяются пути из семи пунктов Sidebar, все fixture-связи через вкладки, типы/статусы, direct URL, breadcrumbs, Back/reload, поиск/пагинация/фильтры, ноль fetch/XHR в mock, независимые real credentials и отрицательная авторизация.
- `openspec validate --all --strict` — **7 PASS, 0 FAIL**. Принятые OpenSpec, ERD, backend, реальные API и fixture-записи не изменялись согласно границе Issue.
- Геометрические E2E дополнительно проверяют 2560×1440, перетаскивание/клавиатуру Sidebar в пределах 200–360 px и сохранение ширины.
- [geometry.json](evidence/geometry.json): **57 реальных implementation PNG + 3 PNG reference.html**, снятые Chromium при **1440×900, 1920×1080 и 390×844**. Переполнения document нет на всех 57 implementation-страницах. Таблицы прокручиваются внутри своих контейнеров.

Вручную просмотрены реальные PNG коллекций, Resource/Application overview, Rule provenance и мобильных Needs/Requests/Policy; сопоставлены с отрендеренным `reference.html`. Подтверждены тёмный регулируемый Sidebar, fluid workspace, общие отступы/панели, иерархия заголовков, контраст вторичных подписей и разделителей, горизонтальные предметные вкладки и близкое размещение label/value. На широком экране свойства ограничены по ширине внутри fluid-панелей. На мобильном панели идут одной колонкой. Структурные placeholder-строки reference не воспроизводились как данные.

| Экран | 1440×900 | 1920×1080 | 390×844 |
| --- | --- | --- | --- |
| Бизнес-процессы | [PNG](evidence/1440-processes.png) | [PNG](evidence/1920-processes.png) | [PNG](evidence/390-processes.png) |
| Потребности | [PNG](evidence/1440-needs.png) | [PNG](evidence/1920-needs.png) | [PNG](evidence/390-needs.png) |
| Ресурсы | [PNG](evidence/1440-resources.png) | [PNG](evidence/1920-resources.png) | [PNG](evidence/390-resources.png) |
| Профили приложений | [PNG](evidence/1440-applications.png) | [PNG](evidence/1920-applications.png) | [PNG](evidence/390-applications.png) |
| Развёрнутые компоненты | [PNG](evidence/1440-deployments.png) | [PNG](evidence/1920-deployments.png) | [PNG](evidence/390-deployments.png) |
| Заявки | [PNG](evidence/1440-requests.png) | [PNG](evidence/1920-requests.png) | [PNG](evidence/390-requests.png) |
| Правила | [PNG](evidence/1440-policy.png) | [PNG](evidence/1920-policy.png) | [PNG](evidence/390-policy.png) |
| Application overview | [PNG](evidence/1440-applications-mock-application.png) | [PNG](evidence/1920-applications-mock-application.png) | [PNG](evidence/390-applications-mock-application.png) |
| Resource → Endpoints | [PNG](evidence/1440-resources-mock-resource-order-endpoints.png) | [PNG](evidence/1920-resources-mock-resource-order-endpoints.png) | [PNG](evidence/390-resources-mock-resource-order-endpoints.png) |
| Interaction → Revision | [PNG](evidence/1440-applications-mock-interaction-ledger-revisions.png) | [PNG](evidence/1920-applications-mock-interaction-ledger-revisions.png) | [PNG](evidence/390-applications-mock-interaction-ledger-revisions.png) |
| Decision / evidence | [PNG](evidence/1440-requests-mock-request-allowed-decision.png) | [PNG](evidence/1920-requests-mock-request-allowed-decision.png) | [PNG](evidence/390-requests-mock-request-allowed-decision.png) |
| Rule authorization | [PNG](evidence/1440-policy-mock-rule-authorization.png) | [PNG](evidence/1920-policy-mock-rule-authorization.png) | [PNG](evidence/390-policy-mock-rule-authorization.png) |
| HTML reference | [PNG](evidence/1440-reference.png) | [PNG](evidence/1920-reference.png) | [PNG](evidence/390-reference.png) |

Воспроизведение: из `web` запустить `npm run dev -- --port 5174`, затем в другом терминале `node scripts/capture-baseline.mjs`. Скрипт открывает только mock и локальный reference, сохраняет PNG и геометрию. При необходимости системных Chromium libraries задаётся локальный `LD_LIBRARY_PATH`; это не зависимость продукта.

## Изменённые файлы

- `web/src/prototype/{Prototype,Shell,Resources,Views}.tsx`: Sidebar, композиция, общий Collection, предметные колонки/вкладки и сохранение URL-контекста.
- `web/src/prototype/{data.ts,baseline.css}`: метаданные семи коллекций, отдельные исторические маршруты, выборка по Kind, контраст/плотность/адаптация. Сами `objects` fixture не менялись.
- `web/e2e/prototype.spec.ts`: переход с прежних восьми sections на семь Sidebar journeys, проверка всех существующих связей через вкладки; сохранены fixture-инварианты и Resource/geometry проверки. Semantic и real API browser suites сохранены.
- `web/scripts/capture-baseline.mjs`: воспроизводимая съёмка визуальных доказательств.
- `docs/contracts/ux-0-semantic-boundaries.json`: атомарный перевод top-level coverage на семь коллекций, остальные предметные правила сохранены.
- `docs/research/{ux-0-prototype,ux-information-architecture}.md`, `ui-baseline-v0.1/README.md`, `ui-baseline-v0.2/{README,implementation}.md`, `ui-baseline-v0.2/evidence/*`: исторические оговорки UX-0, текущий результат и визуальные доказательства.

## Оставшиеся ограничения P0–P3

- **P0:** в проверенном mock-срезе не выявлены; требуется независимый review координатора.
- **P1:** в проверенном mock-срезе не выявлены. Реальная интеграция семи коллекций и экспорт не входят в Issue #34; существующий real request UI сохранён и проверен отдельно.
- **P2:** на 390 px широкие предметные таблицы требуют внутренней горизонтальной прокрутки; Sidebar занимает вертикальное место над контентом, без выдвижной мобильной панели. Это видно в PNG, document при этом не переполняется.
- **P3:** исходный fixture содержит 1–2 строки на коллекцию, без PENDING-заявки, самостоятельных Component/Decision/Subject records и полного журнала истории. Отсутствующие факты не дополнены. Исторические OpenSpec artifacts про восемь views оставлены без редактирования по прямой границе Issue; текущая исполняемая навигация закреплена semantic contract и browser tests.

GitHub CI и финальный HEAD фиксируются в Draft PR после публикации этой ветки; локальные результаты выше не подменяют CI.
