# Семантический аудит концептуальной модели NAPMS

**Дата:** 2026-11-21
**Объект:** канонические заметки experiments/product-model/vault/knowledge/; граф и метамодель не изменялись.

## Вывод

Граф покрывает все 38 возможностей Capability Map и соединяет каждую с System Function. Сквозной фрагмент до Logical Function, Logical Component, Functional Chain, Functional Exchange, Domain Entity и Constraint раскрыт для выбранных сценариев вокруг Resource/Deployment, Authority, Access Governance и Policy Export. Это не равно глубине всей карты: 5 из 12 областей доходят до LA, ещё две области принятого scope имеют OA/SA, но не LA.

В сигнатурах realizes, part_of и precedes нарушений не найдено. Главные подтверждённые ограничения модели — generic references не кодирует роли предметных связей, а условное ветвление цепочки задано только текстовым полем guard. Они не свидетельствуют о дефекте продукта. Код и продуктовые тесты не проверялись: для оценки модели достаточно было продуктовой документации и OpenSpec.

**Наивысший найденный приоритет — P2.** P0/P1 не выявлены. Числа ниже описывают наличие связей и покрытие выбранных путей; количество связей не используется как оценка качества модели.

## Метод и детерминированная инвентаризация

YAML frontmatter всех заметок vault/knowledge/**/*.md разобран в сортированном порядке с помощью Python 3 и установленного PyYAML. Для каждого отношения из frontmatter определены типы источника и цели. Canvas и Bases не учитывались как источники фактов: README называет их статическими проекциями, источником истины остаются заметки.

| Показатель | Результат |
|---|---:|
| Узлы | 179 |
| Типизированные отношения | 371 |
| Непустые ячейки матрицы Source Type × Relation Type × Target Type | 40 |
| Неразрешённые Wikilinks в отношениях | 0 |
| Дубли одного target в одном свойстве, ошибочные сигнатуры и нарушения проверенных обязательных кратностей | 0 |
| precedes вне общего контекста или с циклом | 0 |

