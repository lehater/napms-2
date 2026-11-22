# Кандидатная метамодель эксперимента

Это локальная рабочая схема для обзорной модели NAPMS 2.0. Она заимствует концептуальные различия ARCADIA, но не является формальной метамоделью Capella и не задаёт продуктовую архитектуру.

## Общие свойства

Каждая Markdown-заметка описывает один референт. `type` обязателен. `name` — читаемое имя; имя файла семантическое. `sources` содержит конкретные URL или пути первичных источников. `epistemic` принимает `fact`, `interpretation` или `hypothesis`.

`level` задаётся, только когда применим к типу:

- `operational` — потребность, участники, деятельность и операционные сценарии;
- `system` — ожидаемое поведение NAPMS как системы;
- `logical` — предполагаемая технологически нейтральная декомпозиция ответственности.

Для `capability` дополнительно разделяются `scope_classification` (`A`, `C`, `O` по Capability Map) и `implementation_status`. Статус scope не является статусом реализации. Статические `sources` не являются свидетельством тестового или GUI-прогона.

## Типы узлов

| Тип | Назначение и правила |
|---|---|
| `problem` | Наблюдаемая проблема/потребность, которую адресует продукт; формулировка синтезируется из источников и помечается `interpretation`, если в источнике нет отдельного именованного референта. |
| `participant` | Роль человека, организации или самой системы в операционной деятельности/сценарии. Это не предметный NAPMS `Component`. |
| `mission` | Назначение с уровнем `operational` или `system`; не подменяет capability. |
| `capability` | Способность участника или системы. Узлы C01–C38 сохраняют собственный scope и отдельный статус реализации; `area` — свойство источника, не структурный узел. |
| `activity` | Операционная деятельность (`level: operational`). Не представляет функцию системы. |
| `operational_process` | Композиция операционных действий/деятельности, а не NAPMS `BusinessProcess`. |
| `function` | Поведение системы или логической функции. Функциональная декомпозиция выражается `part_of`; leaf — функция без дочерних функций. |
| `functional_chain` | Композиция выбранных функциональных участий в конкретном поведении и на одном уровне анализа. |
| `functional_exchange` | Самостоятельный узел направленного информационного потока между функциями; содержит `source`, `target`, `conveys`. |
| `function_involvement` | Контекстное участие переиспользуемой функции в одной цепочке; не копирует определение функции. |
| `exchange_involvement` | Контекстное участие переиспользуемого функционального обмена в одной цепочке. |
| `scenario` | Контекст взаимодействия/варианта поведения; может ссылаться на process, capability и определения обменов. |
| `scenario_message` | Сообщение в конкретном сценарии между его участниками; порядок хранится только между сообщениями данного сценария. |
| `component` | Предполагаемый логический носитель ответственности (`level: logical`). Это не предметный `Component`, модуль кода или принятый Bounded Context. |
| `domain_entity` | Предметный референт NAPMS, включая доменные записи и результаты; типизация предметного подтипа хранится в `domain_subtype`. |
| `exchange_item` | Передаваемая информация/содержание потока; не функциональный обмен и не физический файл. |
| `constraint` | Предметное или архитектурное правило, ограничивающее конкретный элемент модели через `constrains`. |
| `state` *(расширение)* | Предметное состояние. Привязывается к сущности через `state_of`; состояние — значение модели, а не переход. |

## Отношения

Отношения направлены от узла, содержащего свойство, к целевому узлу. Обратные ссылки не записываются. Списки допустимы там, где кратность не равна единице.

