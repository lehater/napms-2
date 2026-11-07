# NAPMS — карта пользователей и сквозных сценариев

**Статус:** исследовательская реконструкция, PARTIAL; продуктовые процессы NAPMS 1.0 не автоматически приняты NAPMS 2.0. Ревизии N1 `42481577fab7f795cf3a2118b7b6f1c3c075d066`, N2 `9713c89bada6573bda2f60c97fb45deda48f5909`.

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

## J03. Изменить разрешённую коммуникацию, не потеряв старое разрешение

**Вход:** действующий доступ R1 TCP/443, предлагаемая новая Revision R2 TCP/8443. **Роли:** куратор, заявитель, решающий субъект. **Связи:** C07 C16 C17.

1. Автор создаёт immutable R2, не редактируя R1.
2. Подаёт изменение для уже действующей пары; PENDING показывает R1 effective, R2 proposed.
3. При REJECTED R1 остаётся действующим; при ACCEPTED целевая семантика переходит на R2 с сохранением истории, если модель допускает этот переход.
4. Явный withdraw/inactive — отдельный акт; старый Accepted не должен незаметно восстановить access.

**Выход:** версия, решение и текущая эффективность не смешаны. **Статус:** **P0 unresolved**: исторический 1.0 PolicyRule определялся парой deployment, текущий 2.0 rule — exact subject **включая ревизию**; прямое отображение одного Rule с «переключением revision» недопустимо до решения владельца. До этого UI показывает только историю запросов/правил с меткой *концепция под review*. **Источники:** [docs-legacy/requirements/access-policy-core.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/access-policy-core.md), [docs-legacy/requirements/access-governance-g1.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/access-governance-g1.md), [openspec/specs/access-decisions/spec.md](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/openspec/specs/access-decisions/spec.md).

## J04. Разрешённый доступ → объяснимый vendor-neutral export

**Вход:** ALLOWED и effective PolicyRule; actor с `policy.export` на требуемых scopes; адресная реализация и traffic revision. **Роль:** оператор политик. **Связи:** C18.

1. Выбрать актуальную политику/Rule (в N2 API сейчас selected Rule); проверить authority до раскрытия деталей.
2. По одному coherent snapshot/evaluationAt получить Resource/Endpoint identities, traffic, decision & Need provenance, current addresses.
3. Строка с обеими адресами — **READY**; отсутствующий адрес — **INCOMPLETE** с nullable address и сохранённой семантикой. INCOMPLETE не является исполнимым firewall permit.
4. Таблица и JSON/CSV выражают ту же выбранную желаемую политику. Устаревший Resource IP меняет только технический результат следующей оценки.

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
3. В режиме «Проверка коммуникации» принимает технический tuple и logical asOf. Коррелирует к Resource/Endpoint/Component и показывает **несколько** совпадений, `ambiguous`, `unknown`, `historical`, а не выбирает произвольный.
4. Показывает подозреваемые enforcement targets, снимки evidence и их freshness/provenance; не заявляет доказанный путь без отдельного источника.
5. Переходы в Resource detail, Need, Request, Rule, Evidence snapshot, reconciliation сохраняют смысл исходного запроса и scope/read authority.

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
