# NAPMS 2.0 — предварительная информационная архитектура и единый UX mock

**Статус:** DRAFT RESEARCH / не утверждённая navigation specification. **Без реализации:** не создавать код, компоненты frontend, backend или OpenSpec. Evidence baseline: N1 `42481577fab7f795cf3a2118b7b6f1c3c075d066`, N2 `9713c89bada6573bda2f60c97fb45deda48f5909`.

**Направление интерфейса от владельца (RESEARCH / не утверждённая спецификация):** NetBox-подобная структура для связанных данных — постоянная боковая навигация, фильтруемые таблицы каталогов и состояний, подробные карточки с отношениями, provenance и переходами. Ориентир относится к организации информации, а не к копированию NetBox, его компонентов или визуального оформления. Задачи каталогизации, запроса, анализа и исправления — разные входы к общей модели.

**Минимальная цепочка UX-0:** `Resource → Deployment → Interaction/Revision → BusinessProcess/Need → Request → Decision → PolicyRule → Declared → Required for NST → Configured → Reconciliation → SIMULATED operation → independent recheck`. BusinessProcess и ConnectivityNeed обязательны для намеренного запроса. DENIED заявки ≠ сетевой DENY; последний появляется только при NST-адаптации с эквивалентностью. Отзыв — отдельная **непринятая hypothesis**, не исполняемое действие N2.

Расширять постепенно: общий shell, два reusable patterns (list/detail), несколько межраздельных переходов, один связанный mock dataset. **9 групп / 18 candidate workspaces** — карта, а не план 19 готовых экранов. Future network data = **MOCK**, operations = **SIMULATED**, отсутствие данных = **Unknown/Uncomparable**, а не успех.

## Принцип декомпозиции

**Продуктовая capability** — пользовательский outcome (например «найти неправильно реализованный доступ»). **Domain owner / Bounded Context** — место, где поддерживается авторитетная семантика (например Access Policy и APR). **UI workspace** — точка входа в пользовательскую работу (например «Проверка связи»); часто агрегирует данные нескольких владельцев. **Collector/renderer/adapter** — технические возможности, которым не обязательно нужен собственный главный экран. Три иерархии не должны совпадать.

Первая версия имела 10 BC в [docs/model/strategic/capabilities.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/strategic/capabilities.yaml), но только 7 основных текущих Web route ([web/src/app/navigation.ts](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/web/src/app/navigation.ts)); исторический UI предлагал Connectivity/Checker/Needs/Realization в [docs-legacy/ui/layout.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/ui/layout.md). Нельзя копировать любое из этих меню один к одному: у N2 сейчас реализован небольшой request UI ([openspec/specs/access-requests-web-ui/spec.md](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/openspec/specs/access-requests-web-ui/spec.md)), остальные переходы — **mock candidate**.

## Предварительная широкая боковая навигация

