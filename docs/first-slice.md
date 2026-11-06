# NAPMS 2.0 — первый вертикальный срез

**Статус:** RECOMMENDED / REVIEW READY, **Candidate** для NAPMS 2.0; реализации и OpenSpec change пока нет.
**Source baseline:** `lehater/napms@42481577fab7f795cf3a2118b7b6f1c3c075d066`.

## Рекомендация

**Один разрешённый доступ → объяснимый vendor-neutral экспорт текущей политики.**

Пользовательская цель: на основании одного явно разрешённого сценария коммуникации получить пригодную для просмотра/передачи нормализованную строку желаемого доступа — с источником, назначением, протоколом, портами, происхождением решения и признаком готовности адресов.

**Почему этот срез:** проверяет основную полезность NAPMS — независимое от firewall описание того, *что разрешено, почему и что технически известно* — без развёртывания полного каталожного UI, большого approval workflow и provider adapters. Это **предложенная часть** старого vendor-neutral export journey, а не автоматически утверждённый перенос прежнего «полного first MVP».

Источники: [docs/discovery/first-mvp-hcd-user-needs.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/discovery/first-mvp-hcd-user-needs.yaml); [docs/model/tasks/policy-export-task-model.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/tasks/policy-export-task-model.yaml); [docs/model/use-cases/first-mvp-policy-export.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/model/use-cases/first-mvp-policy-export.yaml).

## Границы одного кейса

| Шаг | Вход | Ответственность | Наблюдаемый выход |
|---|---|---|---|
| 1. Описание | Два Resource с логическими Endpoint; один Application-профиль, две Component роли, один направленный Interaction/Revision с IP protocol/port; два ComponentDeployment; один BusinessProcess/ConnectivityNeed | Установить смысл и адресную реализацию независимо друг от друга | Валидированный семантический предмет доступа |
| 2. Запрос и решение | Actor, source-scope `access.request` authority, конкретный AccessSubject и Need, затем **отдельное явное** ALLOWED/DENIED от доверенного решающего субъекта | Различить admission, permission и provenance; DENIED не создаёт Rule | Для ALLOWED один stable PolicyRule (initial Active); для DENIED — только решение |
| 3. Экспорт | Выбранный Rule, actor с `policy.export` authority, логический evaluationAt и согласованный текущий набор Resource адресов | Проверить эффективность и права, соединить семантику с адресами, сохранить происхождение | Enriched vendor-neutral таблица и CSV: READY с адресами либо INCOMPLETE с null адресом |

**Минимизация реализации:** по одному экземпляру существенных понятий, простой поддерживаемый путь ввода структурированного сценария, один проверяемый выход. Конкретный UI/API/CLI, физическая БД и framework пока не выбраны. **Нельзя** подменять доменный ввод прямым редактированием таблиц или создавать Rule как фиктивную seed-запись без решения. Решение и grants подаются через доверенную границу — её конкретизация блокирует продуктивную реализацию.

## Обязательные правила в первом срезе

1. `AccessSubject` основан на exact sourceDeployment + destinationDeployment + immutable InteractionRevision; IP не входит в identity.
2. `access.request` на source scope проверяется до создания Request; право подать запрос ≠ ALLOWED (см. P0-вопрос в [domain.md](domain.md)).
3. `DENIED` даёт ноль Rule; `ALLOWED` создаёт или находит единственный Rule с тем же AccessSubject; initial state Active.
4. `policy.export` проверяется до выдачи выбранных данных; выбранная политика оценивается в одном согласованном состоянии на один evaluationAt.
5. Неэффективный Rule не материализуется; READY содержит полные адрес/протокол/порт, INCOMPLETE сохраняет Resource identity, nullable address, traffic и provenance и не считается готовым permit.
6. Ни BusinessNeed, ни responsibility metadata не заменяют authority/permission.
7. Для каждого результата прослеживается исходный actor/request, решение, Rule, Need, semantic traffic и актуальная техническая реализация. Историческое решение не переписывается сменой IP.