| Предикат | Направление и допустимые концы | Кратность, ограничения и пример |
|---|---|---|
| `part_of` | Составная часть → целое. Допустимо: `function` → `function` того же `level`; `activity` → `operational_process`; `function_involvement`/`exchange_involvement` → `functional_chain`; `scenario_message` → `scenario`; предметный структурный элемент `domain_entity` → `domain_entity`. | У каждого контекстного involvement и сообщения ровно одно целое; у декомпозируемой функции — не более одного родителя в том же уровне. Межуровневую трассировку функций выражать `realizes`, не `part_of`. Не кодировать простую ассоциацию. Пример: дочерняя system function `→ part_of →` родительская system function. |
| `specializes` | Частная абстракция → более общая абстракция. В эксперименте: специализированный `domain_entity` → общий `domain_entity`. | `is-a`, не экземпляр/реализация/часть; циклы запрещены. Пример: `HOST address realization → specializes → Address realization`. |
| `realizes` | Более конкретное поведение → абстрактная потребность/поведение. Источник: `function`; цель: `activity`, `function`, `capability` или `mission`. | Используется для межуровневого соответствия, например `logical function → system function`, и для трассировки потребностей. Сама связь не утверждает наличие кода. Пример: `Resolve Resource identity → realizes → Manage Resource context`. |
| `allocated_to` | `function` → `component`. | В данном logical-срезе функция выделяется одному предполагаемому носителю ответственности; другая архитектурная альтернатива требует отдельной модели/варианта. Пример: `Check source authority → allocated_to → Authority evaluation`. |
| `participates_in` | `participant` → `activity`, `operational_process` или `scenario`. | Участие роли в контексте, не исполнение и не владение. Пример: `Access requester → participates_in → Submit request`. |
| `references` | Контекстный узел или предметная связь → общее определение: source — `scenario`, `functional_chain`, `scenario_message`, involvement, `exchange_item` либо `domain_entity`; target — `participant`, `activity`, `capability`, `function`, `functional_chain`, `functional_exchange`, `exchange_item`, `operational_process`, `domain_entity` или `state`. | Не заменяет композицию, реализацию, специализацию, обмен или временной порядок. Пример: `Function involvement → references → Resolve deployment Resource identity`. |
| `source` | Источник направленного отношения. Допустимые сигнатуры: `functional_exchange` → `function`; `domain_entity` с `domain_subtype: Interaction` → предметный `Component`; `scenario_message` → `participant`. | Ровно один для определения обмена, Interaction и сообщения. Пример: `Request authority evidence exchange → source → Check request authority`. |
| `target` | Получатель направленного отношения; те же парные сигнатуры, что у `source`. | Ровно один; для `functional_exchange` не задаёт порядок выполнения. Пример: `Request authority evidence exchange → target → Create pending request`. |
| `conveys` | `functional_exchange` → `exchange_item`. | Один или несколько передаваемых типов данных; минимум один. Пример: `Request authority evidence exchange → conveys → Authority evidence`. |
| `constrains` | `constraint` → ограничиваемый элемент: узел модели любого предметного/архитектурного типа. | Цель должна быть конкретной; не использовать связь без выраженного правила. Пример: `Source-only admission rule → constrains → Create pending request`. |
| `precedes` | Контекстный узел → следующий контекстный узел того же `functional_chain` или `scenario`: involvement → involvement либо message → message. | Локальный частичный порядок; циклы запрещены. Не соединять глобальные определения функций этим предикатом. Пример: `Request context message → precedes → Admission result message`. |
| `addresses` *(расширение)* | `mission` или `capability` → `problem`. | Добавлено, потому что кандидатная метамодель не имела прямого отношения от проблемного пространства к ответной способности. Не означает полного устранения проблемы. Пример: `Explainable policy capability → addresses → Fragmented access knowledge`. |
| `state_of` *(расширение)* | `state` → `domain_entity`. | Состояние относится к одному доменному типу; не кодирует переход, событие или временное условие. Пример: `PENDING → state_of → AccessRequest`. |

## Отдельное представление сложных отношений

`FunctionalExchange` хранит функции-источник/получателя и `ExchangeItem`. Участие в цепочке задаётся отдельными `FunctionInvolvement` и `ExchangeInvolvement`: у каждого один `references` и один `part_of`. Порядок задаётся `precedes` только между involvement в той же цепочке.

`ScenarioMessage` хранит отправителя/получателя как ссылки `source`/`target`, принадлежность к одному `Scenario`, ссылку на используемый обмен или передаваемое содержание и локальные `precedes`. Определение `Function` или `FunctionalExchange` не дублируется в сценарии.

## Предметная точность и ограничения

- NAPMS `Component` — роль в коммуникационном профиле. `Logical Component` — гипотеза о группировке функциональной ответственности.
- NAPMS `Interaction` — предметный направленный контракт компонентов; `FunctionalExchange` — архитектурный поток между функциями.
- NAPMS `BusinessProcess` — обоснование пользователя; `OperationalProcess` — композиция деятельности.
- NAPMS `Application` — профиль сетевой коммуникации; участником архитектуры является система NAPMS.
- `AccessRequest`, `AccessDecision`, `PolicyRule`, `AuthorityGrant` и `PolicyExport` остаются разными предметными референтами.
- `PolicyExport` — результат/snapshot; `PolicyExportRow` — отдельная производная строка. `READY` и `INCOMPLETE` описывают строку, а не весь результат.
- Product scope и кодовая реализация — независимые свойства capability. Ссылки на OpenSpec сами по себе не доказывают реализацию.

## Методические основания

ARCADIA отделяет operational need, system need и logical solution. В Operational Analysis фиксируются участники, цели, деятельность, контекст и ограничения; System Need Analysis формулирует ожидаемое поведение и обмены; Logical Architecture распределяет функции по логическим компонентам с учётом ограничений. ARCADIA Q&A отдельно различает определения функции, её включения в chain/scenario и контекст сообщения/порядка.

Источники: [ARCADIA](https://mbse-capella.org/arcadia.html), [ARCADIA Q&A](https://mbse-capella.org/arcadia-qna.html), [Capella functional chains](https://github.com/eclipse-capella/capella/blob/master/doc/plugins/org.polarsys.capella.ui.doc/html/05.%20Diagram%20Management/5.5.%20Creation%20of%20Functional%20Chains%20and%20Physical%20Paths.mediawiki), [Capella repository](https://github.com/eclipse-capella/capella).