| Группа / раздел | Назначение и пользовательская задача | Список / карточка / действия / переходы | Capabilities / J | Состояние |
|---|---|---|---|---|
| **Обзор** | Видеть нужный, разрешённый, настроенный и неизвестный доступ отдельно | Сводка проблем данных, recent requests, drift, переходы к объектам; без «единственного зелёного статуса» | C19 C35 C36 / J06 J08 | mock candidate |
| **Мои связи** | Понять сеть относительно своих ресурсов и scope | scope selector → дерево Resource/Deployment/outgoing-incoming → детальная связь → Need, Request, Rule, evidence, realization | C19 / J02 J06 | historical target; mock |
| **Каталоги / Ресурсы** | Найти и изменить Resource/Endpoint/Owner/Site | список + фильтры, detail tabs Overview/Endpoints/Responsibilities/History; Create, set/clear address | C01–C04 / J01 | 1.0 UI реализован; N2 mock |
| **Каталоги / Приложения** | Редактировать семантику коммуникации | список профилей, detail tabs Components/Interactions/Revisions, create component, revision history | C05–C07 / J01 | 1.0 UI реализован; N2 mock |
| **Каталоги / Размещения** | Найти Component deployments на Resources | список/детали Deployment; ссылки на Component и Resource, replicas separately | C08 / J01 | 1.0 UI реализован; N2 mock |
| **Потребности / Бизнес-процессы** | Объяснить бизнес-функцию | Process list/detail, criticality/responsible group, related Needs и связи | C09–C11 / J01 J08 | 1.0 UI частично; N2 mock |
| **Потребности / Коммуникационные потребности** | Обосновать связь без разрешения | Need list/detail, Interaction, participant perspective, Current/Retired, attribution, история, запросить доступ | C10 C11 / J01 J02 | historical; N2 mock |
| **Доступ / Заявки** | Создать, найти, просмотреть заявку | PENDING/ALLOWED/DENIED list, detail, create from chosen source, decision action; history/Need/Rule links | C13–C15 / J02 | N2 existing UI реальный (UUID form) |
| **Доступ / Правила** | Показать authoritative desired PolicyRules | list/detail, state Active/Inactive, exact subject, provenance, history, transition drafts under review | C16 C17 / J02 J03 | N2 backend Rule read; UI candidate |
| **Исследование / Проверка связи** | Найти контекст по IP/protocol/port; UX-0 current-only | tuple form → tabs Attribution/Business/Policy/Network/Evidence; zero/many matches, UNKNOWN, ссылки | C20 / J06 | historical Checker; mock |
| **Исследование / Наблюдения** | Посмотреть, что именно получено из сети | Evidence sets, sources, time/freshness/completeness, Configured vs TrafficDerived vs Imported | C21–C24 / J05 | future; mock-only |
| **Исследование / Обнаруженные связи** | Привязать наблюдения к бизнес-контексту | Recognized/ambiguous/unresolved list, candidate graph, action «атрибутировать Need», переход к запросу | C25 / J05 | future; mock-only |
| **Сеть / Устройства и места применения** | Понять объекты enforcement и доказанность placement | Firewall/ACL candidate list; source snapshots, states, locators and uncertainty | C26 C27 / J06 J07 | future; mock-only |
| **Сеть / Сопоставление политик** | Сравнить desired/required/configured | ComparisonScope, required/observed snapshots, common/missing/excess, Uncomparable | C28–C30 / J07 | future; mock-only |
| **Сеть / Изменения и операции** | Безопасно спланировать и проверить network mutation | verified intent, rendered artifact, precondition, execution event log, recapture/recheck | C31–C34 / J07 | future; SIMULATED only |
| **Аналитика / Влияние и отчёты** | Понять, какой процесс пострадает и чего мы не знаем | graph Process→Need→Rule→Resource, audit/event history, unresolved/stale lists | C35 C36 / J08 | unaccepted UX hypothesis |
| **Администрирование / Полномочия** | Отличить Actor grants от Resource owners | Actors, action/scope/time authority, scope visibility, server-only authority explanation | C12 / J02 J08 | N2 demo grants, управление UI mock |
| **Администрирование / Источники и интеграции** | Контролировать происхождение/сбор | catalogue external source, capture schedule/status, imported files, identity mappings | C21–C24 C37 C38 / J05 J08 | optional; mock-only |

**Предварительная карта UX:** 18 candidate workspaces в 9 навигационных группах; «Заявки» уже имеют отдельный реальный UI N2. Это **не** 18 независимых доменов и не план реализации 18 backend/route. Отдельный workspace «Эффективная политика» исключён из текущей карты: C18 / J04 сохраняется как техническая способность вычисления и экспорта, а не пункт меню. Текущий UX-0 с восемью разделами остаётся самостоятельным исследовательским прототипом.

## Access Policy: отдельные пользовательские реестры и вычисляемое представление

**Предметный источник истины:** [доменная модель](../domain.md), [логическая ERD](persistent-state-erd.md) (исследовательский статус) и принятые N2 OpenSpec: [access-requests](../../openspec/specs/access-requests/spec.md), [access-decisions](../../openspec/specs/access-decisions/spec.md), [policy-export](../../openspec/specs/policy-export/spec.md). Разделение сущностей уже определено; это уточнение IA, а не изменение модели.

