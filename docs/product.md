# NAPMS 2.0 — продуктовая основа

**Статус:** REVIEW READY; решения для первого вертикального среза приняты 2026-11-06; прочие положения остаются Confirmed/Candidate/Question согласно пометкам.
**Источник:** NAPMS 1.0, `main` @ `42481577fab7f795cf3a2118b7b6f1c3c075d066`.
**Целевой baseline:** NAPMS 2.0, `main` @ `95f66e03ca3db0b17c506923994a8066b09220ce`.

## Как читать статусы

- **Confirmed** — факт подтверждён актуальной продуктовой/доменной документацией **NAPMS 1.0**; это ещё не означает принятие требования для 2.0.
- **Candidate** — рекомендуемое решение/граница NAPMS 2.0, требующее продуктового согласования.
- **Question** — открытая неоднозначность или противоречие.
- **Excluded** — не переносить автоматически в NAPMS 2.0.
- **Accepted (first slice)** — явно принято для первого среза NAPMS 2.0; не означает принятия всего старого MVP.

## Назначение — Confirmed (источник)

NAPMS позволяет описать повторно используемую семантику сетевых коммуникаций, связать её с конкретно размещёнными компонентами и бизнес-потребностью, запросить разрешение на доступ и получить актуальное, объяснимое представление требуемой сетевой политики, независимое от производителя и устройства.

**Проблема:** коммуникационное назначение, разрешение на доступ и текущая реализация в адресах — разные виды истины. Их смешение приводит к потере происхождения правил, зависимости идентичности доступа от IP и неполному экспорту политики.

**Пользовательская ценность:** оператор получает точное описание того, какой доступ разрешён, почему и на основании каких сетевых данных он может или пока не может быть технически реализован.

Основание: [docs/discovery/first-mvp-hcd-problem-evidence.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/discovery/first-mvp-hcd-problem-evidence.yaml); [docs/requirements/first-mvp-product-requirements.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/requirements/first-mvp-product-requirements.yaml).

## Пользователи и цели — Confirmed

| Роль | Цель | Результат |
|---|---|---|
| Куратор каталога коммуникаций | Описать повторно используемый профиль приложения, роли участников и направленный трафик | Независимый от deployment/IP профиль коммуникаций |
| Инициатор доступа | Запросить конкретное соединение от Resource под своей authority с бизнес-обоснованием | Прослеживаемый AccessRequest и решение ALLOWED/DENIED |
| Сетевой/политический оператор | Получить актуальную выбранную политику без привязки к firewall/vendor | Объяснимые enriched-строки READY/INCOMPLETE и данные для последующей обработки |

Основание: [docs/discovery/first-mvp-hcd-user-needs.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/discovery/first-mvp-hcd-user-needs.yaml).

## Продуктовые возможности — Confirmed в NAPMS 1.0

1. **Resource Catalogue:** стабильные Resource и логические Endpoint; текущий адрес может отсутствовать или измениться.
2. **Application Communication Catalogue:** Application — повторно используемый **профиль сетевых коммуникаций**, Component — роль участника, Interaction — направленная коммуникация с TrafficClauses.
3. **Application Deployment:** конкретная привязка Component к Resource, независимо от адреса.
4. **Business Connectivity:** BusinessProcess и ConnectivityNeed фиксируют основание коммуникации, отдельно от разрешения.
5. **Access Policy:** AccessRequest, решение и единственный текущий PolicyRule для точного AccessSubject; Active/Inactive и условия эффективности.
6. **Authority:** право выполнить действие для actor/action/scope/time; право запросить доступ не равно разрешению самого доступа.
7. **Policy Export:** выбор всей или части текущей политики, согласованная оценка на один момент времени, нормализованные адреса/протоколы/порты и provenance; отсутствующие адреса отражаются как INCOMPLETE, а не теряются.

Основание: [docs/requirements/first-mvp-product-requirements.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/requirements/first-mvp-product-requirements.yaml); [docs/model/strategic/capabilities.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/strategic/capabilities.yaml); [docs/model/use-cases/first-mvp-policy-export.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/use-cases/first-mvp-policy-export.yaml).

## Входы, выходы, ответственность — Confirmed

- **Вход:** описания ресурсов и адресной реализации; профили коммуникаций; deployment; процесс/Need; запрос, полномочия, решение; выбранный scope политики и время оценки.
- **Выход:** текущая объяснимая vendor-neutral policy, включая идентичность Resources, traffic semantics, текущие адреса или признак их отсутствия, источник разрешения/обоснования и evaluation time.
- **Ответственность NAPMS:** формировать и объяснять *желаемую* политику из доменной истины. Решение о праве запросить, решение ALLOWED/DENIED и техническая реализуемость должны оставаться различимыми.

