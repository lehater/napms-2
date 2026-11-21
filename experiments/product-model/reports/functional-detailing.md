# Функциональная детализация Application Communication и Business Connectivity

**Дата:** 2026-11-21 · **Основа:** Baseline v0.1 и [семантический аудит](semantic-audit.md).
**Граница:** J01 от выбранного или созданного Application-профиля и его направленной коммуникации до сохранённого BusinessProcess-backed ConnectivityNeed. Обслуживание Resource/Endpoint и создание ComponentDeployment остаются контекстом пути, но не декомпозируются здесь; AccessRequest начинается за границей этого фрагмента.

## Вывод

Из двух существующих System Functions выведено пять Logical Functions. Они покрывают требуемую функциональную композицию J01 через `Application → Component roles → Interaction@Revision` и `BusinessProcess → ConnectivityNeed`. В графе сохранены направленность Interaction и роль source Component у ConnectivityNeed.

Кандидаты на повторное использование проверены. Новую функциональность не дублируют: существующие `Manage communication contracts` и `Maintain business justification` используются как System Function-абстракции для новых Logical Functions. Ни одна существующая Logical Function не эквивалентна функциям создания каталожного контракта или записи потребности. `Select communication context` остаётся в цепочке подачи заявки: оно выбирает уже описанные объекты для AccessRequest и не создаёт их. `Resolve deployment Resource identity` не включена, поскольку Need по доменному контракту независима от Deployment и адреса.

В просмотренных коде и тестах найдены пути для всех пяти функций. У `Maintain BusinessProcess` отсутствует поле criticality из описания C09; текущий дизайн явно отложил его. Тесты не запускались, и ни наличие `realizes`, ни найденные тестовые файлы не трактуются как полное покрытие Capability. Логические определения остаются концептуальными ответственностями и не выдаются за функции с теми же границами в коде.

## Выведенные функции и ответственность

| Logical Function | Абстракции | Логический компонент | Краткий контракт |
|---|---|---|---|
| [Maintain Application profile](../vault/knowledge/functions/maintain-application-profile.md) | C05; Manage communication contracts; Define communication | Catalog and placement | Вход: намерение выбрать или записать профиль. Выход: идентичность Application. Профиль описывает повторно используемую коммуникацию, не software instance. |
| [Define Component roles](../vault/knowledge/functions/define-component-roles.md) | C06; Manage communication contracts; Define communication | Catalog and placement | Вход: Application и роли участников. Выход: Component identities этого Application; роли не являются устройствами или Logical Components. |
| [Define directed Interaction and traffic revisions](../vault/knowledge/functions/define-directed-interaction-revisions.md) | C07; Manage communication contracts; Define communication | Catalog and placement | Вход: Application, source/destination Component и traffic. Выход: directed Interaction и immutable traffic revision. |
| [Maintain BusinessProcess](../vault/knowledge/functions/maintain-business-process.md) | C09; Maintain business justification; Express connectivity need | Business justification | Вход: цель процесса, организация и criticality. Выход: BusinessProcess. Ответственность и criticality не дают authority; criticality сейчас отложено. |
| [Record ConnectivityNeed](../vault/knowledge/functions/record-connectivity-need.md) | C10; Maintain business justification; Express connectivity need | Business justification | Вход: BusinessProcess, Interaction и его source Component. Выход: ConnectivityNeed, не зависящая от Revision, Deployment и IP и не создающая permission. |

Определения содержат входы, выходы, ответственность, предусловия, гарантии и ограничения. `Catalog and placement` расширен как гипотеза группировки ответственности за Application/Component/Interaction и Resource/Deployment catalog facts. Отдельный гипотетический `Business justification` сохраняет границу между бизнес-обоснованием и Access Governance.

Связи Logical Function → System Function, Capability и Operational Activity означают участие в реализации или трассировке выбранной части поведения. Они **не** доказывают полное функциональное покрытие C05–C10. В графе нет статуса полноты Capability; полное покрытие в этом эксперименте не заявлено.

## Функциональная композиция

[Prepare a J01 ConnectivityNeed](../vault/knowledge/chains/prepare-j01-connectivity-need.md) содержит пять контекстных Function Involvement и четыре Functional Exchange. Передаваемые данные — Application profile, Component roles, directed Interaction/source participant и BusinessProcess context. Для формирования Need заданы только необходимые зависимости: профиль предшествует ролям, роли — Interaction, а Interaction и BusinessProcess — записи Need. Совместимая published revision может быть входом выбора в API, но сама Need сохраняет только Interaction и source Component. Порядок между созданием Interaction и BusinessProcess не зафиксирован.

