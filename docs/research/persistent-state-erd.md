# NAPMS — логическая ERD сохраняемого состояния

**Статус: RESEARCH / предложение для ревью. Не Accepted N2 OpenSpec и не физическая SQL-схема.**

[PlantUML-диаграмма](persistent-state-erd.puml)

## Назначение

Зафиксировать согласованное в обсуждении разделение **устойчивого состояния** и **вычисляемых результатов**. Диаграмма показывает логические сущности и их предметные ссылки. Cross-context Ref не обязательно является внешним ключом базы данных. Она не предписывает новые таблицы NAPMS 2.0.

## Подтверждённые принципы

- Каталоги RC, ACC, AD, BC и политика AP — связанная предметная модель. Для намеренных заявок необходимы BusinessProcess и ConnectivityNeed. Need связан с Interaction, не с IP.
- InteractionRevision и TrafficClause неизменяемы по инварианту; изменённый traffic создаёт новую Revision. Нет поля immutable:boolean. TrafficClause является owned value, отдельная SQL-таблица не обязательна.
- AccessSubject определяется точной упорядоченной тройкой (source ComponentDeployment, destination ComponentDeployment, InteractionRevision). Для одного subject максимум один PolicyRule. ALLOWED создаёт/повторно использует Rule; DENIED не создаёт Rule и не отзывает существующее разрешение.
- Декларированная политика — совокупность эффективных ACTIVE PolicyRule. Отдельные DeclaredPermit/DeclaredPolicy таблицы не нужны.
- TAE — автономное хранилище: Source/Set/Entry. EvidenceSet хранит метаданные конкретного захвата/импорта, Entry — пять нормализованных измерений (source/destination addresses, IP protocol, source/destination ports), опциональный effect и provenance. Исторические совпадающие записи не уничтожаются дедупликацией.
- Unknown, Any и NotApplicable — различные значения. Отсутствующее поле нельзя безусловно интерпретировать как Any; несохраняемая без искажения семантика должна приводить к отказу от нормализации.
- Источник факта может быть Configured, TrafficDerived или Imported; факт не равен разрешению. Снимок не доказывает полноту охвата только потому, что он существует, даже если в нём 0 строк.
- Между TechnicalAccessEntry и PolicyRule нет ERD-связи. Сопоставление зависит от сценария и является вычислением. Между TAE и Firewall также нет постоянной связи; возможная корреляция выполняется вне модели хранения.
- Matching/Recognition и APR (common, missing, excess) не требуют собственных долговременных сущностей, пока нет принятого требования сохранять результаты. Network operations и provider-specific payload не входят в этот срез.

## NEP: сохраняемое состояние маршрутизации

В NAPMS 1.0 найден [ADR-018](https://github.com/lehater/napms/blob/main/docs-legacy/decisions/ADR-018-nep-firewall-current-state-candidate-model.md) и готовая [каноническая диаграмма NEP](https://github.com/lehater/napms/blob/main/docs-legacy/domain/network-enforcement-placement/target-tactical-model.md#13-canonical-erd). В логическую ERD добавлены исключительно хранимые данные:

- `Firewall` — стабильная идентичность МЭ, состояние Active/Inactive, профиль подключения и индивидуальная политика сбора.
- `CurrentRoutingState` (0..1 на Firewall), `NetworkInterface`, `RoutingEntry` — только последняя успешно принятая маршрутизация, с `collectedAt` и `stateVersion`. Текущее состояние перезаписывается атомарно; повторные исторические снимки не хранятся в NEP по этому контракту. Ошибка обновления сохраняет прежние рабочие данные.
- `CandidateOverrideRule` — самостоятельные долговременные администраторские Include/Exclude с опциональными ограничениями на диапазоны адресов/интерфейсы. Целевое правило выбора: Include > Exclude > Routing.
- `EffectiveReachabilitySegment` и его `EffectiveReachabilityInterface` — хранимый, но восстанавливаемый индекс/проекция для batch SQL; сохраняет VRF и несколько ECMP-интерфейсов; меняется атомарно с CurrentRoutingState.
- `CurrentPolicyBindingState` — при необходимости текущее состояние метаданных ACL/policy-binding; отдельная жизнь от routing acquisition.

**Не показаны как сохраняемые сущности:** `TrafficPair`, `LocalBranch`, `FirewallCandidate`, `AccessListLocator` (вычислительный результат), asOf-модель прошлых путей, результаты APR/matching. NEP определяет только кандидатов на enforcement, а не доказанный end-to-end маршрут; конфигурация ACL и её семантика принадлежат другим задачам.

**Сохраняется независимость TAE:** статическая ссылка `EvidenceSource → Firewall` в ERD не создаётся. NEP и TAE могут собирать разные сведения об одном физическом устройстве независимо; cross-context correlation — отдельный контракт.

## Границы подтверждения

- **N2 Accepted:** [access-requests](../../openspec/specs/access-requests/spec.md), [access-decisions](../../openspec/specs/access-decisions/spec.md), [policy-export](../../openspec/specs/policy-export/spec.md). Логическая AccessDecision и AccessSubject не обязательно являются отдельными SQL-таблицами.
- **Действующая N1 предметная модель:** [RC](https://github.com/lehater/napms/blob/main/docs/model/contexts/resource-catalogue/domain-model.yaml), [ACC](https://github.com/lehater/napms/blob/main/docs/model/contexts/application-communication-catalogue/domain-model.yaml), [BC](https://github.com/lehater/napms/blob/main/docs/model/contexts/business-connectivity/domain-model.yaml).
- **Исторический целевой контракт N1:** [TAE Tactical Model](https://github.com/lehater/napms/blob/main/docs-legacy/domain/technical-access-evidence/tactical-model.md) и [APR Tactical Model](https://github.com/lehater/napms/blob/main/docs-legacy/domain/access-policy-realization/tactical-model.md). Наличие там модели не доказывает реализацию в NAPMS 2.0.
- **Статус NEP:** в историческом [NAPMS 1.0 Target Tactical Model](https://github.com/lehater/napms/blob/main/docs-legacy/domain/network-enforcement-placement/target-tactical-model.md) прямо предусмотрены хранимые Firewall, CandidateOverrideRule, CurrentRoutingState, интерфейсы, маршруты и persisted EffectiveReachability. Это **целевая модель N1**, а не реализованный или нормативно принятый N2 контракт. В том же документе перечислены пробелы реализации N1.
- **Гипотезы:** отдельный EvidenceSource-каталог (в прежней TAE-модели identity источника находится внутри EvidenceSet), способ физического хранения clause/decision, структура SQL и интеграция NEP/TAE. Это не принятые миграции.
- **Открытые X01/X02/X03:** lifecycle Rule/revision/withdrawal и расширенная адресная материализация; диаграмма их не разрешает. См. [Product Discovery gaps](product-discovery-gaps.md).

## Последствия для UI

Разделы каталогов/заявок/разрешений опираются на устойчивые предметные ссылки. Раздел TAE показывает источники, снимки, записи. Matching — отдельный вычислительный сценарий по выбранным входам, не навигация по заранее сохранённому FK. Этот документ не изменяет текущий frontend, backend, Harness или OpenSpec.

## Проверка перед принятием

Проверить PlantUML-рендеринг и кардинальности, особенно Source как гипотезу и логический/физический статус AccessSubject, AccessDecision и TrafficClause. Затем принять или скорректировать предложенную модель отдельным решением.