## Границы — Confirmed для прежнего first MVP

В первом MVP NAPMS 1.0 за рамками были: генерация конфигураций конкретного firewall/provider, непосредственное применение правил, сравнение с настроенным состоянием и remediation, вычисление placement/topology/NAT, workflow-engine для бизнес-процессов, автоматический отзыв доступа при исчезновении Need.

Стек backend/frontend, PostgreSQL, OIDC, HTTP-контракты, состав модулей и границы Bounded Contexts — **не продуктовые обязательства NAPMS 2.0**; это отдельные архитектурные решения, которые потребуют собственного обоснования.

Основание: [docs/requirements/first-mvp-product-requirements.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/requirements/first-mvp-product-requirements.yaml); [docs/plans/first-mvp-implementation-readiness.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/plans/first-mvp-implementation-readiness.yaml).

## Дистилляция — решения о переносе

| Категория | Положение | Статус для 2.0 |
|---|---|---|
| Product | Объяснимая vendor-neutral текущая желаемая политика | **Candidate** принять как основную ценность |
| Domain | Устойчивая идентичность Resource/Endpoint, InteractionRevision и AccessSubject | **Candidate** сохранить как существенные семантические различия |
| Domain | Business justification, actor authority, permission и effective state — разные понятия | **Candidate** сохранить как бизнес-инварианты |
| Delivery | HTTP API с FastAPI/OpenAPI и Swagger UI, без frontend в первом срезе | **Accepted (first slice)** |
| Architecture | Конкретные BC, модули, PostgreSQL, OIDC и прочие детали реализации | **Question**: выбирать по необходимости |
| Historical | Старый Harness, его Authority-графы, маршрутизация артефактов, специальные YAML-процедуры | **Excluded** |
| Historical | Старые code/tests, migration history, инструменты проектирования, совместимость форматов и API | **Excluded** как обязательство переноса |

**Важно:** `docs/requirements/first-mvp-policy-export.yaml` имеет статус `SUPERSEDED`. Актуальный документ: [docs/requirements/first-mvp-product-requirements.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/requirements/first-mvp-product-requirements.yaml). Ссылку старого README на заменённый файл нельзя использовать как свидетельство действующих требований.

## Принятые решения NAPMS 2.0 — первый срез (2026-11-06)

1. **Продуктовый результат:** один сквозной сценарий `AccessRequest → ALLOWED/DENIED → PolicyRule → vendor-neutral export` с одним заранее подготовленным коммуникационным примером. Это часть прежнего MVP; остальная функциональность не отклоняется, а откладывается.
2. **Request authority:** для подачи заявки достаточно `access.request` на исходный Resource в момент приёма запроса; наличие полномочий на целевой Resource само по себе не требуется. Решение о разрешении доступа и экспорт проверяются **отдельно**. Уточнение противоречия старого источника — принятое решение 2.0, не исправление NAPMS 1.0.
3. **Постоянный интерфейс:** HTTP API, первоначально FastAPI/OpenAPI + Swagger UI. Клиентская разработка не начинается; Swagger UI — интерфейс проверки, не готовый пользовательский Web UI.
4. **Предустановки:** демонстрационный набор Resources/Endpoints, Application/Components/Interaction, Deployments, BusinessProcess/Need и тестовых субъектов/полномочий. Предустановки **не** содержат автоматически одобренный PolicyRule.
5. **Доверенная граница:** локальный dev/test-профиль с серверным сопоставлением удостоверенного actor с назначенными полномочиями; право принять ALLOWED/DENIED предоставляется отдельно. Клиент не может назначать себе actor, grants или право принятия решений через поля запроса. Dev-профиль не предназначен для публичного доступа.
6. **Экспорт:** JSON/CSV, READY либо INCOMPLETE, provenance и одна согласованная оценка на `evaluationAt`. Выбор механизма хранения остаётся инженерным решением.

См. [first-slice.md](first-slice.md) и [domain.md](domain.md).

## Открытые вопросы реализации

- **P1:** уточнить формат контрактов и техническую реализацию dev-аутентификации в OpenSpec change; сохранить ограничения локального профиля.
- **P1:** выбрать хранение и механизм согласованного snapshot, удовлетворяющие наблюдаемому контракту, без автоматического переноса PostgreSQL из NAPMS 1.0.
- **P2:** пересмотреть требования к масштабу, SLA и жизненному циклу дополнительных сущностей по мере расширения среза.

**Следующий шаг:** принять этот Draft PR после проверки, затем создать первый продуктовый OpenSpec change.