J01 Scenario ссылается на эту цепочку. Сообщения J01 теперь различают каталог коммуникации, входное бизнес-основание и ответ с записанным ConnectivityNeed. Переходы состояний и условные ветви не добавлялись.

### Композиционное ограничение, обнаруженное в аудите

Baseline связывал ConnectivityNeed с Component через широкое `references`, поэтому модель не указывала, что это именно source participant. Исправлена конкретная сигнатура метамодели: `source` допускает `ConnectivityNeed → source Component`. Каноническая сущность Need теперь использует её вместо generic Component reference; existing `Interaction → source/target Component` сохранены. Это позволяет выразить предметную роль без нового общего отношения.

Доменная цепочка намеренно не включает `ComponentDeployment → Resource` как вход Need: NAPMS хранит эти смыслы отдельно. Если соединить их в одну обязательную зависимость, граф ошибочно представил бы Need зависящей от размещения или IP. Для J01 эти факты остаются связанным, но самостоятельным каталоговым фрагментом.

## Реализация в текущем checkout

| Поведение | Найденные код и тесты | Вывод по объёму |
|---|---|---|
| Выбрать/создать Application profile | [use_cases.py](../../../src/napms/use_cases.py#L207) (`create_application`, list/get); [test_application_catalog.py](../../../tests/test_application_catalog.py) | Найдены запись и выбор из каталога; тесты не запускались. |
| Создать Component role в Application | [use_cases.py](../../../src/napms/use_cases.py#L230); [test_application_catalog.py](../../../tests/test_application_catalog.py) | Найдены API и проверка принадлежности роли Application. |
| Создать Interaction и опубликовать новую traffic revision | [use_cases.py](../../../src/napms/use_cases.py#L263); [use_cases.py](../../../src/napms/use_cases.py#L291); [test_interaction_revisions.py](../../../tests/test_interaction_revisions.py) | Найдены API и тестовые сценарии направленной пары/ревизий. |
| Создать или обновить BusinessProcess | [use_cases.py](../../../src/napms/use_cases.py#L421); [test_business_processes.py](../../../tests/test_business_processes.py); [Process schema](../../../src/napms/http.py#L50); [Process form](../../../web/src/BusinessProcesses.tsx#L95) | Реализованы name, description, responsibleOrganization и lifecycle. Criticality отсутствует в схеме и форме; [design](../../../openspec/changes/persist-business-process/design.md#L17) явно отложил её до отдельного запроса. |
| Записать ConnectivityNeed | [use_cases.py](../../../src/napms/use_cases.py#L510); [test_connectivity_needs.py](../../../tests/test_connectivity_needs.py); [business-processes.spec.ts](../../../web/e2e/business-processes.spec.ts) | Сервис выводит Interaction и source Component из выбранной revision; запись хранит process, interaction и participant. E2E-файл найден, не запускался. |

Целиком отсутствующей функции в J01-срезе не выявлено. Установлено одно отсутствующее требование внутри C09: BusinessProcess criticality не хранится и не вводится в текущем срезе. Это явно отложено проектным решением, а не подтверждено как выполненное. Вывод основан на статическом соответствии кода контрактам и тестовым сценариям, а не на полном приёмочном прогоне; тесты не запускались. Capability C11 (Need attribution/currentness) не включена: это candidate, она не требуется для данного фрагмента J01.

## Проверки и ревью в Obsidian

Статическая проверка текущего графа прошла: YAML/frontmatter и обязательные поля, разрешение wikilinks, проверенные сигнатуры отношений (включая новую source-сигнатуру), дубли и self-reference, кратности обменов/участий, локальность и ацикличность `precedes`, Canvas files/edge endpoints и соответствие Canvas labels отношениям YAML, Bases YAML и K-Plex JSON.

| Показатель текущего графа | Результат |
|---|---:|
| Канонические узлы | 207 |
| Типизированные отношения | 456 |
| Function-узлы | 27, включая 5 добавленных Logical Functions |
| Functional Chains | 4, включая J01 chain |
| Functional Exchanges / exchange items | 14 / 12 |
| Constraints | 16, включая immutability Revision и уникальность tuple Need |
| Canvas / Bases | 6 / 4 |

Для ревью открыть Vault и проверить вместе [Functional Breakdown](../vault/views/Functional%20Breakdown.canvas), [Functional Chains](../vault/views/Functional%20Chains.canvas), [Logical Architecture](../vault/views/Logical%20Architecture.canvas), [Cross-level Traceability](../vault/views/Cross-level%20Traceability.canvas) и [Domain Model](../vault/views/Domain%20Model.canvas). Факты отношений остаются в YAML заметок; Canvas — навигационные проекции.
