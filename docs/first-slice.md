# NAPMS 2.0 — первый вертикальный срез

**Статус:** ПРИНЯТО для первого среза NAPMS 2.0 (2026-11-06); REVIEW READY для merge. Реализации и OpenSpec change пока нет.
**Source baseline:** `lehater/napms@42481577fab7f795cf3a2118b7b6f1c3c075d066`.

## Принятый сценарий

**Заявка → доверенное ALLOWED/DENIED → правило (только для ALLOWED) → объяснимый vendor-neutral экспорт.**

Пользовательская цель: на основании одного явно разрешённого сценария коммуникации получить пригодную для просмотра/передачи нормализованную строку желаемого доступа — с источником, назначением, протоколом, портами, происхождением решения и признаком готовности адресов.

**Почему этот срез:** проверяет основную полезность NAPMS — независимое от firewall описание того, *что разрешено, почему и что технически известно* — через постоянный HTTP-интерфейс, но без полного каталожного UI, большого approval workflow и provider adapters. Это **принятая ограниченная часть** старого vendor-neutral export journey, а не весь прежний MVP.

Источники: [docs/discovery/first-mvp-hcd-user-needs.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/discovery/first-mvp-hcd-user-needs.yaml); [docs/model/tasks/policy-export-task-model.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/tasks/policy-export-task-model.yaml); [docs/model/use-cases/first-mvp-policy-export.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/use-cases/first-mvp-policy-export.yaml).

## Границы одного кейса

| Шаг | Вход | Ответственность | Наблюдаемый выход |
|---|---|---|---|
| 1. Описание | Два Resource с логическими Endpoint; один Application-профиль, две Component роли, один направленный Interaction/Revision с IP protocol/port; два ComponentDeployment; один BusinessProcess/ConnectivityNeed | Установить смысл и адресную реализацию независимо друг от друга | Валидированный семантический предмет доступа |
| 2. Запрос и решение | Actor, source-scope `access.request` authority, конкретный AccessSubject и Need, затем **отдельное явное** ALLOWED/DENIED от доверенного решающего субъекта | Различить admission, permission и provenance; DENIED не создаёт Rule | Для ALLOWED один stable PolicyRule (initial Active); для DENIED — только решение |
| 3. Экспорт | Выбранный Rule, actor с `policy.export` authority, логический evaluationAt и согласованный текущий набор Resource адресов | Проверить эффективность и права, соединить семантику с адресами, сохранить происхождение | Enriched vendor-neutral таблица и CSV: READY с адресами либо INCOMPLETE с null адресом |

**Минимизация реализации:** один демонстрационный набор связанных понятий и постоянный HTTP API на FastAPI, доступный при локальном запуске через Swagger UI. Точные JSON-схемы и хранение — ответственность OpenSpec change. Данные для демонстрации и тестов создаются явной и повторяемой инициализацией среды; **одобренный PolicyRule не появляется в предустановках**, а формируется только после доверенного ALLOWED. Ввод новых каталогов, CLI как пользовательский интерфейс и полноценный frontend не требуются.

## Обязательные правила в первом срезе

1. `AccessSubject` основан на exact sourceDeployment + destinationDeployment + immutable InteractionRevision; IP не входит в identity.
2. Для подачи AccessRequest сервер проверяет `access.request` **только на source Resource scope**; destination `access.request` не требуется. Право подать запрос ≠ ALLOWED (P0-решение 2026-11-06; см. [domain.md](domain.md)).
3. `DENIED` даёт ноль Rule; `ALLOWED` создаёт или находит единственный Rule с тем же AccessSubject; initial state Active.
4. `policy.export` проверяется до выдачи выбранных данных; выбранная политика оценивается в одном согласованном состоянии на один evaluationAt.
5. Неэффективный Rule не материализуется; READY содержит полные адрес/протокол/порт, INCOMPLETE сохраняет Resource identity, nullable address, traffic и provenance и не считается готовым permit.
6. Ни BusinessNeed, ни responsibility metadata не заменяют authority/permission.
7. Для каждого результата прослеживается исходный actor/request, решение, Rule, Need, semantic traffic и актуальная техническая реализация. Историческое решение не переписывается сменой IP.

Основные требования источника: [docs/requirements/first-mvp-product-requirements.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/requirements/first-mvp-product-requirements.yaml), `REQ-AUTH-001..002`, `REQ-PERM-001..003`, `REQ-RULE-001..002`, `REQ-RULE-005`, `REQ-EXP-002..007`, `REQ-PROV-001`.

## Проверяемые критерии приёмки (утверждённая цель; технические схемы уточнит OpenSpec)

| Тест | Действие | Ожидаемый результат |
|---|---|---|
| AC-01 Happy path | При доверенном ALLOWED, effective grants и известных адресах выполнить export | Один корректный READY-row с точным TCP/UDP/портом, Resource identifiers, evaluationAt и provenance |
| AC-02 Missing address | Убрать текущий адрес destination Endpoint при сохранении identity и Rule | INCOMPLETE row с null address и тем же Rule; не исчезает из export |
| AC-03 Denied | Подать тот же валидный предмет, завершить решением DENIED | Request/decision различимы; **новый** Rule не создаётся; DENIED не даёт export строки |
| AC-04 Idempotent meaning | Повторить ALLOWED для того же exact AccessSubject | Второй Rule не возникает; основания/история объяснимы |
| AC-05 Request authority | При наличии `access.request` на source и отсутствии его на destination подать заявку; затем убрать source grant и повторить на новом Request | Первая заявка принимается без destination grant; вторая отклоняется до создания Request, это не DENIED |
| AC-06 Export authority | Убрать `policy.export` grant для выбранного scope | Вывод не раскрывается |
| AC-07 Current realization | Изменить адрес Endpoint между двумя согласованными export evaluations | Адрес вывода обновлён, identity Resource/Endpoint/Rule и старое permission evidence сохранены |
| AC-08 Effectiveness | Перевести Rule в INACTIVE | Нет эффективной policy row; правило остаётся объяснимым как неэффективное |

