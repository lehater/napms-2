# NAPMS 2.0 — Product Capability Map

**Статус:** продуктовый baseline для планирования; классификация A/C/O — предварительная и не расширяет принятые OpenSpec. **Дата сверки:** 2026-11-14. **Источник:** NAPMS 1.0 → NAPMS 2.0, без автоматического переноса legacy.

## Назначение и границы

Карта фиксирует **постоянную функциональную структуру** NAPMS (L1: область, L2: наблюдаемая возможность). Это независимая от GitHub Issues, Epics и временного Roadmap модель. Функциональная область не обязана совпадать с Bounded Context или пунктом Sidebar; для одной L2 не требуется отдельная Issue. Ролевые полномочия и разрешённый сетевой доступ — разные факты.

**Состояния scope:** `A` — семантика принята в направлении 2.0 (не гарантия полного UI/API/CRUD или production); `C` — кандидат на Product Discovery, без коммитмента; `O` — вне текущего принятого плана, не исключение из возможного целевого продукта. **Состояние реализации** оценивается отдельно по main и PR. Этапы: `R0` локальное policy-ядро, `R1` end-to-end MVP, `D` discovery без срока, `—` вне плана. Сценарии J01–J08 из исследовательской [карты пользовательских путей](../research/user-journeys.md) служат ориентиром трассировки, а не доказательством принятия требований.

| Классификация | Количество | Значение |
|---|---:|---|
| A | 14 | Принятое семантическое ядро, частичная либо ограниченная реализация допустима |
| C | 15 | Требует независимого продуктового решения |
| O | 9 | Вне текущего Roadmap; без Epics/Issues |

## L1 → L2

### Resource Management (C01–C04)

**Пользовательские сценарии:** J01, J06. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C01 · Регистрация Resource** | Независимая от IP единица доступа | имя, scope → register → стабильный Resource | A | R1 | PR #67 |
| **C02 · Endpoint и адресная реализация** | Сохранить идентичность при смене адреса/отсутствии IP | Resource → endpoint, set/clear address → текущий адрес/UNKNOWN | A | R1 | PR #67 |
| **C03 · Scope, Site, ответственность** | Отделить принадлежность от допуска и контакта | Resource, организация → установить ответственность → контакт/аффилиация | C | D | Нет принятой delivery-задачи |
| **C04 · История Resource** | Объяснить изменение адресов и владельцев | изменение → история и effective now → аудит | C | D | Нет принятой delivery-задачи |

### Application Communication (C05–C07)

**Пользовательские сценарии:** J01. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C05 · Профили коммуникаций** | Повторное использование сетевой семантики | смысл протокола → создать/найти профиль → Application | A | R1 | Issue #64 · PR #65 |
| **C06 · Роли компонентов** | Описать участников, а не устройства | Application → описать Client/API роль → Component | A | R1 | Issue #64 · PR #65 |
| **C07 · Directed Interaction и версии трафика** | Фиксировать семантику IP-протокола/портов и эволюцию | Component A/B → направленный контракт → versioned traffic | A | R1 | Issue #64 · PR #65; #72 / Draft PR #73 (расширение портов) |

### Application Deployment (C08)

**Пользовательские сценарии:** J01, J02. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C08 · Размещение Component** | Соединить шаблон и конкретный Resource | Component + Resource → размещение → стабильный deployment | A | R1 | Issue #64 · PR #65 |

### Business Connectivity (C09–C11)

**Пользовательские сценарии:** J01–J03. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C09 · Business Process** | Объяснять, ради чего нужна сеть | название, организация, критичность → процесс | A | R1 | PR #44 |
| **C10 · Connectivity Need** | Отделить потребность от разрешённого доступа | процесс + interaction + участник → Need | A | R1 | PR #51 |
| **C11 · Атрибуция/актуальность потребностей** | Увидеть риск потери обоснования и оценить влияние | Need + стороны + историчность → current/retired basis | C | D | Нет принятой delivery-задачи |

