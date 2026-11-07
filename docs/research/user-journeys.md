# NAPMS — карта пользователей и сквозных сценариев

**Статус:** исследовательская реконструкция, PARTIAL product acceptance; корпус источников проверен 180/180; продуктовые процессы NAPMS 1.0 не автоматически приняты NAPMS 2.0. Ревизии N1 `42481577fab7f795cf3a2118b7b6f1c3c075d066`, N2 `9713c89bada6573bda2f60c97fb45deda48f5909`.

## Роли, цели и границы

| Роль (рабочее название) | Цель и наблюдаемый результат | Раздельная ответственность |
|---|---|---|
| Куратор ресурсов / оператор каталога | Ресурсы, адреса, ответственности и история корректны | Редактирование Resource ≠ право решить сетевой доступ |
| Куратор коммуникационных профилей | Повторно используемый Application с Component, Interaction и revision | Профиль ≠ конкретная инсталляция и не inventory продукта |
| Владелец бизнес-процесса | Обоснование Need, статус и критичность | Need ≠ permission |
| Ответственный за исходный ресурс (заявитель) | Выбрать разрешённый scope и запросить коммуникацию | Responsibility ≠ `access.request` grant; admission ≠ ALLOWED |
| Решающий субъект / интеграционный решатель | Вынести доверенное ALLOWED или DENIED | Отдельный `access.decide` grant; не следует автоматически из владельца destination |
| Сетевой/политический оператор | Проверить policy export, поставленные ACL, план и результат исправления | Полномочия экспорта ≠ полномочия mutation |
| Инженер расследований / ИБ | Понять техническую коммуникацию, источник доказательств и расхождение | Наблюдение ≠ бизнес-потребность ≠ разрешение |
| Администратор источников/полномочий | Настроить источники, безопасную область доступа и качество данных | Идентификация пользователя ≠ автоматическая выдача грантов |

Первое подтверждение ролей — [docs/discovery/first-mvp-hcd-user-needs.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/discovery/first-mvp-hcd-user-needs.yaml), источник более широких ролей — [docs-legacy/requirements/web-ui-requirements.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/web-ui-requirements.md). Все формулировки назначения ролей за пределами First MVP — product hypothesis для согласования, а не готовая IAM-модель.

## Единый предмет сценариев

NAPMS хранит и связывает каталоги, авторитетные решения и состояния, затем преобразует **декларированные разрешённые коммуникации** в требуемую техническую политику конкретной NST и результат проверки её реализации. J01–J08 — пользовательские способы работы с одними и теми же фактами, не отдельные модели их идентичности и authority.

Для **намеренного запроса открытия** необходимы BusinessProcess и ConnectivityNeed; `Interaction/InteractionRevision` сохраняют семантику N1. **Три разные задачи:** запросить открытие; получить `DENIED` по заявке; запросить прекращение ранее разрешённого доступа. Третья остаётся **unresolved/not accepted N2** (J03, X01/X03); DENIED и технический DENY не заменяют отзыв.

Декларированная политика содержит разрешённые коммуникации. `TargetRequiredPolicy` по NST, `ConfiguredEffectivePolicySnapshot` и `Realized/Drift/Uncomparable` — отдельные стадии; технические DENY допустимы лишь как детали NST-адаптации с доказанной семантической эквивалентностью. J07 остаётся гипотетическим mock-сценарием, а не доказанной работающей сетевой операцией.

## J01. Каталоги → бизнес-потребность (подготовка предмета запроса)

**Вход:** описание сетевой коммуникации, два ресурса, организационный контекст. **Пользователь:** куратор профиля, куратор ресурсов, владелец процесса. **Зависимости:** C01–C11.

1. Создать два стабильных Resource со scope и разными ответственными; создать логические Endpoint, назначить адреса, сохранить историю и `Unknown` при отсутствии адреса.
2. Найти существующий Application communication-profile по ролям/traffic или создать профиль; определить два Component и направленный Interaction с immutable revision (например TCP destination 443).
3. Зафиксировать два конкретных ComponentDeployment: каждый Component на своём Resource. Профиль остаётся переиспользуемым.
4. Описать BusinessProcess и Process-backed ConnectivityNeed для одного Interaction. Need принадлежит бизнес-основанию и не содержит IP или deployment identity; один Need может приводить к нескольким запросам.
5. Просмотреть цепочку в resource detail: Resource → Deployment → Component → Interaction → Process/Need. Ничего не считать автоматически разрешённым.

