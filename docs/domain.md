# NAPMS 2.0 — минимальная доменная модель

**Статус:** REVIEW READY; **Confirmed** ниже означает подтверждение источниками NAPMS 1.0, не автоматическое принятие в 2.0.
**Зафиксированный источник:** `lehater/napms@42481577fab7f795cf3a2118b7b6f1c3c075d066`.

## Сущности и ответственность — Confirmed (исходный NAPMS)

| Понятие | Ответственность и идентичность | Основные отношения |
|---|---|---|
| **Resource** | Стабильная логическая единица управления доступом; identity независима от IP; имеет immutable AuthorityScopeRef | Содержит логические Endpoint |
| **ResourceEndpoint** | Логическое сетевое присутствие со стабильной identity, даже если адрес отсутствует | Принадлежит Resource; текущий HOST либо PREFIX |
| **Application** | Многократно используемый **профиль сетевой коммуникации**, не конкретный программный продукт | Содержит роли Component |
| **Component** | Роль участника коммуникации в пределах одного Application | Участвует в направленных Interaction |
| **Interaction / InteractionRevision** | Устойчивая причина направленной связи; revision фиксирует неизменяемую traffic semantics | Source/destination Components одного Application; TrafficClause |
| **ComponentDeployment** | Конкретный экземпляр размещённого Component на одном Resource | Ссылается на Component и Resource, независимо от IP |
| **BusinessProcess** | Описывает бизнес-процесс и ответственность | Имеет ConnectivityNeed |
| **ConnectivityNeed** | Обоснование потребности в коммуникации; не разрешение | Связывает Process, Interaction и participant Component, независимо от IP/deployment |
| **AccessRequest / AccessSubject** | Конкретный запрос и неизменяемый предмет решения | Subject = source Deployment + destination Deployment + exact InteractionRevision |
| **PolicyRule** | Единственная авторитетная текущая сущность доступа на один exact AccessSubject | Возникает только из ALLOWED; имеет состояние, окно эффективности, evidence и justification |
| **AuthorityGrant / Effective Authority** | Право actor выполнить action в scope в конкретный момент | Проверяется отдельно от BusinessNeed, Resource responsibility и ALLOWED |
| **Policy Export** | Производная, read-only материализация желаемой политики | Выбирает effective PolicyRule; соединяет идентичности, traffic, текущие адреса и provenance |

Источник: [docs/model/strategic/bounded-contexts.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/strategic/bounded-contexts.yaml) и соответствующие доменные файлы:
[docs/model/contexts/resource-catalogue/domain-model.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/contexts/resource-catalogue/domain-model.yaml),
[docs/model/contexts/application-communication-catalogue/domain-model.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/contexts/application-communication-catalogue/domain-model.yaml),
[docs/model/contexts/application-deployment/domain-model.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/contexts/application-deployment/domain-model.yaml),
[docs/model/contexts/business-connectivity/domain-model.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/contexts/business-connectivity/domain-model.yaml),
[docs/model/contexts/access-policy/domain-model.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/contexts/access-policy/domain-model.yaml),
[docs/model/contexts/authority-management/language.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/contexts/authority-management/language.yaml).

Список отражает **предметные понятия**. Он не предписывает отдельный агрегат, модуль, сервис, таблицу или Bounded Context на каждую строку.

## Минимальная цепочка смысла

`Application → Component → Interaction@Revision` описывает **что и почему передаётся**.

`ComponentDeployment → Resource → Endpoint → текущий AddressRealization` описывает **где это размещено сейчас**.

`BusinessProcess → ConnectivityNeed` объясняет **зачем** нужна коммуникация.

`AccessRequest → ALLOWED/DENIED → PolicyRule` фиксирует **кто запросил, что разрешено и какое желаемое состояние сохраняется**.

`PolicyRule + current realization + traffic + authority + provenance → Export` отвечает **какая политика эффективна сейчас и насколько она технически материализована**.

Это семантический путь; порядок и границы программных модулей отдельно не утверждены.

## Бизнес-инварианты — Confirmed (источник)

