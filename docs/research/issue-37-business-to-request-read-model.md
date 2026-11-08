# Issue #37 — domain-backed путь BusinessProcess → AccessRequest → PolicyRule

**Тип:** независимое архитектурное исследование / предложение, НЕ реализация.  
**База:** [main @ 642a6f8f5d7e903641068887bd5a32ae6ea466d3](https://github.com/lehater/napms-2/commit/642a6f8f5d7e903641068887bd5a32ae6ea466d3), проверено 2026-11-09.  
**Задача:** [#37](https://github.com/lehater/napms-2/issues/37).  
**Статус:** REVIEW PROPOSED. До согласования не изменять OpenSpec/ERD/product code.  
**Отдельно:** [Issue #36](https://github.com/lehater/napms-2/issues/36) — экспорт и Rule Detail вне предлагаемого среза.

## 1. Факты из main и проверка гипотезы

1. **Основной gap подтверждён.** В [HTTP API](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/http.py#L156-L188) есть POST/GET/list заявок, POST решения, GET Rule по ID и export. Read endpoints для BusinessProcess, Need, Application, ComponentDeployment отсутствуют. [Клиент](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/web/src/api.ts#L48-L55) вызывает только request/list/create/decide. [Форма](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/web/src/App.tsx#L84-L110) подставляет четыре известных UUID.
2. **Процессы и предметные связи действительно сохраняются**, однако [SQLite v1](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/storage.py#L6-L28) содержит для процессов, приложений и ресурсов только ID; для Need — process_id, interaction_id, component_id; для revision — полную ссылку на роли и простой traffic clause (TCP/UDP + диапазон destination-портов). Таблицы Interaction нет; её ID хранится в Need/Revision строковым ref без FK на Interaction.
3. **Server-side semantic check уже есть:** [validate_subject](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/domain.py#L28-L36) требует соответствия компонентов, Application, Need.interaction и Need.participant source Component; [submit](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/use_cases.py#L44-L60) проверяет source grant до чтения destination/revision/need. Но самостоятельного Interaction-объекта сейчас проверить нельзя.
4. **Existing authority:** [grants](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/storage.py#L15-L20) = actor/action/scope/validity. [Demo seed](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/dev.py#L17-L63) выдаёт requester право access.request только на source Resource; decider — access.decide на demo-policy; exporter — policy.export на source и destination. Других операций чтения каталога не определено.
5. **MOCK ≠ REAL:** [UI Baseline v0.2](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/docs/research/ui-baseline-v0.2/README.md#L11-L55) закрепляет три группы/семь коллекций и их семантику; [prototype/data.ts](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/web/src/prototype/data.ts#L1-L26) явно маркирует фиктивные ID и запрещает использовать их в SQLite. [main.tsx](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/web/src/main.tsx#L1-L11) маршрутизирует /prototype независимо от реального App.
6. **Логическая ERD — не физическая SQL:** [persistent-state-erd.md](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/docs/research/persistent-state-erd.md#L1-L21) имеет статус RESEARCH и не предписывает миграцию целого графа. В частности, история адресов/Site/Responsible/TAE/NEP/NEO из ERD не является объёмом #37.
7. **Хранимый результат уже доказуем:** [decide](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/use_cases.py#L85-L98) атомарно создаёт/переиспользует один Rule для exact subject при ALLOWED; DENIED не создаёт Rule. Ответ GET заявки включает decision.policyRuleId, но **не содержит Need ID и составляющих subject**, хотя они в SQL есть ([request_view](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/use_cases.py#L32-L37)).
8. **Rule detail защищён отдельно:** [Service._rule](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/use_cases.py#L100-L119) требует policy.export на ОБА Resource; [принятый контракт](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/openspec/specs/policy-export/spec.md#L82-L91) запрещает чтение Rule Detail без этих grants. Выдача Rule ID в доступной автору заявке уже поддержана и не равна полному Rule Detail.
9. **Существующие тесты:** [backend acceptance](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/tests/test_acceptance.py), [security](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/tests/test_security.py), [listing](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/tests/test_listing.py) и [Playwright real API](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/web/e2e/requests.spec.ts) проверяют четырёх-UUID сценарий; [prototype.spec.ts](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/web/e2e/prototype.spec.ts) проверяет исключительно mock-навигацию. Теста, где UI получает реальные варианты выбора от backend, нет.

## 2. Матрица Domain → SQLite → use case → HTTP → REAL UI → gap

| Сущность/роль | SQLite v1 | Существующий use case/API | REAL UI | Минимальный разрыв |
|---|---|---|---|---|
| BusinessProcess | processes(id) | нет read | нет | displayName, description; scoped discovery |
| ConnectivityNeed | needs(id,process_id,interaction_id,component_id) | find при submit, validate_subject | нет | title/businessBasis; scoped drill-down |
| Application | applications(id) | косвенно при validate | нет | displayName в контексте |
| Component | components(id,application_id) | find при validate | нет | name роли в контексте |
| Interaction | отдельной таблицы нет | сравнение interaction_id | нет | canonical identity + purpose и строгая согласованность |
| InteractionRevision | id,interaction_id,application_id,source/destination component_id, protocol, ports | find + validate при submit, export | нет | список exact revision с понятным traffic и полным UUID |
| ComponentDeployment | deployments(id,component_id,resource_id) | find при submit | нет | разрешённые source + релевантные destination варианты |
| Resource | resources(id) | source grant, export scopes | нет | displayName участника; не раскрывать чужие IP/owners |
| ResourceEndpoint | endpoints(id,resource_id,address,kind) | export (вне #37) | нет | не обязателен для выбора subject; identity не менять |
| AccessSubject | access_subjects с UNIQUE(source,destination,revision) | insert-or-ignore + validate | subjectId | раскрыть точную тройку в авторизованном Request Detail |
| AccessRequest | requests + admission evidence | submit/request/list | есть, ввод 4 UUID | отправлять выбранные сервером ссылки; показывать Need |
| AccessDecision | decisions | decide, в request_view | есть | сохранить без нового CRUD |
| PolicyRule | policy_rules + allowances | ALLOWED create/reuse; GET с policy.export | ID в Decision | итог как Rule ID/состояние заявки; Rule Detail только с grant |
| AuthorityGrant | actors/grants | grant, effective; request/list/decide/export | только 401/403 | контракт видимости request-context |

Матрица относится к **физической SQLite версии 1**, а не к логической ERD или к mock-объектам. Элементы ERD, не участвующие в пути, сознательно не мигрируются.

## 3. Сравнение read-подходов и выбор

| Критерий | Семь+ типизированных каталогов GET | Сценарная scoped request-context projection |
|---|---|---|
| KISS / первый E2E | много DTO/маршрутов/состояний | один QueryService + два GET |
| DDD | пригодно для самостоятельной жизни каталогов позже | application-level композиция refs без переноса владения доменом |
| Безопасность | отдельный authz для каждого каталога/связи | один явный scope/полевая проекция; нет unrestricted search |
| Переиспользование | выше при самостоятельных CRUD/catalog use cases | только данный сценарий; расширение по спросу |
| Множество узлов | generic клиентская склейка и N+1 | серверная композиция в одной read-транзакции |
| Цена будущего роста | ниже, если каталоги реально потребуются | понадобятся отдельные endpoints позднее |

**Рекомендуется второй подход:** один read-only application service (условно RequestContextQueryService) поверх существующей SQLite, с двумя маршрутами. Это **не** новый каталог, не CRUD-framework и не новая доменная сущность. QueryService подготавливает допустимые варианты выбора и ничего не сохраняет.

Предлагаемый HTTP контракт (имена provisional, после утверждения — OpenSpec):

1. **GET /access-request-context/processes?limit=20&offset=0** → { items: [{processId, name, description}], limit, offset, hasMore }. Выдавать только процессы, для которых текущему actor доступен минимум один валидный source-bound кандидат Need/Revision/Deployment. Фильтрация полномочий **до** pagination. Не возвращать чужие IDs, global total, candidate counts.
2. **GET /access-request-context/processes/{processId}?limit=20&offset=0** → { process: {processId,name,description}, needs: [{connectivityNeedId,title,businessBasis, application:{id,name}, interaction:{id,purpose,sourceComponent:{id,name},destinationComponent:{id,name}}, revisions:[{interactionRevisionId,ipProtocol,destinationPortStart,destinationPortEnd, sourceDeployments:[{deploymentId,resourceId,displayName}],destinationDeployments:[{deploymentId,resourceId,displayName}]}]}],limit,offset,hasMore }. Каждая revision связывает только подходящие конкретно ей размещённые роли. Порядок детерминированный; если нет видимого Process, ответ indistinguishable 404. Никаких IP, scope histories, secrets, Rule/Decision и недоступных объектов.
3. **POST /access-requests** остаётся прежним: четыре UUID поля. Сервер **повторно** проверяет authority и validate_subject в write-транзакции; GET-ответ и выбор в UI не являются разрешением, а устаревший grant блокирует admission.

Для текущего одного demo Process второй GET достаточно для Process → Need → communication → Revision → source/destination selection. Отдельный GET каждого Domain Entity не нужен. В будущих больших каталогах можно выделить самостоятельные read use cases по доказанной необходимости.

**Инвариант query:** возвращать candidate только если needs.component_id == revision.source_component_id == source_deployment.component_id; needs.interaction_id == revision.interaction_id; destination_deployment.component_id == revision.destination_component_id; оба Component принадлежат Application revision; source Resource имеет effective access.request на один server evaluationAt. Предпочитать INNER JOIN; неконсистентные записи не превращать в «выбираемые». Не предполагать отдельный статус ACTIVE для Need/Revision, пока его нет в SQLite.

## 4. Видимость / read authorization (проект решения, требует согласования)

**Факт:** в [grants schema](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/storage.py#L15-L20) и [seed](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/dev.py#L58-L63) существуют только access.request, access.decide, policy.export; отдельного catalog.read нет. Общая object-read visibility для защищённых BusinessProcess/Need/Resource в N2 **ещё не специфицирована**.

**Минимальная политика именно для request-composition, не глобального просмотра каталога:**

- Выдавать **только узкую проекцию вариантов подачи** actor с effective access.request на конкретный source Resource. Это scoped discovery для действия подачи, а не право читать произвольные Resource/BusinessProcess, включая их защищённые атрибуты. Наличие Need, ответственность или role-label не создают grant.
- Фильтровать по текущему actor/source grant до JOIN-output и pagination. В response возвращать только минимальные названия и IDs **участников, необходимых для выбора**; address, site, owner, authority scope, unrelated objects и grants не включать. Имена destination и бизнес-контекста могут быть чувствительными: **для данного среза подтвердить, что разрешённые к показу метаданные demo fixture безопасны**, иначе их не выдавать и не запускать реальную discovery над защищёнными каталогами.
- Нет доступа / нет найденного процесса: одинаковый 404 (для прямого ID) или пустой filtered list, без tenant/global totals. Невалидные query fields — 422; bearer — 401. Cache-Control: no-store; не записывать token/protected payload в логи/browser persistent state. Транзакционный снимок и однократный clock при проверке grant.
- Право **просмотра произвольного каталожного объекта** не приравнивается к **праву создать заявку**. Этот срез вовсе не вводит общий объектный GET для read-only наблюдателей. Просмотр своего ранее созданного AccessRequest остаётся разрешённым и после окончания grant; отдельный decider видит запросы по действующему access.decide, но это не даёт права их создавать.
- access.decide (demo-policy) и policy.export (оба Resource scope) остаются независимыми. Запрос на доступ к destination не требует destination access.request, но **раскрытие destination metadata** требует отдельного явного решения о минимально допустимых полях. Система с реальными защищёнными каталогами должна иметь отдельную модель object-read authority до их подключения, а не неявное «всем аутентифицированным всё».
- Никакие поля actorId, role, grantId, scope, adminMode в запросе не расширяют видимость/адмиссию. Сервер получает actor из bearer, grant из БД.
- Примечание по pre-existing leak: [submit](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/use_cases.py#L44-L52) сначала делает find(source deployment), затем grant; для неизвестного source и известного unauthorized source отличаются 404/403. Это потенциальный existence oracle за рамками локального изолированного dev-профиля. Не копировать его в GET discovery; для будущего публичного deployment нормализовать и отдельно ревьюить POST-контракт/тесты.

**Security decision gate:** если владелец считает даже names/IDs доступных через source-linked Need/destination защищёнными, указанная авторизация недостаточна. Тогда до подключения не-demo данных нужен отдельный предметный контракт read visibility (возможно action/scope в существующем механизме grants), но **не вводить новую permission автоматически** в #37.

## 5. Минимальные изменения данных и SQLite

**Предлагаемая v2 (только новый real read path):**

| Физическая сущность | Добавить | Причина / вывод |
|---|---|---|
| processes | name TEXT NULL, description TEXT NULL | Заголовок и назначение Process |
| needs | title TEXT NULL, business_basis TEXT NULL | Узнаваемая Need и обоснование |
| applications | name TEXT NULL | Имя профиля коммуникации |
| components | name TEXT NULL | Имена source/destination ролей |
| resources | name TEXT NULL | Узнаваемые Resource при выборе deployments |
| interactions (НОВАЯ небольшая таблица) | id PRIMARY KEY, application_id, source_component_id, destination_component_id, purpose TEXT NULL | Устойчивое самостоятельное основание коммуникации; одна семантика на несколько неизменяемых revisions; восстановить целостность, ныне выраженную только строкой interaction_id |
| interaction_revisions | **без обязательных новых колонок** | Вывести exact UUID + TCP/UDP + destination ports из уже сохранённых данных |
| deployments/endpoints/requests/decisions/rules/grants | без новых колонок для этого шага | Deployment отображается как Component@Resource; read не требует IP/history; Rule/Request identity уже сохраняется |

**Миграционная оговорка:** [Database.initialize/transaction](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/storage.py#L41-L65) поддерживают только user_version 0/1; триггеры запрещают UPDATE даже metadata в ряде immutable таблиц; [init_demo](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/dev.py#L41-L55) использует positional INSERT VALUES, который сломается после ADD COLUMN. Нужны явная v1→v2 миграция в транзакции, обновление версии/trigger/transaction checks, named-column INSERT в fixture, тест повторного init и миграции с сохранением всех исторических Request/Decision/Rule. Не подменять неизменяемые исторические факты программными display labels из mock.

**Данные v1:** NULL для неизвестных описаний — честный результат; UI может показывать «без названия · short UUID» без выдачи фиктивной бизнес-семантики. Нельзя автоматически backfill неизвестный businessBasis/interaction purpose из mock. Для нового dev seed записать отдельно подготовленные реальные (но синтетические) display values в SQLite в момент создания; не переносить mock-* IDs/объекты. Для ранее созданного Interaction сопоставить один существующий interaction_id с непротиворечивыми refs из revisions; при противоречии миграция должна сообщить об ошибке, а не изобретать участников. Перестройка старых FK может быть отложена при явной server-side проверке Interaction против Need/Revision на чтении/submit.

Требование к новой Interaction: один id, application и направленные source/destination Components согласованы со всеми его Revisions; новые/старые Need ссылаются на этот id. Это небольшой semantic consistency fix, а не перенос полной логической ERD. Если миграция Interaction окажется несоразмерна прототипу, допустим упрощённый read-only вывод направления из revisions **без фиктивного Interaction name** как временный вариант; однако самостоятельный Interaction тогда останется подтверждённым Gap, не «реализованным».

## 6. Изменения API и UI с проверяемой причиной

| Приоритет | Изменение | Контракт | Проверяемый результат |
|---|---|---|---|
| P0 | Scoped RequestContextQueryService + 2 GET | новый request-context OpenAPI, authz, SQL joins | Реальный список Process/Need/candidates, ни одного чужого protected ID |
| P1 | Минимальные display facts + Interaction identity; v2 migration/seed | SQLite schema/version + synthetic fixture | Объекты различимы; v1 данные сохранены; никаких mock-* |
| P1 | Расширить **авторизованный** GET /access-requests/{id} и list-схему одинаково: добавить connectivityNeedId и subject {sourceDeploymentId,destinationDeploymentId,interactionRevisionId} | additive AccessRequest DTO | После reload можно проверить сохранённую Need и **exact** subject, не полагаясь на client state |
| P1 | REAL navigation: Process → Need → communication → exact revision → deployments → submit | real React routes; вызов 2 GET и существующего POST | Создание без ручного ввода четырёх UUID; только значения, полученные от backend |
| P1 | Сохранить backend submit/decide checks, расширить проверку Interaction consistency если вводится таблица | use_cases/domain invariants | Подмена ревизии/ролей/Need/чужого source отклоняется без записи |
| P1 | Разделить факт ALLOWED и Rule Detail | existing request/decision DTO + policy-export spec | requester видит Rule ID/provenance, но не может читать protected /policy-rules/{id} без policy.export |
| P2 | Вынести правило видимости + response shape в будущий OpenSpec change только после решения | new spec, accepted baseline unchanged до review | Семантика авторизации проверяется контрактными тестами |
| P2 | Не добавлять revisionNumber/status наугад | SQLite remains exact UUID + traffic | Не симулируется «актуальная»/«последняя» ревизия без источника |

**UI маршруты (предлагаемые, без изменения /prototype и нынешних /access-requests):** /business-processes → /business-processes/:processId → /business-processes/:processId/needs/:needId → /access-requests/new (выбор передан состоянием/route params, без секретов) → /access-requests/:requestId. При прямом открытии Need-detail вновь читать server-backed context, не доверять старому состоянию браузера. Breadcrumbs, tabs и таблицы придерживаются [UI v0.2](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/docs/research/ui-baseline-v0.2/README.md#L30-L46), но не требуется превращать все 7 mock-коллекций в real.

В форме: source Resource/Deployment выбирается из доступных, revision подтверждается по направлению + TCP/UDP/портам + полному exact UUID, destination Deployment только из валидного набора для выбранной revision. Не делать вывод «HTTPS» исключительно по TCP/443. Оставить явное подтверждение before POST; 201 → persisted request detail. При 403/409/race состояние перечитывается; при token switch защищённые данные очищаются. Режим requester/decider — UI-подсказка, не authority.

## 7. Один связанный synthetic E2E

**Fixture из текущего [dev.py](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/src/napms/dev.py#L13-L63):**
- Resource source ID = UUID(1), destination ID = UUID(2); Endpoint адреса 192.0.2.10 и 192.0.2.20 (эти IP **не** идентичности subject).
- Application UUID(5), source Component UUID(6), destination Component UUID(7), Interaction UUID(8), immutable Revision UUID(9), traffic TCP/443.
- Source Deployment UUID(10), destination Deployment UUID(11), BusinessProcess UUID(12), Need UUID(13).
- Requester UUID(14) имеет access.request на Resource UUID(1); decider UUID(15) — access.decide на demo-policy. Exporter UUID(16) имеет отдельные policy.export, не используется в этом E2E.
- Display metadata должны создаваться новым coherent real demo seed, **не из mock fixture**. Начальных AccessSubject/Request/Decision/Rule нет.

**E2E сценарий** (реальный браузер + FastAPI + временная SQLite, как в [текущем requests.spec.ts](https://github.com/lehater/napms-2/blob/642a6f8f5d7e903641068887bd5a32ae6ea466d3/web/e2e/requests.spec.ts#L12-L71)):
1. Requester с действительным token заходит на реальную страницу BusinessProcess, видит авторизованный процесс UUID(12) с понятным названием. UI запрашивает scoped process list; ручные UUID inputs отсутствуют.
2. Открывает Process Detail → Need UUID(13) с businessBasis. В Need видит профили, направленную Interaction UUID(8), source/destination Component и единственную точную immutable Revision UUID(9): TCP/443.
3. Выбирает source Deployment UUID(10) на Resource UUID(1) и destination Deployment UUID(11) на Resource UUID(2). UI показывает semantic summary и полный revision UUID. POST /access-requests отправляет ровно четыре ID, полученные из API.
4. Backend вновь проверяет source access.request + соответствие Need/Revision/deployments, сохраняет новый PENDING Request, subject, authority evidence. GET /access-requests/{id} после reload подтверждает Need ID и exact triple.
5. Переключение на настоящий decider credential; POST decision=ALLOWED; decision.policyRuleId не null. В БД один canonical ACTIVE PolicyRule с точным subject; Rule связан с ALLOWED decision и request (тест может проверить SQL, но UI requester не получает скрытый Rule Detail).
6. Requester снова входит и открывает ту же Request Detail. Видит ALLOWED, decisionId, policyRuleId, Need и exact subject, подтверждённые новым server GET. Никакого claims про эффективную политику, реальные пакеты или export.

**Негативные проверки (в том же изолированном тестовом наборе):**
- source без effective access.request: не видит чужой candidate context, POST даёт 403, **ни Request, ни DENIED** не создаются;
- direct GET чужого Process ID не различим с несуществующим; поиск/offset не сообщает hidden counts, IDs, метаданные;
- подменённая Need, reverse deployments, несовместимая revision или Component другого Application отклоняются; count(Request/Subject/Rule) неизменен;
- истёкший grant между GET и POST: POST даёт 403;
- requester не может POST ALLOWED, decider не получает access.request автоматически;
- DENIED на **отдельном новом subject/изолированном fresh state** сохраняет decision с policyRuleId=null, не создаёт новый Rule; DENIED после прежнего ALLOWED **не удаляет** существующий Rule;
- повторное ALLOWED по тому же exact subject даёт прежний ruleId, дополнительные decision evidence сохраняются;
- requester/decider без policy.export не могут GET protected /policy-rules/{id}; не вводить обходной Rule Detail.

**Acceptance gate:** никакого ввода известных 4 UUID в UI; все selectable IDs взяты из реального authenticated GET; одно реальное POST/ALLOWED; подтверждение из независимого GET/SQLite; no mock references; негативная security/semantics матрица PASS. Тестовый код и CI в рамках будущей реализации, не этого исследовательского PR.

## 8. Риски (P0–P3)

| Уровень | Риск | Решение до реализации |
|---|---|---|
| **P0** | Новые endpoints раскрывают чужие Process/Need/Resource IDs или metadata до server authz | filter-before-page, 404/empty, minimal fields, dedicated negative fixtures; не публиковать unscoped catalog API |
| **P0** | UI передаёт неконсистентный AccessSubject, сервер доверяет GET/selection | сохранить server submit checks; тест подменённого subject; для Interaction-table проверить инвариант отдельно |
| **P1** | Не определена общая object-read authority, в т.ч. секретность destination/business labels | принять строго ограниченный dev request-composition disclosure; перед реальными защищёнными каталогами отдельное review read rights |
| **P1** | Миграция ломает v1 history, immutable triggers или positional seed | transactional version upgrade, no invented backfill, named inserts, repeat-init/restart tests |
| **P1** | Request Detail не подтверждает Need и exact subject после reload | добавить поля в защищённый read DTO |
| **P1** | Непосредственный GET Rule для requester обходит policy.export | итог только через собственную Request/Decision; Rule Detail и Issue #36 отдельно |
| **P1** | POST source existence oracle (404 vs 403) | не повторять в discovery; отметить для security hardening при переходе из loopback |
| **P2** | Множество Need/revision/deployments перегрузит один контекст | server bounded pagination per process, deterministic sort, no global total; дальнейшее дробление по метрикам |
| **P2** | Текущая SQL-модель не обеспечивает FK на Interaction | validation в query/submit + миграционная проверка; rebuild FK по подтверждённой потребности |
| **P2** | NULL metadata у migrated legacy rows | явный placeholder «без названия» и недоступность выбора там, где семантика непроверена |
| **P3** | Неконсистентность русских/английских display labels | привести в UI к принятой терминологии v0.2 без смены domain names |

## 9. План после согласования, без преждевременного OpenSpec

1. **Согласовать** boundary: RequestContextQueryService (2 GET), permitted display fields, policy limited discovery, additive Request Detail; решить нужно ли уже сейчас хранить Interaction отдельной таблицей.
2. После принятия сформировать **один узкий OpenSpec change**, не включать Issue #36, full CRUD или ERD migration.
3. Сначала реализовать v2 schema + coherent seed + query service/API с authz negative tests; самостоятельно доказать один complete JSON context без фронтенда.
4. Затем подключить **только** real Process/Need → Request route в текущем Web UI, сохранив /prototype отдельно.
5. Выполнить один browser E2E на временной SQLite и весь существующий CI; независимое review, затем отдельно решение о merge.

## 10. Итог для координатора

**Решение к обсуждению:** минимальный вертикальный read-path — scoped projection на уровне application use case + два GET; небольшой набор display metadata, при необходимости одна каноническая Interaction-таблица; additive Request Detail; реальная форма использует текущий POST без нового Rule CRUD.

**Необходимый security gate:** существующее source-only access.request даёт authority на подачу, но само по себе не устанавливает общего права читать защищённые каталоги. В этом demo-срезе ограничить видимость возвращаемыми request-composition вариантами/безопасными labels; подключение реальных каталогов требует отдельного явного правила read disclosure.

**Не реализовано в этом PR:** код, миграция, seed, OpenSpec, UI, тесты или экспорт. Документ фиксирует проверяемое проектное предложение на указанном main SHA; CLI/CI не запускались в исследовательском чате.