Для `AC-03` используется отдельный новый AccessSubject или отдельное начальное состояние без ранее ALLOWED Rule; иначе DENIED последующего запроса не должен автоматически отменять ранее авторитетный Rule.

## HTTP API — принятый интерфейс первого среза

**Технологический выбор для первого среза:** FastAPI с OpenAPI и Swagger UI для локальной проверки. JSON — основной формат ответа, CSV — формат экспорта. Следующие маршруты — начальный контракт, точные имена и схемы уточняются в одном OpenSpec change.

| Операция | Вход | Ответственность | Выход |
|---|---|---|---|
| `POST /access-requests` | Ссылки на предустановленные source/destination Deployments, InteractionRevision и Need | Проверить server-resolved actor, `access.request` source-only и инварианты AccessSubject | AccessRequest + admission evidence |
| `POST /access-requests/{id}/decision` | Идентификатор заявки и ALLOWED/DENIED от отдельно уполномоченного субъекта | Проверить право принимать решение, связать с неизменяемым subject; для ALLOWED обеспечить один Rule | Decision + RuleRef только для ALLOWED |
| `GET /policy/export` | Выбранный scope/Rule и желаемый JSON/CSV | Проверить `policy.export`, вычислить effective policy на согласованном `evaluationAt` | READY/INCOMPLETE rows, identifiers, traffic, provenance |

**Использование через браузер:** Swagger UI предоставляет готовые формы запросов и примеры с идентификаторами предустановленных объектов. Для подачи заявки не требуется пользовательский CLI, ручное редактирование БД или построение полного Web UI.

### Локальные предустановки и доверенная граница

- Явная повторяемая инициализация dev/test-данных: 2 Resource/Endpoint, 1 Application, 2 Component, 1 InteractionRevision/TrafficClause, 2 Deployments, 1 BusinessProcess/ConnectivityNeed, тестовые роли инициатора, решающего субъекта и экспортёра. Начальных разрешающих Rules **нет**.
- Локальный dev/test-профиль слушает loopback, без публичного доступа. Сервер сопоставляет предъявленное dev-удостоверение с заранее назначенными actor и grants; значения `actor_id` и `grants`, присланные клиентом, не являются источником полномочий. Конкретный dev-механизм уточняется в OpenSpec; реальные секреты не сохраняются в репозитории.
- ALLOWED/DENIED вводится только через отдельно авторизованную операцию принятия решения; наличие поля `ALLOWED` в запросе не означает доверия клиенту.
- Для тестов отрицательных случаев и изменения адреса/активности допускаются изолированные программные fixtures или специальные dev-only сценарии; публичный CRUD ради тестов вводить не требуется.
- Выход за пределы loopback/dev/test требует отдельной спецификации настоящей аутентификации/авторизации. Dev-профиль не объявляется production-ready.

### Контракт согласованности экспорта

При каждой операции экспорта решение об authority, effectiveness, текущие адреса и provenance вычисляются относительно **одного согласованного набора исходных фактов** на одном `evaluationAt`. Между двумя запросами адрес может измениться, но идентичность Resource/Endpoint/Rule и историческое решение сохраняются. Конкретный механизм (транзакция, snapshot, модель хранения) выбирается при проектировании, не наследуется автоматически из NAPMS 1.0.

## Исключено из первого среза (не из продукта)

Полный UI и массовое редактирование каталогов, произвольные каталоги и множественность сценариев, управление Site и OWNER/ADMINISTRATOR, сложные approval-процессы, lifecycle множества Needs, EffectiveWindow за пределами базового состояния ACTIVE/INACTIVE, vendor-specific rendering/apply/reconcile, multi-user deployment и внешний Identity Provider. История и idempotent semantics для одного subject остаются частью среза.

**Запрещённые упрощения:** Rule в seed-данных без решения, самоназначение полномочий клиентом, подмена permission/authority, потеря provenance, исчезновение INCOMPLETE rows.

## Решения для запуска первого OpenSpec change

- **P0 — принято:** ограниченный сквозной API-сценарий заявка → доверенное решение → Rule → экспорт, вместо полного прежнего MVP.
- **P0 — принято:** source-only `access.request` на подаче заявки; source/destination scopes для экспорта проверяются отдельно по выбранной политике.
- **P1 — принято:** FastAPI/OpenAPI/Swagger UI, серверные demo-fixtures, локальный dev/test-профиль с независимыми ролями; никаких необоснованно доверенных клиентских утверждений.
- **P1 — контракт утверждён:** одно согласованное состояние на `evaluationAt`; механизм остаётся предметом технического решения.
- **Уточнить в OpenSpec:** точные маршруты/JSON-схемы, dev-аутентификацию и способ хранения. Не разрабатывать production security или всю архитектуру до появления требований.

## Альтернативы

- **Полный бывший first-MVP export journey:** максимальное покрытие старых требований, но слишком широк для проверки ценности первой итерации.
- **Только CRUD Resource или шаблонный CSV без permission provenance:** проще, но не проверяет основную предметную ценность и ключевые инварианты.

**Следующий этап:** после merge создать **один** OpenSpec change с API-контрактом, минимальной реализацией и проверкой AC-01..AC-08 через Codex → Tests → PR → CI. Затем расширять по подтверждённым потребностям.