- **Access Requests** — самостоятельный пользовательский реестр заявок на доступ с состояниями PENDING/ALLOWED/DENIED, предметом запроса, BusinessProcess/ConnectivityNeed, evidence подачи и результатом решения. DENIED относится к заявке/решению, а не к PolicyRule. Правила видимости реальных заявок задаёт сервер, а не mock-переключатель scope.
- **Policy Rules** — самостоятельный пользовательский реестр сохраняемых авторитетных разрешающих правил PolicyRule, в том числе ACTIVE и INACTIVE, с точным AccessSubject, обоснованием и provenance ALLOWED-решений. Для одного AccessSubject существует максимум одно каноническое правило: ALLOWED создаёт либо повторно использует его; DENIED не создаёт и не отзывает правило. Состояние ACTIVE/INACTIVE относится к Rule, не к заявке.
- **Effective Policy / декларированная эффективная политика** — вычисляемая на момент оценки совокупность эффективных ACTIVE PolicyRule, предназначенная для последующих вычислений (включая построение TargetRequiredPolicy для выбранных сетевых кандидатов). Это **не** самостоятельный доменный контейнер Policy, не новая ERD-таблица и **не отдельный UI workspace на текущем этапе**. Принятый `policy/export` остаётся серверным контрактом получения vendor-neutral представления, в котором READY/INCOMPLETE характеризует адресную материализацию, а не состояние заявки или Rule.

**Последствие для UX:** заявки и правила должны быть различимы в навигации и пользовательских списках по их ответственности. Расположение пунктов ещё подлежит UI-review; не требуется автоматически расширять восемь разделов UX-0, вводить отдельный экран Effective Policy или изменять [UI Baseline v0.1](ui-baseline-v0.1/README.md). Допустимы контекстные ссылки Request → Rule и Rule → authorization provenance, сохраняющие различие сущностей. Q1 ALLOWED связывается с P1 ACTIVE, Q2 DENIED не создаёт новое правило и не изменяет P1.

## Поведение экранов и переходов

- Общий shell: sidebar с группами, breadcrumbs, строка scope (только для соответствующего рабочего контекста), actor; в mock-режиме постоянная видимая метка **MOCK / FICTIONAL NETWORK DATA**, не подменять server authorization.
- В каждом списке: условные search/filter, список связанных объектов, state/source/last observation time; empty и Unknown раздельно. В detail: primary identity, роли/владение, отношения, provenance, timeline, контекстные переходы.
- От Resource → Deployments → Component → InteractionRevision; от Process → Need → Requests → Decisions → Rule → Export; от Evidence → Recognized candidate → Need/Request; от PolicyRule → comparison/target/source evidence → change operation → recheck.
- Нельзя создавать fake success действий («применено к firewall») и скрытую реальную авторизацию: mock transition — визуализация предустановленного сценария. Действия без backend должны быть явно **Смоделировано**, логироваться локально в UX-стейте, после Reload исчезать либо сбрасываться с явным пояснением.
- В продуктивной версии candidate picker для J02 обязан показывать Resource/назначение/смысл/Need, а не требовать четыре GUID. Сейчас API N2 сохраняет GUID contract; это вопрос отдельного спецификационного этапа, не исследовательское изменение.

## Единый связанный demo-датасет (концептуальный, не seed в БД)

