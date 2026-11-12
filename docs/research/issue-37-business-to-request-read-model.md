# Issue #37 — актуализация следующего REAL-среза ConnectivityNeed

**Тип:** независимое архитектурное исследование, не OpenSpec и не реализация.
**Фактическая база:** [`main` @ `0a32b34954aef610e450076dbffe16d8e08c41f7`](https://github.com/lehater/napms-2/commit/0a32b34954aef610e450076dbffe16d8e08c41f7), проверено 2026-11-12.
**Доставка:** [Draft PR #38](https://github.com/lehater/napms-2/pull/38); [Issue #37](https://github.com/lehater/napms-2/issues/37).
**Вердикт исследования:** решения первого REAL-среза подтверждены владельцем; **READY FOR ARCHITECTURE REVIEW**. Продуктовый код, OpenSpec и ERD в этом PR не меняются.

## 1. Подтверждённые факты текущего main

| Область | Факт и источник | Последствие |
|---|---|---|
| Product | [`docs/product.md`](../product.md) закрепляет последовательные срезы React → FastAPI → SQLite с ручной/автоматической приёмкой и обязательной серверной авторизацией; расширенный Visibility UX M-11 отложен | Следующий срез должен дать самостоятельное пользовательское действие, а не общий read framework |
| BusinessProcess | [`storage.py`](../../src/napms/storage.py), [`use_cases.py`](../../src/napms/use_cases.py), [`http.py`](../../src/napms/http.py): SQLite `user_version=2`; `processes(id,name,description,responsible_organization)`; POST/list/detail `/business-processes` уже работают | Предлагавшаяся в старом #38 миграция Process v1→v2 **выполнена**; дублировать API/метаданные нельзя |
| Авторизация Process | `business.process.read` и `business.process.create` на `demo-business` проверяются сервером отдельно. Bearer сопоставляется с actor в локальном профиле | Эти права нельзя автоматически считать правами на создание Need или просмотр всех Communication |
| ConnectivityNeed | В SQLite v2: `needs(id,process_id NOT NULL FK,interaction_id NOT NULL,component_id NOT NULL FK)`; нет FK для Interaction и UNIQUE тройки; нет `businessBasis`, lifecycle и API | В текущем срезе обязательны ссылки и новая DB-уникальность. Текст обоснования и статус отложены |
| Коммуникации | `interaction_revisions` содержит `interaction_id`, `application_id`, source/destination Component, протокол TCP/UDP и destination port range. Таблицы `interactions` нет; `components` и `applications` имеют только ID/FK | Существующий Revision может служить источником проверяемого выбора Interaction и исходной роли, но не является самой Need |
| Размещения | `deployments` содержит Component/Resource; `resources` и `applications` не имеют display-name. В [`dev.py`](../../src/napms/dev.py) есть согласованный синтетический набор (одна Revision TCP/443, два Component, две Deployment, одна исходная Need) | Для **создания Need** Deployment/Resource/адреса пока не требуются; подписи в UI возможны только из действительно хранимых фактов, а не из MOCK |
| Существующий Request | `POST /access-requests` принимает четыре UUID: две Deployment, Revision и Need. [`validate_subject`](../../src/napms/domain.py) проверяет соответствие Need–Revision–source Component, роли одного Application, source/destination Deployment | Проверки должны сохраниться в будущем полном NID-first маршруте; этот срез не меняет Request |
| Policy | `access.request` на исходный Resource; `access.decide` на `demo-policy`; `policy.export` на оба Resource. ALLOWED создаёт/переиспользует один Rule на exact subject; DENIED не создаёт Rule | Need сама по себе не создаёт permission; права доступа к Rule Detail не расширяются |
| UI | [`BusinessProcesses.tsx`](../../web/src/BusinessProcesses.tsx) содержит REAL list/create/detail и вкладку «Потребности» с честной заглушкой. [`web/src/prototype/`](../../web/src/prototype/) содержит отдельные MOCK-сценарии | Новый путь помещается в существующую вкладку без второго Shell и без перехода в Simulation |
| Источники модели | [`docs/domain.md`](../domain.md) — принятые доменные смыслы; [логическая ERD](persistent-state-erd.md) имеет статус RESEARCH, не физическая SQLite; [OpenSpec BusinessProcess](../../openspec/changes/persist-business-process/specs/business-processes/spec.md) — уже реализованный контракт | Не выводить обязательную миграцию всего графа из логической ERD |

**Граница подтверждения:** SQLite v2 позволяет вставку Need, несмотря на immutable UPDATE/DELETE triggers, но не гарантирует уникальности тройки. Существуют FK на Process (внутри BC) и Component (межконтекстный), но нет отдельного Interaction FK. Прикладная согласованность Revision/Interaction/Component проверяется backend до INSERT в той же транзакции; UNIQUE индекс гарантирует структурную уникальность на уровне БД.

## 2. Предметное разграничение и инварианты

| Понятие | Назначение / вход | Устойчивый результат | В какой момент требуется |
|---|---|---|---|
| **BusinessProcess** | Описать процесс и его бизнес-контекст | Устойчивый Process | Уже REAL |
| **ConnectivityNeed** | Зафиксировать потребность Process в переиспользуемой Interaction со стороны **source Component** (текущий срез) | Уникальная тройка `(process_id,interaction_id,component_id)`, отдельный Need ID; потребность **не является разрешением** | После выбора существующей коммуникации |
| **Interaction** | Дать устойчивую смысловую идентичность направленной коммуникации между ролями одного Application | `interaction_id`, разделяемый ревизиями; самостоятельной SQL-строки пока нет | Для сохранения Need |
| **InteractionRevision** | Неизменяемая traffic-семантика определённой Interaction | Exact Revision ID + protocol/ports, source/destination Component | Может быть техническим **селектором** Interaction при создании Need; exact Revision требуется позднее при AccessRequest |
| **ComponentDeployment** | Привязать роль Component к Resource независимо от IP | Конкретный source/destination участник | При составлении AccessRequest, **не** при создании Need |
| **AccessRequest** | Запросить permission для exact `(source Deployment,destination Deployment,Revision)` с Need как основанием | PENDING → ALLOWED/DENIED, authority evidence | Позже, после Need; Need не является частью identity AccessSubject |

Ответы на предметные вопросы:

1. **Need до выбора конкретных размещений — да.** Deployment, адрес, точная Revision и AccessRequest не входят в идентичность Need.
2. **Need до выбора Interaction и Component — нет в текущей модели.** Эти обязательные ссылки составляют сохраняемый факт. Заполненная только Process запись означала бы **другое** понятие: предварительное бизнес-намерение, которое ни доменным контрактом, ни SQLite v2 не утверждено.
3. **Неполное заполнение допустимо только в несохранённой форме UI.** Ввод nullable FK/состояния DRAFT ради формы означал бы изменение модели; оно не рекомендуется.
4. **Минимальный путь без самостоятельного каталога Interaction:** UI показывает только сервером отобранные допустимые варианты, пользователь выбирает Revision как технический селектор. Сервер сам выводит `interaction_id` и `source_component_id`, повторно проверяет соответствие при POST и сохраняет Need; Revision ID не становится идентичностью Need.
5. **Согласованность:** оба Component принадлежат Application Revision; источник совпадает с источником направленной Interaction; одна `interaction_id` не должна обозначать несовместимые пары участников/профили среди доступных Revision. Несогласованный набор — ошибка данных, а не вариант выбора. Need должна ссылаться на существующий Process; некорректный/неразрешённый вариант не сохраняется.
6. **История и полномочия:** Need не выдаёт `access.request`; добавочная Need не меняет existing exact subject/Rule/Decision; immutable связи и source-only request authority сохраняются ([`docs/domain.md`](../domain.md), D-03/D-04/D-06…D-09).

**Принято владельцем:** для первого среза тройка `(process_id, interaction_id, component_id)` уникальна; повторное создание — конфликт. Разные BusinessProcess могут использовать общую Interaction через разные Need. `businessBasis` и `ACTIVE/RETIRED` откладываются. Кардинальность `Process 1 → 0..N Need` из ERD разрешает несколько **разных** потребностей и сама по себе не определяет уникальность.

## 3. Ранее предложено в PR #38, но не принято

В первоначальной редакции #38 (база `642a6f8` от 2026-11-09) для полного Process → Request были предложены `RequestContextQueryService`, два `GET /access-request-context/...`, display fields почти всех каталогов, отдельная таблица Interaction, расширение Request DTO и v1→v2 миграция.

| Историческое предложение | Статус после PR #44–#46 и продуктовой стратегии |
|---|---|
| Создать Process read API, добавить Process name/description и выполнить v1→v2 | **Уже реализовано**; исключить из следующего среза |
| Общий RequestContextQueryService и два GET с составлением всего exact subject | **Не принято и преждевременно**: следующий пользовательский шаг — создать/прочитать Need, а не AccessRequest |
| Добавить имена Resource/Application/Component, Need.title/businessBasis, Interaction.purpose | **Отложено**: display data нет в SQLite; добавлять только после доказанного сценария, не заполнять из MOCK |
| Создать отдельную persisted Interaction и FK | **Не принято**: доменный смысл устойчивой Interaction подтверждён, но для одной новой Need хватит серверного разрешения ссылки через Revision. Контроль согласованности пока прикладной |
| Расширить Request Detail исходной Need и exact subject | **Сохраняется как кандидат будущего NID-first** (RI-08/SG-06 по применимости), не часть создания Need |
| Scoped discovery с фильтрацией до pagination, запрет скрытых IDs/counts | **Сохранить как security-принцип** для любого нового GET, но не как оправдание общего каталога |
| Негативные проверки authority и межсущностной совместимости | **Сохранить и сузить** до реальных операций Need; существующий POST Request отдельно не ослаблять |

Это исследование не отменяет полезные исходные выводы о независимости Need и PolicyRule, immutable exact Revision/AccessSubject, source-only `access.request`, несовпадении MOCK и REAL, защите Rule Detail и потенциальном source-existence oracle существующего POST Request. Последний остаётся отдельным вопросом hardening перед нелокальным использованием.

## 4. Выбор следующего вертикального среза

| Критерий | A. Создать полную Need | B. Только прочитать существующие Need | C. Потребность без Interaction |
|---|---|---|---|
| Пользовательский результат | Пользователь привязывает выбранную коммуникацию к **новому или существующему** Process и видит сохранённую связь | Виден ранее созданный/seeded Need, но новые Process невозможно связать с Need | Можно выразить намерение до выбора участников, если сначала утвердить иной доменный контракт |
| Вход | `processId` + выбранная existing Revision как селектор Interaction/source Component | `processId` | Process + новая бизнес-формулировка, без обязательных нынешних ссылок |
| Выход | Новая минимальная `needs` запись, уникальная по тройке, и авторизованный list/detail-in-tab | Список уже имеющихся `needs` | Новая форма неполной записи, не представимая текущей `needs` без изменения схемы |
| SQLite | **Малая миграция v2→v3**: UNIQUE индекс `(process_id,interaction_id,component_id)`, проверка существующих дубликатов, INSERT и demo-grants | Без миграции | Nullable FK/новая сущность/статус + миграция и новый контракт |
| FastAPI | Узкие Need list, candidate selection, create; не общий каталог | Один scoped Need GET | Новое сохранение и последующее завершение намерения |
| React | Вкладка «Потребности»: список и форма выбора существующей коммуникации | Вкладка: список и открытие связи | Отдельный жизненный цикл и UX незавершённости |
| Зависимость от отсутствующих каталогов | Только проверяемые Revision/Component из существующей SQLite, с техническими labels; не нужен полный Interaction CRUD | Существующая seeded Need; для честного описания всё равно нужны linked references | Требует предметного решения и будущего связывания |
| Миграционный риск | Небольшой, но реальный: UNIQUE индекс требует атомарной миграции и проверки исторических дубликатов | Низкий | Высокий |
| E2E / самостоятельная приёмка | Один write→read→restart плюс 401/403/404/422 и consistency; **проверяемое действие** | Один read→restart; недостаточен для новой связи | Более длинный flow с новой моделью |

**Выбор: A — минимальная Need, без AccessRequest.** Владелец подтвердил: `participant = source Component`, Interaction переиспользуется, тройка уникальна на уровне БД, `businessBasis` и lifecycle отложены. B не создаёт новой Need; C преждевременно меняет модель. Это функционально минимальная Need, а не полная сущность логической ERD.

## 5. Минимальный технический контракт A — предложение для review

Ниже **возможный** HTTP-контракт, не действующая API-спецификация. Имена маршрутов/permission окончательно принять перед OpenSpec:

| Метод | Путь | Вход → ответ | Ответственность |
|---|---|---|---|
| GET | `/business-processes/{processId}/needs?limit=20&offset=0` | → `{items:[{connectivityNeedId,processId,interactionId,componentId}],limit,offset,hasMore}` | Прочитать сохранённые Need данного Process; сортировка по ID, без ложных display facts и скрытых глобальных counts |
| GET | `/business-processes/{processId}/need-options` | → `{items:[{interactionRevisionId,interactionId,applicationId,sourceComponentId,destinationComponentId,ipProtocol,destinationPortStart,destinationPortEnd}]}` | Предоставить **только** разрешённые непротиворечивые селекторы коммуникации для создания Need, не все каталоги/Deployments/Resources |
| POST | `/business-processes/{processId}/needs` | `{interactionRevisionId:UUID}` → 201; при точном дубликате → 409 | В **одной write transaction** разрешить ссылки через Revision, проверить Process, направленность source и согласованность остальных Revision Interaction; сохранить `needs` под защитой UNIQUE индекса |

Привязка к Revision — **лишь способ выбрать Interaction при отсутствии отдельного Interaction GET**. Поле `interactionRevisionId` не хранится в Need. При нескольких ревизиях одной Interaction UI объединяет варианты по устойчивой Interaction/source роли; транспорт показывается как пример доступных revisions, но **не как свойство Need**. Если актуальная группировка семантически неоднозначна, сервер отклоняет выбор и не создаёт Need. Не обозначать TCP/443 как HTTPS и не объявлять несуществующий статус CURRENT/ACTIVE.

**Минимальное изменение кода будущего среза:**

- `storage.py`: добавить **user_version=3 и UNIQUE индекс** на `needs(process_id,interaction_id,component_id)` без новых таблиц/полей. Миграция v2→v3 должна проверять исторические дубликаты и отклоняться атомарно, не изменяя исходные записи. Сохранить v1→v2→v3, immutable triggers, обратную совместимость seed и повторный `init-demo`.
- `domain.py` / `use_cases.py`: авторитетная проверка в одной write-транзакции: Process, Revision, её source Component и Application, согласованность направленной роли всех Revision с тем же `interaction_id`, действующие grants и новый ID; INSERT под защитой UNIQUE; безопасно преобразовать конфликт в 409. Не создавать Request/Rule.
- `http.py`: три узкие операции с Pydantic Strict DTO, UUID, 1…100 limit/offset, единым error envelope, HTTP 409 для дубликата и `Cache-Control: no-store` для защищённых GET. Никакого нового универсального QueryService.
- `web/src/BusinessProcesses.tsx` и `api.ts`: заменить заглушку на REAL список и небольшую форму на вкладке; показывать **только подходящие варианты из авторизованного API**. Скрытие в UI не заменяет серверную проверку: подменённый POST должен быть отклонён. После 201 перечитать серверные данные; при ошибке не подменять MOCK. Смена actor/credentials очищает защищённое состояние. MOCK Simulation остаётся отдельной и необязательной.

**Предлагаемая политика доступа (нуждается в одобрении):** новый независимый `business.need.read` для GET списка и `business.need.create` для POST и узкого GET options, оба со scope `demo-business`; для связанных операций также требуется `business.process.read`. Сервер извлекает actor из доверенного bearer/local-demo proxy, использует существующий `grants` + validity window, один evaluation time и транзакционный snapshot. Только явно подготовленному demo actor добавляются эти действия. Ни `business.process.create`, ни `access.request`, ни ответственность организации **не дают** разрешения создавать Need.

Существующий scope `demo-business` покрывает локальный демонстрационный каталог, а не объектную авторизацию произвольных производственных Process и Communication. Нельзя распространять этот узкий read policy на защищённые каталоги без отдельного решения. Если даже технические IDs/traffic нельзя раскрывать demo субъекту, GET options должен оставаться закрыт до уточнения read authority (SG-01/SG-05). Permission names — кандидат, а не принятый контракт.

**HTTP негативные проверки:** без credential → 401; с действительным actor без требуемого action/scope или с истёкшим grant → 403 без защищённых полей и записи; неизвестный `processId` после авторизации → 404; некорректный UUID/body/лишнее поле/limit/offset → 422; **повторная тройка, включая выбор другой Revision той же Interaction, → 409**; отсутствующий/недоступный вариант Revision не раскрывает сторонние metadata и не создаёт Need (безопасная 404/422 семантика требует фиксации); несовпадающие роли, чужой Application, внутренне противоречивые revisions → отказ без INSERT, не «неполная Need». Для одного `interaction_id` проверять непротиворечивость participant pairs; после смены grant повторно авторизовать POST, не доверяя GET. Чтение Need неизвестного Process/чужого scope не должно раскрывать existence. Проверить отсутствие у нового API возможности подставить `actorId`/`grantId`/`scope`.

## 6. Один реальный E2E-критерий приёмки A

**Вход:** временная SQLite v2 с coherent `dev.py` seed: source/destination Components одного Application, одна Revision TCP/443, допустимая directed Interaction; явные grants на Process и Need. Реальный браузер, React и FastAPI, без `mock-*` и без сети production.

1. Авторизованный Requester открывает REAL `/business-processes` и **создаёт новый BusinessProcess**. Проверяет выданный сервером `processId`.
2. На его вкладке «Потребности» видит пустую реальную коллекцию, получает с сервера разрешённый вариант коммуникации (Interaction, исходная/целевая роль; техническая Revision как селектор), выбирает его.
3. Отправляет POST; сервер создаёт **одну Need** с FK на Process, устойчивой Interaction и исходным Component. Повторная попытка той же тройки (даже с другой Revision) возвращает 409; в другом Process эта же Interaction может использоваться. AccessRequest/Decision/Rule не создаются.
4. Пользователь обновляет страницу и повторно входит при необходимости; GET вкладки возвращает тот же Need ID и связи. Перезапускает backend против той же SQLite и убеждается, что данные сохранены.
5. Негативные тесты: 401/403/404/409/422, истечение grants, подменённая Revision, несовпадение Application/source роли, несовместимые revisions одной Interaction, конкурентное создание одинаковых Need без дублей, отсутствие скрытых IDs/частичных INSERT. Миграция v2→v3 безопасно отвергает исторические дубли, а старый Request/Decision/Rule regression suite остаётся зелёным.

**Acceptance:** новое пользовательское действие создаёт устойчивую корректную связь; после reload/restart она воспроизводится без памяти React; серверная authority обязательна; ни один MOCK объект не участвует. Это **не** доказательство завершённости полного NID-first Request flow.

## 7. Сознательно отложено

- Создание AccessRequest из Need, выбор exact Revision и source/destination Deployments для Request, весь workflow ALLOWED/DENIED/PolicyRule и общий Rule catalog.
- Отдельная persisted Interaction, каталоги Interaction/Revision/Resource/Application, full CRUD, расширение Request DTO и RequestContextQueryService из #38.
- Новые Need.description/title/businessBasis, отображаемые имена других каталогов, `ACTIVE/RETIRED`, destination-initiated Needs, состояние черновика, nullable FK и целевая миграция ERD. **Уникальность тройки в текущем срезе обязательна.**
- Общий Visibility UX M-11 (DEFERRED, не PASS), production IAM, сетевые проверки и автоматическое применение политики.
- Issue #36: отдельный Rule Detail/export scope. Existing grants `access.request`, `access.decide`, `policy.export` остаются в силе.

При переходе к следующему полноценному NID-first срезу повторно открыть вопрос read disclosure destination metadata, Request detail `connectivityNeedId`/exact subject (SG-06), Revision/deployment compatibility и существующего source-existence oracle POST Request. Не переписывать их решения сейчас.

## 8. Вопросы владельца и риски

| Приоритет | Решение или риск | Что необходимо до реализации |
|---|---|---|
| **P0** | Некорректный вариант создаёт Need со ссылкой на несогласованную Interaction/Component; либо GET раскрывает чужие Communication IDs | Обязательные server-side consistency и scope/field checks + отрицательные тесты; security не переносится вместе с M-11 |
| **РЕШЕНО** | Need = `(Process,Interaction,source Component)`; одинаковая тройка запрещена, `businessBasis` отложен | В OpenSpec описать SQLite UNIQUE и 409 для дубликата; разные Process свободно переиспользуют Interaction |
| **P1 — решение владельца** | Можно ли разрешать Interaction через существующую Revision до отдельного persisted Interaction? Какие поля кандидатов видит demo requester? | Утвердить технический selector и правила отклонения неоднозначных revisions; ограничить раскрытие фактов |
| **P1 — решение владельца** | Новые действия `business.need.read/create` на `demo-business`, а также required `business.process.read` | Подтвердить authority boundary и подготовку demo grants; не расширять существующие `business.process.create`/`access.request` |
| **P1** | Отсутствие человекочитаемых имён Component/Interaction и Need делает выбор непонятным при множестве вариантов | На первой итерации использовать только реальные ID/направление/traffic; не копировать MOCK labels. При провале приёмки отдельно согласовать minimal display migration |
| **P2** | Физическая база не содержит отдельного Interaction FK, а revisions могут противоречить друг другу | Проверять прикладным кодом в транзакции. Новые межконтекстные FK/триггеры направленности не нужны для этого среза; уникальность BC-Need гарантирует SQL-индекс |
| **P2** | Иммутабельную Need нельзя исправить или удалить; lifecycle не реализован | Повторные тройки блокирует UNIQUE индекс. Retire/edit и управление историей требуют отдельного среза |
| **P3** | Технические идентификаторы в первом UI | Отложить улучшение подписей до подтверждения значимости |

**Вердикт: READY FOR ARCHITECTURE REVIEW.** Владелец принял направление A, source-only participant, DB-уникальность тройки, переиспользование Interaction и отложенные `businessBasis`/lifecycle. Отдельные `business.need.read/create` и `business.process.read` остаются рекомендуемой границей локального demo, точные правила для OpenSpec. Этот Draft PR фиксирует только исследование, без реализации.

## 9. Граница проверки документа

Проверяемое состояние — `main` @ `0a32b34954aef610e450076dbffe16d8e08c41f7`; предложенные API, grants и поля в разделах 4–8 **не реализованы**. Документ не требует исправления старого Issue #37 задним числом. Историческая версия #38 была read-path исследованиями 2026-11-09; её полезные invariants/security findings включены выше, а большой Request composition план перенесён в отложенные задачи.