**Выход:** согласованный граф предмета доступа со стабильными идентичностями. **Статус:** 1.0 current runtime в основных каталогах подтверждён; 2.0 first-slice содержит demo fixture, но полного CRUD/UI нет. **Источники:** [docs/requirements/first-mvp-product-requirements.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/requirements/first-mvp-product-requirements.yaml), [docs/model/tasks/application-components-task-model.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/tasks/application-components-task-model.yaml), [docs/model/use-cases/resource-catalogue-curation.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/use-cases/resource-catalogue-curation.yaml), [web/src/app/router.ts](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/web/src/app/router.ts). Историческое упрощение Resource с одним AddressSpace рассмотрено отдельно в gaps.

## J02. Намеренная коммуникация → запрос → решение → правило

**Вход:** actor, источник под его `access.request` на исходном Resource, выбранная технически возможная пара Deployments, точная InteractionRevision, действующая Need. **Роли:** заявитель и независимый decider. **Зависимости:** J01, C12–C17.

1. Заявитель входит в «Связи» либо открывает свой Resource, видит источники, для которых имеет effective `access.request` (ответственность за Resource сама по себе этого не даёт).
2. Backend/проектируемый UX предлагает допустимые destination Resource и смысл/порты на основе ComponentDeployment и направленной Interaction; пользователь выбирает Process-backed Need. Сторона назначения может принадлежать другой группе; source-only authority достаточно для *подачи*.
3. При подаче фиксируются exact `AccessSubject(sourceDeployment, destinationDeployment, InteractionRevision)`, Need, actor и admission time. Получается **PENDING** без PolicyRule.
4. Отдельный доверенный решатель видит pending request и делает **ALLOWED** либо **DENIED**. Неправомочный запрос действия отвергается как authorization error, а не DENIED результата политики.
5. DENIED сохраняет историю, создаёт **0 Rule**; ALLOWED создаёт либо переиспользует канонический PolicyRule по exact subject, изначально Active. Повторный ALLOWED другого Request не создаёт дубль; DENIED нового Request не удаляет старый Allowed Rule.
6. Заявитель видит принятый факт, происхождение, состояние policy и ссылку на ресурс. Изменение IP не изменяет предмет решения.

**Выход:** независимо объяснимые admission, permission и policy effectiveness. **N2:** реализовано Web UI над backend; текущая форма требует четыре UUID, тогда как HCD 1.0 ориентирована на смысловой выбор. Это UX-gap, не повод изменять backend в исследовательском PR. **Источники:** [docs/model/use-cases/access-request-human-journey.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/use-cases/access-request-human-journey.yaml), [docs/model/tasks/access-request-task-model.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/tasks/access-request-task-model.yaml), [openspec/specs/access-requests/spec.md](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/openspec/specs/access-requests/spec.md), [openspec/specs/access-decisions/spec.md](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/openspec/specs/access-decisions/spec.md), [openspec/specs/access-requests-web-ui/spec.md](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/openspec/specs/access-requests-web-ui/spec.md).

## J03. Изменить traffic revision / запросить прекращение доступа — разные задачи

**Вход:** действующее Rule для exact AccessSubject с immutable revision R1 TCP/443; предложена R2 TCP/8443. **Роли:** куратор, заявитель, решающий субъект. **Связи:** C07 C16 C17. **Статус:** исследовательская hypothesis для будущего lifecycle; не исполняемый сценарий UX-0.

1. Автор создаёт immutable R2, не редактируя R1. При тех же Deployments R2 задаёт **другой AccessSubject**, а не новую ревизию существующего Rule.
2. Новая принятая подача создаёт самостоятельный PENDING Request для subject с R2. Она не изменяет Rule для R1.
3. ALLOWED создаёт либо переиспользует Rule exact subject R2; DENIED не создаёт Rule и не прекращает ранее разрешённый доступ R1. Автоматическая замена или выключение R1 не следуют из нового решения.
4. Для одного exact subject повторный ALLOWED переиспользует ruleId; если Rule уже INACTIVE, он не становится ACTIVE автоматически. INACTIVE описывает состояние Rule и исключение из effective export, но не определяет пользовательскую процедуру отзыва.