### Authority Management (C12)

**Пользовательские сценарии:** J02, J04. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C12 · Authority admission** | Различать право действовать, ответственность и разрешение трафика | actor/action/scope/time → admission → admitted/denied | A | R0/R1 | PR #5 |

### Access Governance (C13–C17)

**Пользовательские сценарии:** J02, J03. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C13 · Выбор доступных коммуникаций** | Предложить технически допустимые варианты вместо ручных UUID | source Resource → backend discovery → destination/traffic candidates | A | R1 | Issue #37 · PR #55 |
| **C14 · Заявка на сетевой доступ** | Зафиксировать точный запрос с business basis | source/destination deployments + revision + Need → submit → PENDING | A | R0/R1 | PR #5 · Issue #37 / PR #55 |
| **C15 · Формальное решение** | Отделить admission от ALLOWED/DENIED | PENDING + полномочие → решить → ALLOWED/DENIED | A | R0/R1 | PR #5 · PR #55 |
| **C16 · PolicyRule и lifecycle** | Сохранить желаемый доступ и его effective state | ALLOWED + subject → Rule; change state → effective/non-effective | A | R0/R1 | Issue #36 · PR #5 / #55 |
| **C17 · Ревизии правила, обоснования и история** | Не перезаписать текущий доступ pending-изменением | новая Revision/Need → proposal/decision → explainable history | C | D | Нет принятой delivery-задачи |

### Policy Export (C18)

**Пользовательские сценарии:** J04. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C18 · Vendor-neutral policy export** | Показать требуемые технические разрешения без firewall | effective Rules → coherent view → table/CSV READY/INCOMPLETE | A | R0/R1 | Issue #36 · PR #5 / #55 |

### Connectivity Analysis (C19–C20)

**Пользовательские сценарии:** J06. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C19 · Scoped Connectivity Inventory** | Ответить «что связано с моими ресурсами» | scope → агрегировать owner facts → связи/состояния | C | D | Нет принятой delivery-задачи |
| **C20 · Traffic Checker** | Объяснить технический 5-tuple в бизнес-контексте | tuple → correlate sources → explanation/UNKNOWN/AMBIGUOUS | C | D | Нет принятой delivery-задачи |

### Technical Access Evidence (C21–C25)

**Пользовательские сценарии:** J05. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C21 · Сбор конфигурации устройств** | Получать зафиксированные факты настроенной сети | source + credentials + time → capture → technical payload | C | D | Нет принятой delivery-задачи |
| **C22 · Импорт flow/IPFIX** | Узнать наблюдаемое взаимодействие | flow source/time → normalization → evidence | C | D | Нет принятой delivery-задачи |
| **C23 · Файловый импорт** | Обрабатывать выгрузки без live устройства | file + declared provenance → normalized evidence | C | D | Нет принятой delivery-задачи |
| **C24 · Нормализованное Technical Access Evidence** | Отделить наблюдение от разрешения и достоверности | captures → immutable source-qualified facts → queryable evidence | C | D | Нет принятой delivery-задачи |
| **C25 · Evidence Access Recognition** | Сопоставлять фактические коммуникации с известными объектами | evidence → match → recognized/ambiguous/unresolved candidate | C | D | Нет принятой delivery-задачи |

### Network Policy Realization (C26–C34)

