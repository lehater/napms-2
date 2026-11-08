# Independent review — Draft PR #31 (SDLC-04, Issue #30)

**Решение: REQUEST CHANGES.** Дата проверки: 2026-11-08. Проверенные ветки: PR #31 `quality/issue-30-semantic-ui-gate` (HEAD `abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c`); PR #27 `feat/ux-0-1-applications` (HEAD `3b334d138fefde25dbc871bfd883055401a36924`); актуальный публичный `main` на момент чтения. **P0: не выявлено; P1: 3; P2: 4; P3: 1.**

Это review исходников, не результат локального выполнения тестов или пробного merge. [GitHub Actions Verify #42515021976](https://github.com/lehater/napms-2/actions/runs/42515021976) показывает `Success` для четырёх jobs на HEAD PR #31; журналы выполнения без авторизации недоступны. Данные «13/13 Playwright», «80 pytest» и «6/6 OpenSpec» указаны автором PR, независимо по job logs не перепроверены. Никакие файлы репозитория не изменялись, merge не выполнялся.

## Замечания

### [P1][Подтверждено] 1. Semantic gate проверяет fixture и функцию выборки, а не универсальную границу отображения
**Место:** [`web/scripts/check-semantic-contract.mjs:1–42`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/scripts/check-semantic-contract.mjs#L1-L42), [`web/src/prototype/Prototype.tsx:16–29,63–88`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/src/prototype/Prototype.tsx#L16-L29), [`web/e2e/semantic-contract.spec.ts:7–46`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/e2e/semantic-contract.spec.ts#L7-L46).

**Нарушение:** fast gate импортирует `objects`, `visibleCollection`, `objectPath`, `statusCaptions`, но не наблюдает DOM или другие view-модели; browser checks утверждают четыре конкретных маршрута/fixture. Невозможно сделать вывод, что новые UI-компоненты, другой каталог либо реально API-driven экран включены в semantic gate. «Запускается на каждом PR» не означает «покрывает весь UI каждого PR».

**Последствие:** новая страница может смешать Request/Rule или изобразить неверное значение, при этом standalone gate останется зелёным; на неохваченном маршруте browser suite тоже не даст сигнала. Это прямой пробел относительно цели *systemic improvement*.

**Минимальное исправление:** явно зафиксировать ограниченную область UX-0 и добавить обязательное правило: при добавлении UI коллекции/доменных типов изменяются *семантические инварианты и browser-сценарии* этой коллекции. Для текущего прототипа проверять фактическую семантику rows и labels независимо от конкретного fixture ID; перечислить покрытые маршруты и непокрытые в CI-документации.

### [P1][Подтверждено] 2. Источник структурного смешения (`state?: string`) остаётся; контракт охватывает лишь 5 из 16 `Kind`
**Место:** [`web/src/prototype/data.ts:11–12,23–44`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/src/prototype/data.ts#L11-L44), [`docs/contracts/ux-0-semantic-boundaries.json:11–41`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/docs/contracts/ux-0-semantic-boundaries.json#L11-L41), [`Prototype.tsx:11–15`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/src/prototype/Prototype.tsx#L11-L15).

**Нарушение:** `MockObject` остаётся объединением сущностей с одним необязательным `state?: string`, а `ObjectStatus` для иных типов использует fallback `Признак данных`. `validate` перебирает только типы из `statusDomains`: AccessRequest, PolicyRule, Reconciliation, Application, InteractionRevision. У остальных 11 типов нет машинного ограничения допустимых семантических категорий (например `NST`, `ConfiguredEffectivePolicySnapshot`, `TechnicalAccessEvidenceSet`, `ComponentDeployment`). Допустимость `Read-only`/`Immutable` проверяется только для двух фиксированных типов.

**Последствие:** аналогичная ошибка может появиться на другом разделе без ошибки typecheck или fast gate. Переход к новым типам потребует ручного знания о необходимости расширять JSON, а отсутствие записи не трактуется как отказ проверки.

**Минимальное исправление:** в пределах KISS ввести дискриминированный статус (`kind` → допустимые значения, без универсальной строки) либо runtime validation по всем `Kind` с явными `status`/`no-status` решениями; проверка должна требовать решения для нового типа. Лейблы `Unknown`, `Any`, `Complete`, `Candidate` также должны иметь собственный смысл, а не попадать в общий жизненный цикл.

### [P1][Подтверждено: пересечение кода; гипотеза: потеря функциональности после интеграции] 3. PR #31 и #27 ещё не интегрированы и имеют несовместимые варианты общего экрана
**Место:** [PR #31 `Prototype.tsx:63–93`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/src/prototype/Prototype.tsx#L63-L93), [PR #27 `Prototype.tsx:114–129`](https://github.com/lehater/napms-2/blob/3b334d138fefde25dbc871bfd883055401a36924/web/src/prototype/Prototype.tsx#L114-L129), [PR #27 `Shell.tsx`](https://github.com/lehater/napms-2/blob/3b334d138fefde25dbc871bfd883055401a36924/web/src/prototype/Shell.tsx), [PR #27 `Resources.tsx`](https://github.com/lehater/napms-2/blob/3b334d138fefde25dbc871bfd883055401a36924/web/src/prototype/Resources.tsx).

**Нарушение/риск:** PR #27 рендерит `<Shell>`, `<Resources>`, `<ResourceDetail>`, URL query state, resize sidebar, resource tabs и вложенные контекстные представления. PR #31 меняет тот же `Prototype.tsx` на простой `<div>` shell с общей `ObjectTable`; код #31 сам по себе не вызывает компоненты #27. Обе ветки независимо зелёные, но ни их объединённый код, ни полный объединённый набор регрессий не проверен. PR #31 сообщает 13 браузерных тестов, PR #27 — 17; это *разные* тестовые деревья, сравнивать результат PASS как подтверждение совместимости нельзя.

**Последствие:** при некорректном разрешении конфликта возможно потерять UI Baseline v0.1 (вкладки, фильтрацию, pagination, breadcrumbs и resizing) либо семантическую маршрутизацию/гейт #31. Сам факт такой потери в объединённом дереве пока **не доказан** — оно не проверено.

**Минимальное исправление:** согласовать порядок интеграции; собрать отдельный интеграционный HEAD на основе актуального `main` с обоими наборами изменений; сохранить `Shell/Resources/ResourceDetail` и новую `requests` route/redirect/typed status; пройти все E2E обеих веток, browser history, query state, mobile/resize, mock/API boundary и обязательный semantic-contract на этом HEAD. Не брать целиком ни один конфликтующий файл по стратегии `ours/theirs`.

### [P2][Подтверждено] 4. Два «negative mutation sentinels» тестируют валидатор на подменённых аргументах, не реальное нарушение UI
**Место:** [`web/scripts/check-semantic-contract.mjs:43–51`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/scripts/check-semantic-contract.mjs#L43-L51), [`docs/engineering/quality-escapes/ux-0-semantic-ui-2026-11-08.md:21–25`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/docs/engineering/quality-escapes/ux-0-semantic-ui-2026-11-08.md#L21-L25).

**Нарушение:** копия заявки со `state='Active'` и копия policy-массива с добавленной заявкой передаются напрямую `validate(...)`. Это подтверждает, что конкретные ветки валидатора возвращают ошибку, но не доказывает «red on original UI implementation / green on fixed», не проверяет путь `view → DOM` и не является независимой проверкой браузерного поведения.

**Последствие:** ложная уверенность в способности CI обнаружить воспроизведение исходного дефекта в реальном компоненте, а не только в валидируемых массивах.

**Минимальное исправление:** приложить воспроизводимое доказательство fail на фактической регрессии маршрута/рендеринга, затем pass после исправления. Добавить хотя бы один независимый отрицательный сценарий на изменённую выборку/DOM, не меняя само тело `validate` и ожидаемый контракт. Дорогие эксперименты не нужны; достаточно ограниченного regression case.

### [P2][Подтверждено] 5. Browser gate слишком привязан к одному fixture; валидное расширение создаст false positive
**Место:** [`web/e2e/semantic-contract.spec.ts:7–30`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/e2e/semantic-contract.spec.ts#L7-L30).

**Нарушение:** проверки `toHaveCount(1)` PolicyRule, `toHaveCount(2)` AccessRequest и конкретных имён P1/Q1/Q2 не выводятся из семантического инварианта: наличие двух корректных PolicyRule или третьей корректной заявки должно быть допустимым. Проверка `toContainText('policyRuleId')` проверяет наличие названия поля, но сама по себе не подтверждает `null`.

**Последствие:** появление новых доменно правильных fixture приводит к красному UI gate, а неверное содержание отдельных отображаемых значений может быть не обнаружено этим тестом. Отдельный старый `prototype.spec.ts` проверяет `policyRuleId='null'` для *конкретного Q2*, но не задаёт универсальный контракт для каждой DENIED заявки.

**Минимальное исправление:** утверждать для всех видимых строк разрешённый `kind` и смысл подписи, сопоставлять с нормативным контрактом и проверять каждую DENIED заявку; количество строк не зашивать, если количество не является требованием. Сохранить один именованный business walkthrough как smoke, не как единственный oracle.

### [P2][Подтверждено] 6. JSON декларирует больше семантики, чем выполняет скрипт
**Место:** [`docs/contracts/ux-0-semantic-boundaries.json:43–58`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/docs/contracts/ux-0-semantic-boundaries.json#L43-L58), [`check-semantic-contract.mjs:4–39`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/scripts/check-semantic-contract.mjs#L4-L39), [`data.ts:14–21`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/src/prototype/data.ts#L14-L21).

**Нарушение:** `distinctions` и `authority` — свободные текстовые массивы; `validate()` их не читает. Проверки допускают произвольные статусы незарегистрированных типов, не проверяют контракт `dataNature`/computed–persistent в рамках нового gate и не проверяют поля `effect`, `readiness`, отсутствие реального NST DENY/отзыва. Часть таких свойств защищена прежним `prototype.spec.ts`, но заявлять их частью *нового машинного semantic-contract* нельзя.

**Последствие:** изменение описания контракта может не изменить машинные проверки; документирование нового инварианта создаёт ошибочное ожидание автоматической защиты.

**Минимальное исправление:** разделить в JSON/README `enforced` и `documentation only`, привязать каждую обязательную норму к конкретной проверке (идентификатор и test reference); при декларации новых машинных правил падать, если у них нет обработчика. Не обязательно строить generic rule engine.

### [P2][Подтверждено как недочёт RCA] 7. RCA устанавливает spec-gap и coverage-gap, но не рассматривает structural/type gap как самостоятельную причину
**Место:** [`docs/engineering/quality-escapes/ux-0-semantic-ui-2026-11-08.md:8–16`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/docs/engineering/quality-escapes/ux-0-semantic-ui-2026-11-08.md#L8-L16); [`data.ts:39–41`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/web/src/prototype/data.ts#L39-L41); [`main/docs/domain.md:14–18,39–52`](https://github.com/lehater/napms-2/blob/main/docs/domain.md#L14-L18).

**Нарушение:** переход `kind → shared state?: string → generic badge` даёт техническую возможность смешать доменно несовместимые статусы *ещё до требований UI-тестов*. RCA справедливо не приписывает мотивы агенту, но фиксирует лишь spec/coverage gap и не отделяет типомодель/презентационный слой, допущения code review и статус исследовательской IA как отдельные возможные факторы. `main/docs/domain.md` достаточно ясно различает Request, Rule и вычисляемый export; вопрос не только в навигационном требовании.

**Последствие:** превентивная мера ограничивается детектором известных данных; архитектурный источник ошибки остаётся и воспроизводится при расширении.

**Минимальное исправление:** дополнить RCA факторами `type-model gap` и `presentation mapping drift`, отмечая их как подтверждённые свойства кода, но причинную роль в ходе конкретной разработки — как гипотезу. Указать первый нарушенный инвариант на каждом переходе Domain → OpenSpec → UI → CI и степень уверенности; не выдумывать агентные traces.

### [P3][Подтверждено] 8. Ошибочная документация запуска gate
**Место:** [`docs/contracts/README.md:11–12`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/docs/contracts/README.md#L11-L12), [`docs/engineering/quality-escapes/ux-0-semantic-ui-2026-11-08.md:18`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/docs/engineering/quality-escapes/ux-0-semantic-ui-2026-11-08.md#L18), [`.github/workflows/verify.yml:73–86`](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/.github/workflows/verify.yml#L73-L86).

**Нарушение:** README называет `Verify / web` вместо реально отдельного `Verify / semantic-contract`; RCA ссылается на `ux-0-semantic-boundaries.{md,json}`, хотя добавлены `README.md` и `.json`, отдельного `.md` с этим именем нет.

**Последствие:** неправильный handoff и поиск check/evidence.

**Минимальное исправление:** обновить оба пути и название job.

## Root Cause Analysis — оценка

**Подтверждено:** принятая доменная модель и спецификация AccessRequest описывают независимые Request/Decision/PolicyRule; `DENIED` не создаёт правило; исходный UX-0 OpenSpec не формулировал строгое разделение UI-коллекций/типизацию подписей; в `main` были единый `section='policy'` и общий `state`; прежние Playwright не утверждали границу пользовательского представления. Таким образом, `spec-gap` и `coverage-gap` действительно имеют доказательную основу. Источник: [main/docs/domain.md](https://github.com/lehater/napms-2/blob/main/docs/domain.md), [OpenSpec UX-0 main](https://github.com/lehater/napms-2/blob/main/openspec/changes/ux-0-prototype/specs/ux-research-prototype/spec.md), [RCA PR #31](https://github.com/lehater/napms-2/blob/abfc3a1ed45d1bf2a559a9b0bf13087d20b77a3c/docs/engineering/quality-escapes/ux-0-semantic-ui-2026-11-08.md).

**Недостаточно исследовано:** общий string-статус как структурный enabling factor, неавторитетность Research IA, механизм согласования accepted domain → UX OpenSpec → browser oracle, а также причинность агентного поведения. Последнее **не установлено**, и отсутствие изменений AGENTS.md/Skills корректно.

## Domain / ERD / Architecture

Содержательно PR #31 **улучшает** текущий mock: отдельный `requests` context, `PolicyRule`-only catalogue, отдельные статусные подписи, различение логического persistent и computed в UI, сохранение `DENIED ≠ NST DENY`, неизменяемость revision и read-only как свойства, а не lifecycle. Отдельная вложенная `/prototype/requests/` route совместима с требованием восьми верхнеуровневых разделов и сохраняет старые bookmark-пути. PR не меняет backend/SQLite, что согласуется с Clean Architecture/KISS. [Логическая ERD](https://github.com/lehater/napms-2/blob/main/docs/research/persistent-state-erd.md) имеет статус `RESEARCH`, а не принятая физическая SQL schema; PR не объявляет её физической. Пограничный риск: mock `PolicyRule` использует `Active/Inactive`, тогда как backend-домен хранит `ACTIVE/INACTIVE`; при распространении контракта на реальный UI потребуется явное отображение значений, не автоматическое переиспользование UX-0 enum.

Использование существующего `Verify`, Playwright и JSON без нового сервиса и LLM-судьи соответствует SDLC Roadmap. Однако success отдельно выполняемого fast gate пока доказывает только узкий кейс, а не измеренное улучшение качества SDLC на новых разделах.

## Semantic gate — матрица доказанности

| Случай | Fast semantic | Browser/старые тесты | Вывод |
| --- | --- | --- | --- |
| `AccessRequest.state=Active` в существующем fixture | Отлавливает | Browser демонстрирует правильный Q1/Q2 | Подтверждённый negative sentinel функции |
| AccessRequest попал в `visibleCollection('policy')` | Отлавливает | Policy test проверяет конкретную таблицу | Подтверждён для одного маршрута |
| Новый UI section, создающий второй Policy/Request список | Не инспектирует | Не покрыто автоматически | **False negative риска на новых экранах** |
| `NST.state=DENIED` или новый неописанный kind/status | Не охвачено `statusDomains` | Специализированного status oracle нет | **False negative риска** (логический вывод, не запуск mutation) |
| Легитимно добавлен второй PolicyRule/третья заявка | Fast допускает | Числовые ожидания 1/2 краснеют | **False positive** |
| Неверная семантика в `summary/fields` при сохранённых `kind/state` | Вне валидатора | Проверяется выборочно, не общий текст | **False negative риска** |
| Реальный `/access-requests` UI | Вне fast gate UX-0 | Существуют отдельные real FastAPI/SQLite E2E | Не выдавать за универсальный semantic gate |

**Способы обхода по устройству проверки (без проведения экспериментов):** добавить новый view без соответствующего E2E; использовать новые `Kind`/`state` без записи в `statusDomains`; изменить доменное значение в `summary` или `fields`, сохранив уже проверенные `kind`, `state`, route и имена P1/Q1. Это границы тестового покрытия, не обнаруженные фактические изменения PR.

## Минимальные требования до merge

1. **[Блокер]** Подготовить интегрированную ветку/HEAD с PR #27 и PR #31, не теряя `Shell`, `Resources`, `ResourceDetail`, базовые UX-0.2 E2E и новый semantic gate; предъявить полный CI на **том же итоговом HEAD**.
2. **[Блокер]** Скорректировать обещания и coverage: fast gate является **UX-0 fixture contract**, а не системой автоматического семантического анализа любого UI; установить критерий добавления новых UI-разделов/`Kind`: обязательное дополнение контракта и browser coverage либо явно зафиксированное исключение в review.
3. **[Блокер]** Добавить минимальную типовую/валидационную границу для всех отображаемых semantic status categories, чтобы для нового типа статус нельзя было без проверки унаследовать из другой сущности.
4. **[Блокер]** Заменить жёсткое `1 Rule / 2 Requests` в semantic E2E проверкой фактических типов строк, семантических подписей и значения `policyRuleId=null` у каждого DENIED; оставить фиксированные Q1/Q2 walkthrough как отдельный тест.
5. **[Блокер]** Продемонстрировать независимое `negative real UI mutation → failing browser/semantic check → corrected → PASS`, а не только подмену параметров `validate()`; приложить в PR повторяемую минимальную методику и результат.
6. **[Не блокирует, но исправить]** Дополнить RCA `type-model gap` и явными неизвестными факторами; разметить `enforced`/`documentation only` в JSON; синхронизировать документацию check и имена файлов.

**Итог:** Не approve. Исправление конкретной ошибки UX-0 убедительно на уровне источников и browser regression, но заявленная системность контроля не подтверждена, типовая уязвимость сохранена, а интеграция с PR #27 не доказана. `REQUEST CHANGES` относится к готовности к merge, **не** к отказу от выбранного узкого подхода JSON + CI + Playwright.