**Отдельная пользовательская задача: «Запросить прекращение доступа».** Пользователь хочет прекратить ранее разрешённую коммуникацию и понять результат. Механизм отзыва **unresolved / not accepted N2**: кто вправе запросить и подтвердить прекращение, какой объект прекращается, как фиксируются переход и сетевой результат, ещё не принято. Новый DENIED, INACTIVE и изменение InteractionRevision не являются взаимозаменяемыми действиями. Наличие состояния INACTIVE не доказывает принятого revoke API/workflow и не подтверждает удаление доступа в сети.

**Граница:** исторический pair-based Rule/RuleChange со сменой effective revision и withdrawal не переносится в N2. X01/X03 требуют решения владельца о будущем lifecycle; принятая exact-subject идентичность сохраняется. В UX-0 нет исполняемых действий изменения Rule или отзыва; возможна только отдельная подпись hypothesis. **Источники:** [исторический AP](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/access-policy-core.md), [N2 решения и идентичность](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/openspec/specs/access-decisions/spec.md), [N2 INACTIVE и export](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/openspec/specs/policy-export/spec.md).

## J04. Разрешённый доступ → объяснимый vendor-neutral export

**Вход:** ALLOWED и effective PolicyRule; actor с `policy.export` на **обоих выбранных source и destination Resource scopes**; адресная реализация и traffic revision. **Роль:** оператор политик. **Связи:** C18.

1. Выбрать актуальную политику/Rule (в N2 API сейчас selected Rule); проверить authority до раскрытия деталей.
2. По одному coherent snapshot/evaluationAt получить Resource/Endpoint identities, traffic, decision & Need provenance, current addresses.
3. Строка с обеими адресами — **READY**; отсутствующий адрес — **INCOMPLETE** с nullable address и сохранённой семантикой. INCOMPLETE не является исполнимым firewall permit.
4. JSON/CSV сохраняют одинаковую семантику полей; в N2 отдельные запросы выполняют отдельные current evaluations, при отсутствии изменений данные эквивалентны. Таблица — UX candidate. Исторический immutable full export artifact с exportId/TTL не принят N2 (см. QREQ-CONS-004/005 в traceability). Изменение Resource IP меняет технический результат следующей оценки.

**Выход:** explainable desired policy; он не означает, что ACL уже установлен. **Источники:** [docs/model/use-cases/policy-export-human-journey.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/use-cases/policy-export-human-journey.yaml), [docs/requirements/first-mvp-product-requirements.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/requirements/first-mvp-product-requirements.yaml), [openspec/specs/policy-export/spec.md](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/openspec/specs/policy-export/spec.md). В старом [docs-legacy/requirements/policy-export-core.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/policy-export-core.md) missing address приводил к общему unresolved; для N2 принят иной контракт.

## J05. Сеть / трафик → наблюдения → распознаваемая коммуникация

**Вход:** capture firewall config, NetFlow/IPFIX, imported file, `EvidenceSource`, scope, source observation time, record time, completeness. **Роль:** сетевой аналитик. **Связи:** C21–C25.

1. Источник/collector получает данные, сохраняет capture identity и происхождение. Retry одинакового capture идемпотентен, разный payload под тем же идентификатором — конфликт.
2. Технический parser переводит source-specific факты в точный нормализованный `TechnicalAccessEvidenceSet` без ложного расширения/сужения; `Configured`, `TrafficDerived`, `Imported` — разные классы evidence.
3. Recognition сопоставляет наблюдаемые source/destination addresses/protocol/ports с Resource, Deployment, ACC. Возвращает `recognized / ambiguous / unresolved` с кандидатами и причинами.
4. Если Process/Need неизвестен, кандидат остаётся техническим фактом. Ответственный пользователь может атрибутировать business basis, но **observed traffic не превращается в approval**.
5. После явного выбора Need и проверки authority кандидат может быть началом обычного J02 — без обхода ALLOWED/DENIED.

**Выход:** данные об обнаруженной коммуникации, степень уверенности, неизвестные отношения и связь с заявкой. **Статус:** историческая/не входящая в N2 MVP возможность, работающий collector с реального устройства не доказан. **Источники:** [docs-legacy/requirements/technical-access-evidence-core.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/technical-access-evidence-core.md), [docs-legacy/domain/technical-access-evidence/tactical-model.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/domain/technical-access-evidence/tactical-model.md), [docs/horizontal/s1/capability-requirements.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/horizontal/s1/capability-requirements.md), [docs-legacy/requirements/business-connectivity-g1.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/business-connectivity-g1.md).

## J06. Начать со своего Resource или с технического tuple: Connectivity / Checker