| Объект | Пример | Назначение |
|---|---|---|
| Scope A / организация | `orders-prod`, группа **Orders** | Контекст Resource R1 и право `access.request` для User A как **отдельный grant** |
| Scope B / организация | `finance-prod`, группа **Finance** | Контекст Resource R2; User A не обязан иметь `access.request` на Scope B |
| Resource R1 / Endpoint E1 | `order-api-01` / `10.20.1.10`; Owner Orders | Исходный Resource; Site DC-1; stable Resource/Endpoint IDs |
| Resource R2 / Endpoint E2 | `ledger-api-01` / `10.30.2.20`; Owner Finance | Целевой Resource; Site DC-2; можно снять адрес для INCOMPLETE-состояния |
| Application Profile | `Order-to-Ledger HTTPS` | Один повторно используемый профиль взаимодействия, **не** CMDB-identity сервиса |
| Components + Interaction | `OrderClient` → `LedgerApi`; Revision `rev-1` TCP destination **443** | Направленная семантика и traffic alternatives; source/dest одного профиля |
| Deployments | `dep-order-1`: OrderClient→R1; `dep-ledger-1`: LedgerApi→R2 | Конкретные экземпляры; IP changes не меняют deployment IDs |
| Process + Need | `Settlement`; `need-001`: OrderClient требуется Interaction OrderClient→LedgerApi для бухгалтерской операции; request отдельно выбирает `rev-1` | Бизнес-обоснование отдельно от разрешения |
| Actors | `alice-orders` (requester), `bob-policy` (decider), `nina-network` (export+оператор) | Правомочность отдельно от Owners, роли — демонстрационная подача, backend не расширять |
| Authority fixture | Alice: `access.request` только Scope A; Bob: отдельный trusted `access.decide` для demo-policy; Nina: `policy.export` Scope A **и** Scope B | Resource Owners Orders/Finance не получают decider grant автоматически; роли не заменяют server grants |
| Authority negative cases | Alice без request grant Scope B подаёт Q1 успешно; без source grant — 403, без DENIED. Nina без export grant любой из сторон — 403 без строк/адресов/provenance | `access.request(source)` и `policy.export(source+destination)` — разные проверки по N2 [request](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/openspec/specs/access-requests/spec.md#L20) / [export](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/openspec/specs/policy-export/spec.md#L9) |
| Request Q1 | `alice-orders` → PENDING → ALLOWED → Rule P1 ACTIVE | Базовая «желаемая политика» HTTPS |
| Request Q2 | Отдельный повторный запрос exact subject → DENIED | Демонстрирует, что DENIED не создаёт второго Rule и не аннулирует P1 |
| Export | P1 TCP/443 READY; при удалении адреса E2 → INCOMPLETE | Согласованный desired-view, не указывает firewall |
| Evidence F1 (MOCK) | TrafficDerived: R1→R2 TCP/443 observed; sourceTime/recordedTime различаются | Наблюдаемый трафик не является разрешением и не доказывает доставку/allow |
| Firewall + target candidates (MOCK) | `fw-border-01` с `ACL-APP` и `fw-core-02` с `ACL-CORE` как **кандидаты**, никакой «доказанной цепочки» | Показывает 0..N relevance, freshness и ambiguity; ComparisonScope выбирается явно |
| Configured snapshot F2 (MOCK) | Для `fw-border-01/ACL-APP` эффективный permit TCP/8443, нет TCP/443; completeness=Complete **только в выдуманном сценарии** | Сравнение target required 443 vs configured 8443: common 0, missing 443, excess 8443 → Drift |
| Change O1 (SIMULATED) | Verified `ENSURE-PERMIT TCP/443` → renderer artifact → simulated apply → recapture F3 | Нет подключения к реальному устройству, нет необоснованного auto-remove 8443 |
| Recapture F3 (MOCK) | Effective permits 443 **и** 8443 | missing=0, excess=8443 → **по-прежнему Drift**, не ложная convergence |

**Негативные/неоднозначные кейсы** в одном датасете: неизвестный адрес E2 (INCOMPLETE export и Unresolved target policy); неоднозначные два network candidates; evidence без Need и без авторизации; DENIED после ранее ALLOWED; устаревший capture/Unknown; mismatch scope grant; no auto removal of excess. Дополнительный необязательный ресурс `legacy-unattributed-01` нужен только если два Resource недостаточны для показа unmatched IP и нескольких возможных resource attributions; **не вводить третьего участника в базовый сценарий до UX проверки**.

**Время Checker в UX-0:** только current-only MOCK; показывать время оценки и отдельные sourceTime/recordedAt/collectedAt. Исторический `asOf` — будущая гипотеза [Checker](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/traffic-analysis-checker.md#L100), несовместимая с молчаливой подстановкой current-only [NEP ADR-018](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/decisions/ADR-018-nep-firewall-current-state-candidate-model.md#L48). Неподдерживаемые исторические измерения — `Unknown` / `Historical data unavailable`; текущие candidates не являются историческим маршрутом. Все отсутствующие сетевые интеграции и их данные — **MOCK**, операции — **SIMULATED**. Executed/Applied и immediate Verified не доказывают сходимость: нужен отдельный APR recheck, как F3 с оставшимся excess.

**Критическая оговорка:** mock данных не доказывает жизнеспособности нормализатора, API, исполнителя сети или конкретного firewall/ACL. Пример `fw-core-02` не выбирается для применения без независимого доказательства placement. Источники контракта: [docs-legacy/requirements/technical-access-evidence-core.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/technical-access-evidence-core.md), [docs-legacy/requirements/network-enforcement-placement-core.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/network-enforcement-placement-core.md), [docs-legacy/requirements/access-policy-realization-mvp.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/access-policy-realization-mvp.md), [docs-legacy/requirements/network-environment-operations.md](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs-legacy/requirements/network-environment-operations.md).

## Как прототипировать: breadth-first без расширения backend

**Iteration UX-0 — минимальный широкий E2E за один набор данных.** Использовать существующий Web UI заявки как рабочий референс, но не менять его реализацию в этом PR. После review подготовить в отдельном этапе *макет* shell + навигацию всех разделов, общие read-only list/detail на одном связанном mock graph, переходы J01→J02→J04 и J05→J06→J07. Каждая future view помечена mock/candidate. Демонстрация должна проходить от R1 до drift и обратно к Rule за несколько кликов.

**Iteration UX-1 — проверить смысловые переходы с пользователем.** Приоритеты: (1) выбор источника/назначения/Need без UUID; (2) с какого экрана входить — «Мои связи», Resource detail или «Заявки»; (3) раздельные состояния desired/configured/realized; (4) кто видит неизвестные/неоднозначные доказательства; (5) owner vs action grant. Исправить информационную архитектуру по реальным провалам задач.

**Iteration UX-2 — один вертикальный улучшенный процесс.** После подтверждения UX-0/1 выбрать J02 semantic picker либо J06 Checker; формировать отдельный OpenSpec change для реальных API только когда доказана продуктовая польза и утверждён статус требований. Не реализовывать широкие mock-секции на backend «ради полноты меню».

## Открытые IA-решения

1. Приоритет главной точки входа: resource-centric Connectivity vs request-first workqueue.
2. Сегментация: «Наблюдения» как расследование vs source administration; слабое доказательство существования отдельной user task для некоторых пунктов.
3. Раздел «Изменения и операции» до появления реального provider integration: оставить видимый SIMULATED future flow либо скрыть за «Планы».
4. Насколько детальна модель approval; текущие инварианты не разрешают автоматически сделать resource owner approver.
5. Уровень подробности topology/placement graph: candidate relevance vs proven path.

Решения согласовать после ревью [docs/domain.md](https://github.com/lehater/napms-2/blob/9713c89bada6573bda2f60c97fb45deda48f5909/docs/domain.md) и [gaps](product-discovery-gaps.md); не превращать этот документ в финальный контракт UI без исходной проверки.

## Границы UX-0 после содержательного аудита

[Аудит 180/180](primary-source-content-audit.md) подтверждает ширину карты, но не product acceptance. **18 workspaces / 9 групп** остаются candidate navigation map. Первый прототип: shell, минимальные общие read-only templates и один dataset; несколько кликабельных переходов важнее наполнения всех 18 разделов. Необходимые состояния выбираются для J01→J02→J04 и J05→J06→J07; J03 только как отдельно маркированная hypothesis, без исполняемого изменения Rule или сценария «Запросить прекращение доступа».

При детализации использовать [AUD-013/014](product-requirements-traceability.md): list→detail, видимый query state, reset paging, loading/empty/404/error, field validation и conflict, keyboard/focus, narrow reflow. Mock filtering разрешён как локальная демонстрация явно полного mock dataset; он не доказывает backend query semantics. Historical checkboxes не вводят bulk mutation/saved views/Resource type. Введённые в макет external Person/Team references не становятся Actor grants.

В network detail нужны collectedAt, diagnostics skipped/missing routing state, все relevant local branches и override reason; не выдавать список кандидатов за полный маршрут или historical asOf. NEP/TAE могут иметь разную свежесть. В evidence сохранять source+capture retry/conflict, duplicate records, unknown source time и normalization failure. В Rule detail не превращать historical one-Pending/withdrawal модель в работающий N2 lifecycle. CSV/TTL exportId помечать hypothesis при отсутствии принятого API.

Для UX-0 оставить строго **один Endpoint на каждый Resource и одну revision**. Mock network actions — **SIMULATED**. Реальные API, SQLite и demo credentials изолированы от mock. Принятый N2 request source-only grant не менять из-за stale current N1 security clauses (X09). Принятие final IA, production auth и future capability scope требует отдельного review.