Проверка кратности охватила Functional Exchange endpoints/items, Function/Exchange Involvement и Scenario Message. Метамодель не задаёт кратности для большинства предметных связей; отсутствие явной кратности там не трактовалось как нарушение. Границы и семантика типов взяты из [README эксперимента](../README.md#L22-L34), [кандидатной метамодели](../metamodel.md#L17-L64) и её [статических оговорок](../README.md#L77-L111).

### Узлы по типу

| Type | Count | Type | Count | Type | Count |
|---|---:|---|---:|---|---:|
| activity | 6 | capability | 39 | component | 4 |
| constraint | 14 | domain_entity | 20 | exchange_involvement | 10 |
| exchange_item | 7 | function | 22 | function_involvement | 12 |
| functional_chain | 3 | functional_exchange | 10 | mission | 2 |
| operational_process | 1 | participant | 7 | problem | 1 |
| scenario | 4 | scenario_message | 10 | state | 7 |

У 39 capability-узлов 38 — C01–C38 Capability Map; ещё один описывает системную способность NAPMS. Счётчики соответствуют baseline в [README](../README.md#L81-L93).

### Разреженная матрица отношений

Каждая строка задаёт одну ненулевую ячейку Source Type × Relation Type × Target Type.

| Source Type | Relation Type | Target Type | Count |
|---|---|---|---:|
| activity | part_of | operational_process | 6 |
| capability | addresses | problem | 1 |
| constraint | constrains | capability | 9 |
| constraint | constrains | domain_entity | 23 |
| domain_entity | part_of | domain_entity | 7 |
| domain_entity | references | domain_entity | 14 |
| domain_entity | references | participant | 3 |
| domain_entity | source | domain_entity | 1 |
| domain_entity | specializes | domain_entity | 2 |
| domain_entity | target | domain_entity | 1 |
| exchange_involvement | part_of | functional_chain | 10 |
| exchange_involvement | references | functional_exchange | 10 |
| exchange_item | references | domain_entity | 14 |
| function | allocated_to | component | 11 |
| function | part_of | function | 10 |
| function | realizes | activity | 10 |
| function | realizes | capability | 56 |
| function | realizes | function | 11 |
| function | realizes | mission | 1 |
| function_involvement | part_of | functional_chain | 12 |
| function_involvement | precedes | function_involvement | 9 |
| function_involvement | references | function | 12 |
| functional_chain | references | capability | 7 |
| functional_exchange | conveys | exchange_item | 10 |
| functional_exchange | source | function | 10 |
| functional_exchange | target | function | 10 |
| mission | addresses | problem | 1 |
| participant | participates_in | activity | 15 |
| scenario | references | activity | 2 |
| scenario | references | capability | 14 |
| scenario | references | functional_chain | 5 |
| scenario | references | participant | 11 |
| scenario_message | part_of | scenario | 10 |
| scenario_message | precedes | scenario_message | 6 |
| scenario_message | references | domain_entity | 3 |
| scenario_message | references | exchange_item | 6 |
| scenario_message | references | state | 1 |
| scenario_message | source | participant | 10 |
| scenario_message | target | participant | 10 |
| state | state_of | domain_entity | 7 |

## Покрытие типов и запрошенных путей

Для общей таблицы критерий означает наличие основного структурного или трассировочного отношения, ожидаемого от данного типа в метамодели. Для Domain Entity критерий показывает лишь связанность с графом, а не предметную точность; она рассмотрена отдельно. Формат счётчиков: **покрыто / не покрыто / неприменимо**.

| Type / уровень | Проверяемое значимое отношение | Покрыто / не покрыто / N/A |
|---|---|---:|
| problem | Есть входящая addresses | 1 / 0 / 0 |
| participant | Участвует через participates_in | 7 / 0 / 0 |
| mission | Связана через addresses или входящий realizes | 1 / 1 / 0 |
| capability | Есть входящий realizes от Function | 39 / 0 / 0 |
| activity | В составе Operational Process и трассируется System Function | 6 / 0 / 0 |
| operational_process | Содержит Activity | 1 / 0 / 0 |
| function — system | Входит в декомпозицию через part_of | 10 / 0 / 1 |
| function — logical | Выделена Component и реализует System Function | 11 / 0 / 0 |
| functional_chain | Содержит function/exchange involvement и связана со Scenario | 3 / 0 / 0 |
| function_involvement | Ссылается на Function и принадлежит одной Chain | 12 / 0 / 0 |
| exchange_involvement | Ссылается на Exchange и принадлежит одной Chain | 10 / 0 / 0 |
| functional_exchange | Имеет source, target и conveyed item | 10 / 0 / 0 |
| scenario | Имеет сообщения с контекстом Scenario | 4 / 0 / 0 |
| scenario_message | Имеет Scenario, source, target и content reference | 10 / 0 / 0 |
| component — logical | Получает входящую allocated_to | 4 / 0 / 0 |
| domain_entity | Имеет хотя бы одну типизированную связь с графом | 20 / 0 / 0 |
| exchange_item | Передаётся Exchange и ссылается на Domain Entity | 7 / 0 / 0 |
| constraint | Ограничивает хотя бы один узел через constrains | 14 / 0 / 0 |
| state | Привязано к Domain Entity через state_of | 7 / 0 / 0 |

У System Function Govern network access нет родителя: это корневая функция, поэтому она неприменима к проверке дочерней декомпозиции. Operational Mission — единственный изолированный узел: для него пока нет addresses или входящего realizes.

| Запрошенный путь | Единица счёта | Покрыто / не покрыто / N/A | Пояснение |
|---|---|---:|---|
| Operational Activity — System Capability — System Function | 6 Activity | **6 / 0 / 0** | Для каждой Activity есть System Function, которая реализует её и хотя бы одну Capability. Это не означает трассировку каждой отдельной Capability к каждой Activity. |
| System Function — Logical Function | 11 System Function | **5 / 5 / 1** | 5 дочерних System Function имеют входящий realizes от Logical Function; 5 — нет; корневая функция N/A. |
| Logical Function — Logical Component | 11 Logical Function | **11 / 0 / 0** | Все 11 имеют ровно одну allocated_to. |
| Logical Function — Functional Chain | 22 Function обоих уровней | **11 / 0 / 11** | Все Logical Function участвуют хотя бы в одной Chain; 11 System Function — N/A для LA-цепочек. |
| Function — Functional Exchange — Exchange Item | 10 Exchange; 7 Item | **10/0/0; 7/0/0** | Все Exchange имеют ровно один source и target и хотя бы один Item; все 7 Item ссылаются на Domain Entity. |
| Functional Chain — Scenario | 3 Functional Chain | **3 / 0 / 0** | Все три Chain ссылаются хотя бы из одного Scenario. |
| Function — Domain Entity — Constraint | 22 Function обоих уровней | **11 / 0 / 11** | Все 11 Logical Function имеют путь через endpoint Exchange → conveyed Item → Domain Entity, на которую направлен constrains; System Function — обзорный уровень, N/A. |

У пяти System Function без LA-декомпозиции: Maintain business justification, Manage communication contracts, Analyze observed connectivity, Realize and reconcile network policy, Analyze impact and integrate sources. Покрытые пять: Evaluate authority, Govern access request and rule, Manage Resource and deployment context, Materialize effective policy export, Select access communication context.

## Ширина модели по функциональным областям

Все 12 областей имеют System Function трассировку; 7 также связаны с Operational Activity, 5 имеют Logical Function. Числа LA показывают Capability с прямой связью realizes от Logical Function, а не полноту реализации Capability. Capability Map задаёт 38 узлов и scope A/C/O независимо от глубины модели ([Capability Map](../../../docs/product/capability-map.md#L19-L20)).

| Область | Scope | OA | SA | LA: capability с Logical Function |
|---|---|:---:|:---:|---:|
| Resource Management, C01–C04 | A+C | ✓ | ✓ | 2/4 |
| Application Communication, C05–C07 | A | ✓ | ✓ | 0/3 |
| Application Deployment, C08 | A | ✓ | ✓ | 1/1 |
| Business Connectivity, C09–C11 | A+C | ✓ | ✓ | 0/3 |
| Authority Management, C12 | A | ✓ | ✓ | 1/1 |
| Access Governance, C13–C17 | A+C | ✓ | ✓ | 4/5 |
| Policy Export, C18 | A | ✓ | ✓ | 1/1 |
| Connectivity Analysis, C19–C20 | C | — | ✓ | 0/2 |
| Technical Access Evidence, C21–C25 | C | — | ✓ | 0/5 |
| Network Policy Realization, C26–C34 | O | — | ✓ | 0/9 |
| Analytics & Reporting, C35–C36 | C | — | ✓ | 0/2 |
| Integration & Operations, C37–C38 | C | — | ✓ | 0/2 |

Наиболее связанные фрагменты OA–SA–LA–Chain–Scenario сосредоточены в Resource/Deployment, Authority, Access Governance и Policy Export: три Functional Chain и четыре Scenario моделируют J01, два варианта J02 и J04. Application Communication и Business Connectivity имеют OA и SA, но не Logical Function. Это потенциальный пробел глубины для принятых областей A, если цель модели — сквозная LA-декомпозиция и этих областей.

Connectivity Analysis, Technical Access Evidence, Network Policy Realization, Analytics & Reporting и Integration & Operations представлены только Capability и обзорной System Function: без OA Activity, LA Function, Functional Chain или соответствующего Scenario. В Capability Map это кандидаты C или scope O, а J05–J08 описаны как исторические/кандидатные пути ([Capability Map](../../../docs/product/capability-map.md#L86-L139), [User Journeys](../../../docs/research/user-journeys.md#L77-L111)). Это подтверждённая ширина текущей модели, но не дефект продукта и не обязательное требование углублять кандидаты.

## Семантические замечания

### P2 — Подтверждённый дефект графового представления: references не сохраняет роли предметных связей

Метамодель допускает широкое references, но прямо запрещает подменять им более точные предметные отношения ([метамодель](../metamodel.md#L50-L51)). Это свойство используется для 14 связей Domain Entity → Domain Entity и 3 связей Domain Entity → Participant.

Самый существенный случай — AccessSubject. В описании указаны source Deployment, destination Deployment и exact InteractionRevision, а OpenSpec закрепляет ordered tuple из двух deployments и revision. В графе же только один generic reference на ComponentDeployment и один на InteractionRevision ([заметка AccessSubject](../vault/knowledge/domain/access-subject.md#L9-L16), [доменный контракт](../../../docs/domain.md#L14-L19), [OpenSpec](../../../openspec/specs/access-requests/spec.md#L9-L14)). ConnectivityNeed также ссылается на обобщённую ComponentRole без указания её роли source participant, хотя OpenSpec требует source Component ([заметка](../vault/knowledge/domain/connectivity-need.md#L9-L18), [OpenSpec](../../../openspec/changes/persist-connectivity-need/specs/connectivity-needs/spec.md#L8-L13)). Для PolicyRule связь с AccessDecision не выражает различие исходного решения и последующего набора evidence; OpenSpec требует сохранять каждое повторное ALLOWED decision ([заметка](../vault/knowledge/domain/policy-rule.md#L9-L16), [OpenSpec](../../../openspec/specs/access-decisions/spec.md#L35-L40)).

**Характер:** подтверждённая потеря роли и точности трассировки в графе; из неё не следует ошибка продукта.
**Рекомендация:** для этих связей явно моделировать source/destination, source participant и связь Rule с decision evidence; оставить references только для общей навигации.

### P2 — Подтверждённое ограничение выразительности: ветвление хранится не как типизированная семантика

В Chain Decide an access request упорядочены запись решения и создание/переиспользование PolicyRule. DENIED-сценарий одновременно требует отсутствия нового Rule; участие Create or reuse PolicyRule имеет поле guard со свободным текстом, которого нет в метамодели ([Function Involvement](../vault/knowledge/chains/involvements/decision-rule.md#L9-L14), [DENIED Scenario](../vault/knowledge/scenarios/access-request-denied.md#L9-L18)). Метамодель и README прямо указывают, что precedes не задаёт guards и ветвление ([метамодель](../metamodel.md#L56-L64), [ограничения](../README.md#L105-L109)).

**Характер:** подтверждённое ограничение метамодели; из-за него цепочка не даёт машинно-проверяемой условной траектории, несмотря на текстовую подсказку и отдельные сценарии ALLOWED/DENIED.
**Рекомендация:** если нужна проверка веток, задать условие и альтернативные пути в формальном представлении цепочки/сценария; не интерпретировать текущий guard как типизированную связь.

### P2 — Потенциальный пробел глубины для принятого scope

В Application Communication и Business Connectivity все capability-связи доходят до SA и операционных Activity, но ни одна Capability этих двух областей не связана с Logical Function. Обе области имеют scope A, а их Activity/назначение описаны в J01 ([Capability Map](../../../docs/product/capability-map.md#L30-L56), [J01](../../../docs/research/user-journeys.md#L28-L38)). При этом модель может намеренно останавливаться на system overview.

**Характер:** потенциальный пробел модели, не недостаток продукта.
**Рекомендация:** явно решить, входит ли LA-декомпозиция этих принятых областей в цель baseline; если входит — развить выбранные поведения через Logical Function и Chain, без требования один-в-один на каждую Capability.

### P3 — Исследовательская гипотеза: часть realizes может смешивать вклад и полную реализацию capability

Все 78 realizes соответствуют допустимым типам и направлениям: 11 Logical→System Function, 10 System Function→Activity, 56 Function→Capability, 1 Function→Mission. Однако метамодель не различает полную реализацию capability и вклад функции в неё. Например, Resolve deployment Resource identity трассируется к C01 Registration Resource, хотя описание функции говорит о получении identity уже существующего Resource ([Function](../vault/knowledge/functions/resolve-deployment-resource-identity.md#L13-L22), [C01](../../../docs/product/capability-map.md#L25-L27)).

**Характер:** гипотеза о слишком широкой трассировке; допустимое разбиение capability на несколько функций не определено, поэтому это не подтверждённая ошибка.
**Рекомендация:** при дальнейшем анализе отмечать вклад/полноту трассировки либо уточнять определения функций там, где связь читается как полное покрытие capability.

### P3 — Потенциальный пробел: exchange involvements не включены в локальный порядок

Все 15 имеющихся precedes локальны своему Chain или Scenario и ацикличны. Из них 9 упорядочивают Function Involvement, 6 — Scenario Message; ни один из 10 Exchange Involvement не упорядочен. Их принадлежность и связь с Exchange корректны, а порядок можно частично вывести по endpoints, поэтому отсутствие связи само по себе не дефект.

**Характер:** потенциальная потеря явного порядка потоков внутри Functional Chain.
**Рекомендация:** если проекция или анализ должны показывать последовательность потоков, добавить локальный порядок для соответствующих Exchange Involvement; иначе указать, что порядок выводится из endpoints и Function Involvement.

### P3 — Исследовательская гипотеза: Operational Mission не трассируется

Операционная миссия управления связностью — единственный изолированный узел графа ([заметка](../vault/knowledge/operational/operational-mission.md#L1-L13)). System Mission и проблема связаны, но этот Operational Mission не соединён с деятельностью или поведением.

**Характер:** возможный пробел трассировки; метамодель не требует отдельного отношения от каждой Mission.
**Рекомендация:** если миссия должна быть частью графового объяснения, связать её с соответствующей деятельностью или поведением допустимым предикатом; иначе оставить её как самостоятельную обзорную формулировку.

## Проверка ключевых предикатов

- **realizes — корректное направление.** В observed graph все 11 связей Function→Function идут от logical к system level; 10 связей к Activity исходят от system functions. Связь не трактовалась как кодовая реализация, в соответствии с README.
- **references — допустимые концы, но слабая предметная точность.** Помимо отмеченных доменных связей, оно используется для ссылок Scenario/Chain на Capability и для содержания Exchange Item/Scenario Message; это контекстные ссылки. Главный риск — потеря ролей и кардинальностей внутри Domain Entity associations.
- **part_of — подтверждённых ошибок композиции не найдено.** 55 связей соответствуют заявленным парам типов; function-decomposition остаётся внутри одного уровня, а domain structure не смешана с references.
- **precedes — контекстность соблюдена.** Нет cross-context рёбер и циклов. Порядок остаётся partial; guards, синхронизация и повторы не выражены типизированно.
- **Дублирование референтов — не подтверждено.** NAPMS Component и Logical Component, Interaction и Functional Exchange, BusinessProcess и OperationalProcess остаются различными заметками согласно правилам эксперимента. Повторные Function Involvement для Resolve deployment Resource identity — разные участия в Submit и Export chains, что соответствует переиспользованию определения.
- **Granularity — неоднородная, но не доказанный дефект.** Overview System Function могут связывать несколько capabilities и областей; это согласуется с обзорным охватом, но усложняет вывод о глубине поведения по одной связи realizes.

## Источники и границы

Использованы [README и metamodel эксперимента](../README.md), [Capability Map](../../../docs/product/capability-map.md), [User Journeys](../../../docs/research/user-journeys.md), [доменная модель NAPMS](../../../docs/domain.md) и релевантные [OpenSpec access-request](../../../openspec/specs/access-requests/spec.md), [access-decisions](../../../openspec/specs/access-decisions/spec.md) и [ConnectivityNeed](../../../openspec/changes/persist-connectivity-need/specs/connectivity-needs/spec.md) спецификации.

Аудит относится к структуре и смысловой трассировке экспериментального графа. Он не подтверждает полноту реализации capabilities, не проверяет продуктовый код/тесты, не оценивает UI проекций и не утверждает эквивалентность ARCADIA/Capella.