**Вход A:** ResponsibilityScope (при подтверждённом read grant). **Вход B:** source IP, dest IP, protocol, port/range, `asOf`. **Роли:** ответственный ресурсного scope, сетевой инженер, ИБ. **Связи:** C19 C20 C27 C35.

1. В режиме «Связи» система строит в выбранной области Resource → Deployments → outgoing/incoming communication relationships; ресурсы без связей остаются видимыми.
2. Для связи отдельно показывает `Needed`, `Proposed`, `Allowed`, `Effective`, `Configured`, `Realized` и пояснение Unknown — это не один цветной итоговый статус.
3. Историческая цель Checker принимает технический tuple и logical `asOf`; **UX-0 использует current-only mock**, без исторического replay. Коррелирует к Resource/Endpoint/Component и показывает **несколько** совпадений, `ambiguous`, `unknown`, `historical`, а не выбирает произвольный.
4. Показывает **MOCK** enforcement candidates и evidence с отдельными временем, freshness и provenance. NEP по ADR-018 — current-only, без `asOf` и исторических routing snapshots. Для неподдерживаемого исторического измерения показывать `Unknown` или `Historical data unavailable`; современные candidates не подставляются в исторический результат. Даже current candidates не доказывают маршрут. Временная согласованность всей исторической композиции остаётся открытой.
5. Переходы в Resource detail, Need, Request, Rule, Evidence snapshot, reconciliation сохраняют смысл исходного запроса и scope/read authority.