| ID | Правило, контрпример | Источник |
|---|---|---|
| D-01 | Resource/Endpoint identity переживают смену или отсутствие IP; нельзя пересоздавать Resource при смене адреса | REQ-RES-001..003 |
| D-02 | Endpoint имеет не более одной текущей реализации HOST **или** PREFIX; ресурс может иметь несколько Endpoint только как одну логическую единицу | REQ-RES-003..004 |
| D-03 | Application — профиль, Component — его роль, а Interaction соединяет только Components *одного* Application; межпрофильная связь недопустима | REQ-APP-001..002, REQ-INT-001 |
| D-04 | Две независимые причины связи одной пары Components могут иметь разные Interaction; revision traffic неизменяем | REQ-INT-002..003; ACC domain |
| D-05 | Deployment identity = конкретные Component и Resource; смена адреса не меняет placement identity | REQ-DEP-001 |
| D-06 | ConnectivityNeed опирается на Process и Interaction, но не создаёт permission; уход Need не переписывает решения и автоматически не отбирает Rule | REQ-BUS-001..007 |
| D-07 | Право **подать запрос** по source-scope отдельно от последующего ALLOWED/DENIED; отказ на admission ещё не решение DENIED | REQ-AUTH-001, REQ-PERM-001 |
| D-08 | DENIED не создаёт Rule; ALLOWED для точного AccessSubject создаёт/разрешает **один** Rule; повторение не дублирует | REQ-PERM-003, REQ-RULE-001 |
| D-09 | Изменение семантики AccessSubject требует нового решения; изменение адреса, Additional Need или operational state не меняет identity/историю Rule | REQ-PERM-002, REQ-RULE-003..005 |
| D-10 | Effective export: только ALLOWED + Active + satisfied effective conditions на одном evaluation time; неэффективные Rule не дают строк | REQ-EXP-002..003, REQ-EXP-006 |
| D-11 | Экспорт требует полномочий для выбранного scope; один согласованный снимок; результат сохраняет traffic, identities, provenance | REQ-AUTH-002, REQ-EXP-003..004, REQ-PROV-001 |
| D-12 | Отсутствие текущего адреса у effective Rule даёт строку **INCOMPLETE** с идентичностью Resource и null адресом; нельзя молча убрать Rule или выдавать permit READY | REQ-EXP-005, REQ-EXP-007 |
| D-13 | Ответственность OWNER/ADMINISTRATOR, Site или business criticality сами по себе **не** дают security authority | REQ-RES-005; RC domain; AM language |

Ссылки на идентификаторы REQ: [docs/requirements/first-mvp-product-requirements.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/requirements/first-mvp-product-requirements.yaml). Дополнительная трактовка: [docs/model/use-cases/first-mvp-policy-export.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/use-cases/first-mvp-policy-export.yaml); [docs/model/strategic/context-relationships.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/strategic/context-relationships.yaml).

## Незакрытые вопросы и противоречия

- **P0 / Question — request authority scope.** `REQ-AUTH-001` требует `access.request` для **source Resource**, не destination. Но [docs/model/contexts/access-policy/domain-model.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/contexts/access-policy/domain-model.yaml) описывает `RequestAuthorityEvidence` как покрывающее «every participating Resource AuthorityScopeRef». Возможны разные чтения (все участники vs source-only). Утверждать второе как исправление источника **нельзя** без решения; приоритет в исследовании имеет принятое продуктовое требование, но требуется явное согласование перед реализацией.
- **P1 / Question — доверенная permission decision.** Нужен договор о том, откуда возникает легитимный ALLOWED/DENIED и кто имеет право его зафиксировать. Старый first MVP не описывает механику внутреннего approval/review (она указана как non-goal).
- **P1 / Question — инвариант snapshot.** Зафиксировать observable guarantee согласованного snapshot/evaluationAt; прежние `PostgreSQL REPEATABLE READ` и `transaction_timestamp()` относятся к старому дизайну, не к продуктовой модели.
- **P1 / Candidate — объём adoption.** Полнота старого REQ набора не означает, что все его детали должны войти в первый вертикальный срез 2.0. Изменение области должно быть согласовано, не подменено молчаливым упрощением.

## Исключено из переноса

Старые Bounded Context boundaries, aggregate decomposition как обязательная структура приложения, persistence schema, API, OIDC integration, Harness Authority/Capability graph, workflow tooling и тестовые/миграционные механизмы. **Исключается привязка к реализации, а не необходимость соблюдения признанных доменных смыслов.**
