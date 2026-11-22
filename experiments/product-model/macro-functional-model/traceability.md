# Traceability

## Источники функциональной границы

| Модельное утверждение | Источник и точка опоры |
|---|---|
| Назначение: связать повторно используемую семантику, размещённые компоненты и бизнес-потребность; сформировать объяснимое желаемое vendor-neutral policy | `docs/product.md`, разделы «Назначение» и «Входы, выходы, ответственность» |
| Внешние участники: куратор коммуникаций, инициатор доступа, оператор политики | `docs/product.md`, таблица «Пользователи и цели» |
| Устойчивые различия Resource/address, коммуникационного смысла, ConnectivityNeed, authority, permission и effective policy | `docs/domain.md`, «Сущности и ответственность», «Минимальная цепочка смысла», уточнения NAPMS 2.0 |
| Capabilities и смысл A/C/O | `docs/product/capability-map.md`, C01–C38 и вводное пояснение scope |
| Запрос создаёт отдельный PENDING AccessRequest с exact subject и source-only authority evidence | `openspec/specs/access-requests/spec.md`, Exact stable AccessSubject; Source-only request admission; Auditable independent requests |
| Решение имеет независимую authority; DENIED не создаёт Rule; ALLOWED создаёт/переиспользует один канонический Rule | `openspec/specs/access-decisions/spec.md`, все четыре requirements |
| Export только effective ACTIVE policy, coherent snapshot, сохранение provenance, INCOMPLETE при отсутствующем адресе; JSON/CSV | `openspec/specs/policy-export/spec.md`, requirements Only effective Rules, Readiness without data loss, Coherent single evaluation, Machine-readable JSON and CSV |
| Реальные операции и проверки | `src/napms/use_cases.py`; `tests/test_acceptance.py`, `tests/test_request_composition.py`, `tests/test_current_policy.py`, `tests/test_transactions.py`, `tests/test_security.py` |
| Начальные импортированные типы и семантические ограничения | `experiments/product-model/sysml-pilot/model.sysml`, `experiments/product-model/sysml-pilot/report.md` |

## Связь макрофункций с Capabilities

| Macro function | Capability IDs | Вид связи |
|---|---|---|
| F1 EstablishConnectivityContext | C01–C10, частично C12 | Классификация областей каталога и connectivity basis; не означает один агрегат или один workflow |
| F2 AdmitAccessRequest | C12–C14 | F2 использует/реализует outcome соответствующих capability |
| F3 DecideAndMaintainPolicy | C12, C15–C16 | Решение и каноническое текущее разрешение |
| F4 EvaluateDesiredPolicy | C12, C18 | Авторизованная производная materialization |

Capability-коды не являются функциями или типами в SysML модели; они приведены здесь как классификация, чтобы не дублировать Capability Map в виде новых определений.

## Типизированные зависимости и связи

1. **Композиция:** `NAPMSMacroFunctions` содержит usage каждой из четырёх action definitions. Это группировка макрофункций внутри чёрного ящика; она не утверждает общий обязательный маршрут.
2. **Данные:** F1 выдаёт `ConnectivityContext`, передаваемый в F2. F2 принимает `AccessRequestData` и `AuthorityEvidence`, выдаёт AccessRequest и AdmissionEvidence. F3 принимает AccessRequest, RequestDecision и отдельную AuthorityEvidence, выдаёт AccessDecisionEvidence и необязательный EffectivePolicy. F4 независимо принимает PolicyExportSelection, export AuthorityEvidence и уже доступный EffectivePolicy как входное состояние и выдаёт PolicyExportResult. Композиция не связывает результат F3 напрямую с F4.
3. **Capability classification:** отношения F↔Cxx — только классификационные ссылки этого документа, не поток данных и не композиция SysML.
4. **Порядок:** модель не содержит `first`, `then`, `succession` или временного ограничения между четырьмя макрофункциями. F4 использует уже имеющееся effective policy как отдельное входное состояние, но оно не связано с выходом F3 в той же композиции; экспорт не обязан следовать за решением в одном запуске.
5. **Переиспользование:** пилотные типы импортированы. Пилотные action definitions не вызываются, чтобы не закрепить недействительную общую последовательность. Новые function definitions пилота не дублируются.

## Матрица уровня подтверждения

| Фрагмент | Принятое требование | Подтверждено текущей реализацией | Целевая гипотеза | Неизвестно |
|---|---|---|---|---|
| F1 каталог и бизнес-контекст | Семантика C01–C10 неоднородна по принятому статусу карты; доменные связи заданы документацией | Есть реальный код/тесты для основных текущих срезов каталога; полнота полного набора C01–C10 не предполагается | Более полный согласованный контекст, чем покрывают отдельные текущие UI срезы | Точная полнота текущего UI и жизненного цикла каждой сущности за пределами проверенных путей |
| F2 заявка | AccessRequest OpenSpec | API/use cases и автоматические тесты подтверждают реализованные request paths; это не доказательство полного UI-пути | Общий устойчивый пользовательский путь запроса по подготовленному контексту | Production identity/deployment model |
| F3 решение/Rule | Access-decisions OpenSpec | Use cases и acceptance/security/transaction tests покрывают отдельное решение, инварианты Rule и authority | Более развитый lifecycle/evidence beyond current contracts | Будущие изменения, отзывающие/версионирующие Rule и Needs |
| F4 export | Policy-export OpenSpec | Код и тесты проверяют scope, snapshot, status, address completeness, provenance, JSON/CSV | Любая последующая связка с external realization | Реализация на конкретных сетевых устройствах явно вне этой модели |

OpenSpec описывает принятые требования; он не всегда свидетельствует о фактически развёрнутом продукте. Capability Map A/C/O не используется в качестве статуса реализации.