**Источники временной границы:** [Checker REQ-CHK-010](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/traffic-analysis-checker.md#L100), [NEP ADR-018 current-only](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/decisions/ADR-018-nep-firewall-current-state-candidate-model.md#L48).

**Выход:** объяснимая диагностика с переходами по источникам данных. **Статус:** восстановлено из исторических requirements/UI; нельзя считать текущей реализацией N1/N2. **Источники:** [docs-legacy/requirements/scoped-connectivity-inventory.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/scoped-connectivity-inventory.md), [docs-legacy/requirements/traffic-analysis-checker.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/traffic-analysis-checker.md), [docs-legacy/ui/checker.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/ui/checker.md), [docs-legacy/architecture/network-context-candidate-boundary.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/architecture/network-context-candidate-boundary.md).

## J07. Желаемая политика → устройство → сравнение → исправление → повторная проверка

**Вход:** effective rules, complete deployment/address truth, selected enforcement target/locator candidates, снимок конфигурации с валидными semantics/completeness/freshness. **Роль:** сетевой оператор. **Связи:** C26–C34.

1. NEP показывает 0..N возможных firewall/ACL locators и provenance; отсутствие доказанного пути не превращается в «все устройства обязаны применить правило».
2. RPM строит `TargetRequiredPolicy` из effective Rule, ACC Revision, Deployment, Resource и applicable placement; missing/ambiguous mapping → **Unresolved** (не пустой permit set).
3. Provider Interpreter получает source-native config (objects, order, deny/default), публикует `ConfiguredEffectivePolicySnapshot` только с обоснованными scope, completeness/freshness и semantic equivalence; сырые ACL-строки не используются напрямую для сравнения.
4. APR сравнивает **только comparable complete** `required` и `configured`: `common = intersection`, `missing = required minus configured`, `excess = configured minus required`; результат `Realized / Drift / Uncomparable`. Нет доверенного snapshot → Uncomparable, а не «нет правил».
5. На `missing` может появиться *аддитивный* `VerifiedChangeIntent(ENSURE-PERMIT)`; `excess` идёт в audit/report, не в автоматическое удаление.
6. Provider Renderer проверяемо создаёт конкретный TargetPolicyArtifact/digest. NEO отдельно проверяет mutation grant, preconditions, stale revision и выполняет операцию. Stub-сценарий допускается только с явной меткой SIMULATED.
7. `Applied`/immediate post-check — результат операции, **не convergence**. После независимого нового capture/interpretation происходит повторный APR; новое `missing/excess` определяет фактический итог.

**Выход:** объяснимая цепочка от требуемого к наблюдаемому, плану и проверке; может остаться Drift/Uncomparable. **Статус:** future/candidate на основе исторических контрактов и N1 strategic future; N2 не принял реализацию. **Источники:** [docs-legacy/decisions/ADR-020-required-policy-materialization-is-derived-composition.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/decisions/ADR-020-required-policy-materialization-is-derived-composition.md), [docs-legacy/decisions/ADR-021-provider-policy-interpretation-and-rendering-boundaries.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/decisions/ADR-021-provider-policy-interpretation-and-rendering-boundaries.md), [docs-legacy/requirements/access-policy-realization-mvp.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/access-policy-realization-mvp.md), [docs-legacy/requirements/provider-policy-renderer-mvp.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/provider-policy-renderer-mvp.md), [docs-legacy/requirements/network-environment-operations.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/network-environment-operations.md).

## J08. Проверить риски, историю и интеграционные источники

**Вход:** inventory/process/policy/evidence snapshots, история решений, источники внешней identity/CMDB (если подключены). **Роли:** owner, ИБ, администратор. **Связи:** C35–C38.

1. Открыть trace от Process/Need к Resource, Rule, technical evidence и определить зависимости/изменённые связи (impact — кандидат, правила расчёта и показатели не утверждены).
2. Найти изменения состояния, missing provenance, expired captures, unknown owners, отказанные операции; не скрывать неизвестную полноту.
3. Если enterprise source выбран, показать provenance, source-of-truth owner и mapped/unmapped/ambiguous внешние references; внешняя роль не даёт NAPMS business authority автоматически.
4. Сформировать наглядные mock views без заявления о существующем reporting API, scheduler или системных интеграциях.

**Выход:** качественная обратная связь и список проблем данных. **Статус:** candidate/optional; источники [docs-legacy/requirements/enterprise-identity-authoritative-sources.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/enterprise-identity-authoritative-sources.md), [docs/horizontal/s0/user-journeys.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/horizontal/s0/user-journeys.md).

## Проверка границ пользователя и системы

- Сценарии **J01/J02/J04** образуют доказанный первый концептуальный контур и частично реализованы N2, но frontend N2 пока предоставляет только J02 через UUID-поля.
- **J05/J06/J07** основаны на 1.0 target/historical contracts, а не на текущем живом сборе реальных данных.
- **J03** ограничен P0 противоречием идентичности Rule. **J08** частично представляет возможность, частично будущую UX гипотезу. Отсутствие требования к BPMN или approval workflow не означает отсутствия Process и решения — это разные уровни.

## Уточнения сценариев по завершённой проверке источников

Число journeys остаётся **8**. Новые evidence встроены как ветви существующих задач; это candidate/historical уточнения из [AUD-001–018 и QREQ](product-requirements-traceability.md), без принятия N2.

- **J01:** разделять server-owned IDs и ввод external correlation; terminal retirement/dependency blockers только historical hypothesis. Для detail показывать current/history, empty-current/404/error, field errors и stale conflict отдельно. Несколько Interaction reasons на одной паре допустимы в modern N1; старое one-per-pair не применять (X11).
- **J02:** source-only admission остаётся N2 baseline, несмотря на найденные stale both-scopes clauses N1 (X09). Keyboard/focus/labels и состояния editor не должны зависеть от цвета. Mock не должен воспроизводить production identity из dev credentials.
- **J03:** ограничение «один Pending на Rule» относится к historical pair-based aggregate, **не** к числу N2 AccessRequests. Не обещать in-place revision switch, автоматическое withdrawal/regrant или каталожный retirement до решения.
- **J04:** distinguish coherent result completeness и row technical readiness. Historical immutable exportId/TTL и same-result CSV — отдельная гипотеза; не утверждать, что нынешний N2 её реализует.
- **J05:** одинаковый source+capture retry сохраняет прежние IDs/time; duplicate source records сохраняются. Один unfaithful item исключает complete capture, empty capture не отсутствие доступа. NEP и TAE acquisition могут иметь разные capture time/schedules.
- **J06:** trusted Resource base row остаётся при отказе enrichment с Unknown только в затронутой колонке; authority failure всё ещё закрывает protected read. Resource-group paging и bounded children явны. Current-only NEP результат нельзя выдавать за исторический asOf Checker.
- **J07:** показывать все ECMP/VRF local branches, distinct ACL union и override reason. Include > Exclude > Routing — historical target, no current state означает skipped с diagnostic, а не доказанное отсутствие firewall. Prefix-to-target unresolved не раскрывать в hosts.
- **J08:** recovery/health/diagnostics различают process alive и ready; source failure не business denial. NoneKnown justification отличается от Unknown. Нет доказательства monitoring KPI, production backup objectives или enterprise acceptance.

Прямые первичные ссылки для каждой ветви находятся в AUD/QREQ и A001–A108; реализация и пользовательская успешность этих ветвей не заявляются.