Основные требования источника: [docs/requirements/first-mvp-product-requirements.yaml](https://github.com/lehater/napms/blob/42481577fab7f795cf3a2118b7b6f1c3c075d066/docs/requirements/first-mvp-product-requirements.yaml), `REQ-AUTH-001..002`, `REQ-PERM-001..003`, `REQ-RULE-001..002`, `REQ-RULE-005`, `REQ-EXP-002..007`, `REQ-PROV-001`.

## Проверяемые критерии приёмки (Candidate, для будущего OpenSpec)

| Тест | Действие | Ожидаемый результат |
|---|---|---|
| AC-01 Happy path | При доверенном ALLOWED, effective grants и известных адресах выполнить export | Один корректный READY-row с точным TCP/UDP/портом, Resource identifiers, evaluationAt и provenance |
| AC-02 Missing address | Убрать текущий адрес destination Endpoint при сохранении identity и Rule | INCOMPLETE row с null address и тем же Rule; не исчезает из export |
| AC-03 Denied | Подать тот же валидный предмет, завершить решением DENIED | Request/decision различимы; **новый** Rule не создаётся; DENIED не даёт export строки |
| AC-04 Idempotent meaning | Повторить ALLOWED для того же exact AccessSubject | Второй Rule не возникает; основания/история объяснимы |
| AC-05 Request authority | Убрать source `access.request` grant | Запрос отклонён до создания Request, это не DENIED |
| AC-06 Export authority | Убрать `policy.export` grant для выбранного scope | Вывод не раскрывается |
| AC-07 Current realization | Изменить адрес Endpoint между двумя согласованными export evaluations | Адрес вывода обновлён, identity Resource/Endpoint/Rule и старое permission evidence сохранены |
| AC-08 Effectiveness | Перевести Rule в INACTIVE | Нет эффективной policy row; правило остаётся объяснимым как неэффективное |

Для `AC-03` используется отдельный новый AccessSubject или отдельное начальное состояние без ранее ALLOWED Rule; иначе DENIED последующего запроса не должен автоматически отменять ранее авторитетный Rule.

## Исключено из первого среза (но не автоматически из продукта)

Полный UI для всех каталогов; произвольная множественность Resources/Endpoints/Interactions; управление Site и OWNER/ADMINISTRATOR; массовое редактирование и миграция; lifecycle множества Needs; EffectiveWindow beyond basic active state; vendor-specific config/render/apply/reconcile; развёртывание для многих пользователей; полноценная внешняя интеграция identity provider. Точный способ локального доверенного ввода actor/grants/permission ещё нуждается в решении.

**Не сокращать путём удаления provenance, смешения permission/authority либо «исчезновения» отсутствующих адресов.**

## Продуктовые решения до OpenSpec (блокирующие)

- **P0:** согласовать объём этого среза вместо полного старого first-MVP. Выбор минимального масштаба **не равен** отказу от будущих возможностей.
- **P0:** разрешить конфликт `REQ-AUTH-001` (source-only request authority) и AP domain-model (every participating scope evidence); не допускать расширения полномочий по умолчанию.
- **P1:** определить доверенный способ ввода actor grants и ALLOWED/DENIED. Никаких самоподписанных клиентом «разрешено» для публичного/API сценария.
- **P1:** определить минимальный интерфейс; локальный сквозной тест может предшествовать сетевому сервису, но не должен имитировать выполненную интеграцию безопасности.
- **P1:** решить, как гарантировать one-time coherent snapshot и стабильную идентичность при смене адреса, не назначая заранее конкретную СУБД.

## Альтернативы

- **Полный бывший first-MVP export journey:** максимальное покрытие старых требований, но слишком широк для проверки ценности первой итерации.
- **Только CRUD Resource или шаблонный CSV без permission provenance:** проще, но не проверяет основную предметную ценность и ключевые инварианты.

**Рекомендация:** утвердить предложенный узкий vertical slice; сформировать **один** OpenSpec change с конкретным end-to-end acceptance, реализовать и проверить его через Codex → Tests → PR → CI, затем расширять по подтверждённым потребностям.