**Пользовательские сценарии:** J07. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C26 · Каталог firewall/targets** | Знать границы проверки и применения | device/source inventory → target state & identity | O | — | Нет принятой delivery-задачи |
| **C27 · Enforcement placement / Network Context** | Локализовать кандидатов enforcement без ложного «маршрут доказан» | pair + network snapshot → 0..N кандидатов/unknown | O | — | Нет принятой delivery-задачи |
| **C28 · Required Policy Materialization** | Построить целевую политику на конкретных enforcement targets | effective Rule + addresses + placement → target permits/unresolved | O | — | Нет принятой delivery-задачи |
| **C29 · Provider Policy Interpreter** | Преобразовать ACL/config в сопоставимую configured-effective семантику | provider config + coverage/time → effective permits or unknown | O | — | Нет принятой delivery-задачи |
| **C30 · Policy reconciliation** | Выявлять common/missing/excess и Uncomparable | required + configured → compare → Realized/Drift/Uncomparable | O | — | Нет принятой delivery-задачи |
| **C31 · VerifiedChangeIntent** | Предложить безопасное дополнение отсутствующего доступа | missing + preconditions → additive ENSURE-PERMIT or reject | O | — | Нет принятой delivery-задачи |
| **C32 · Provider renderer** | Получить vendor payload без потери семантики | verified intent + provider capabilities → artifact/digest/proof | O | — | Нет принятой delivery-задачи |
| **C33 · Network operations** | Контролируемое внесение изменения с audit | artifact + authority + precheck → apply/postcheck → outcome | O | — | Нет принятой delivery-задачи |
| **C34 · Повторная проверка convergence** | Не путать успех применения с достигнутым состоянием | apply → independent recapture → new compare → verified drift/realized | O | — | Нет принятой delivery-задачи |

### Analytics & Reporting (C35–C36)

**Пользовательские сценарии:** J08. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C35 · Connectivity impact** | Понять последствия изменения Need/Resource/Rule | change → impact composition → affected Process/Resources | C | D | Нет принятой delivery-задачи |
| **C36 · Отчётность и аудит** | Объяснить состояние, изменения, пробелы доверия | provenance → reports/historical comparison | C | D | Нет принятой delivery-задачи |

### Integration & Operations (C37–C38)

**Пользовательские сценарии:** J08. 

| L2 | Назначение / решаемая проблема | Вход → результат | Scope | Этап | Delivery evidence |
|---|---|---|:---:|:---:|---|
| **C37 · IdP/CMDB/authoritative sources** | Не подменять внешний источник локальной догадкой | external source → scoped mapped/imported knowledge → provenance | C | D | Нет принятой delivery-задачи |
| **C38 · Диагностика и качество данных** | Делать сбои импорта, freshness и gaps видимыми | capture/import fail → diagnostic; history → support | C | D | Нет принятой delivery-задачи |

## Правила трассировки и применения

1. **Capability → сценарий → критерий приёмки → Epic/Issue → PR**: трассировать в обе стороны, не заводить новые Issues для уже доставленного результата. Одно Epic может развивать несколько Cxx; одна Cxx — несколькими независимыми срезами.
2. Факт существования PR не равен пользовательской приёмке; `merged`, `Issue closed`, `accepted requirement` и `implemented` — отдельные статусы. Подробный учёт изменений ведётся в [Roadmap](roadmap.md) и GitHub.
3. C13 принят как **контекстный выбор** ревизии/размещений для заявки, а не контракт универсального discovery API. C17 (изменение/отзыв PolicyRule) ещё требует отдельного решения; `DENIED` — отказ по заявке, не отзыв доступа.
4. C26–C34 оставить видимыми как потенциальную network-realization цепочку. **Не создавать Epics/Issues, не назначать сроки и не обещать реальную настройку firewall.**
5. Жизненный цикл NAPMS 2.0 расширяется вертикальными реальными срезами React → FastAPI → SQLite с серверными проверками полномочий; согласованные UX-ограничения видимости остаются поздней работой, но backend security действует сейчас.

## Источники

- [Исследовательский реестр 38 возможностей](../research/product-capability-inventory.md) и [traceability требований](../research/product-requirements-traceability.md)
- [Сценарии J01–J08](../research/user-journeys.md)
- [Продуктовая основа 2.0](../product.md), [доменная модель](../domain.md), [первый срез](../first-slice.md)
- [NAPMS 1.0 — strategic capabilities](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/strategic/capabilities.yaml)
- [Issue #74 — проектная структура](https://github.com/lehater/napms-2/issues/74)
