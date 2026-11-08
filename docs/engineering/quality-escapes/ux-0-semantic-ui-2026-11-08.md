# RCA: UX-0 смешивает заявки, правила и свойства статуса

**Quality Escape:** [Issue #30](https://github.com/lehater/napms-2/issues/30) · **SDLC-04:** [Issue #10](https://github.com/lehater/napms-2/issues/10) · **Дата:** 2026-11-08 · **Приоритет:** P1 · **Уровень уверенности:** наблюдаемая ошибка и пробел проверки подтверждены; конкретное внутреннее решение модели недоступно.

## 1. Наблюдаемый дефект (main до исправления)
- `web/src/prototype/data.ts`: `AccessRequest` Q1/Q2 и `PolicyRule` P1 имеют `section: 'policy'` и попадают в один общий `ObjectTable`. Типы присутствуют в fixture, но UI-представление объединяет их в одну коллекцию политики.
- `Application.state = 'Read-only'` и `InteractionRevision.state = 'Immutable'`; это режим read-only прототипа и инвариант изменения технических параметров, а не доменные lifecycle state. Остальные статусы заявки/правила/сравнения тоже показываются через один компонент с общим заголовком «Состояние».
- Исходный `web/e2e/prototype.spec.ts` проверяет цепочки, значения и ссылки, но не утверждает разделённость policy catalogue и типизированные подписи статусов в браузере.
- `.github/workflows/verify.yml` автоматически выполняет Playwright, OpenSpec validation, typecheck, pytest и lint, но до этого изменения не имеет отдельного контракта семантики представления.

## 2. Traceability / место потери семантики
| Слой | Наблюдение | Вывод |
| --- | --- | --- |
| Product / Domain | AccessRequest фиксирует запрос и решение; PolicyRule является отдельным разрешающим правилом, DENIED не создаёт правило | Граница определена в продукте |
| Research IA | `docs/research/ux-information-architecture.md` описывает отдельные workspaces «Заявки», «Правила» | Есть подсказка, но документ DRAFT, не нормативный контракт |
| OpenSpec UX-0 | Требует 8 разделов и связи Request/Rule, но не запрещает общую PolicyRule + Request таблицу и не типизирует презентационные статусы | **spec-gap** в UI-контракте |
| UI/fixture | Общий `section='policy'` и `state: string`, один список и общий бейдж | **presentation drift**, подтверждено кодом |
| CI/E2E | Есть проверка семантики связей и непротиворечивости fixture; нет проверки *отрисованной границы* коллекции и подписи статусного поля | **coverage-gap**, подтверждено тестами |

**Проверенная причина на уровне системы:** обязательная граница UI-представления отсутствовала в нормативном acceptance contract и regression gate. **Подтверждённый enabling factor:** нетипизированное общее поле `state?: string` в прежнем mock-модуле допускало любые смысловые категории; общий компонент подписи превращал эти значения в визуально эквивалентные статусы. Роль именно этого фактора в ходе агентной генерации без trace остаётся гипотезой. **Не доказано:** что агент сознательно проигнорировал доменную модель. Исходных Codex traces для причинного анализа агентных решений в данном контуре не сохранено.

## 3. Исправление и предотвращение
- Нормативный узкий контракт в `docs/contracts/README.md` и `docs/contracts/ux-0-semantic-boundaries.json`; восемь верхних разделов сохраняются, исследовательская IA не объявляется принятой целиком.
- `visibleCollection('policy')` включает только PolicyRule. Отдельные таблицы «Заявки» и «Результаты сопоставления» расположены на Overview; mock-заявки имеют канонический `/prototype/requests/…`, а старые адреса `/prototype/policy/mock-request-*` перенаправляются. Ссылки Need/Rule→AccessRequest сохранены.
- Состояния запроса, правила и сравнения выводятся с разными подписями, а Read-only/Immutable перенесены в атрибуты.
- `npm run test:semantic` — быстрый standalone validation на Node 24 и две deliberate negative mutation probes: request получает state `Active` и request ошибочно добавляется в policy catalogue. Оба нарушения обязаны детектироваться. `Verify / semantic-contract` автоматически блокирует каждый PR.
- `web/e2e/semantic-contract.spec.ts` проверяет видимые browser-коллекции и смыслы статусов независимо от пройденных fixture checks; исполняется `Verify / web`.

## 4. Доказательства и ограничения
- **Red evidence:** базовая реализация содержит описанные нарушения; мутированные данные в новом gate должны порождать `SEMANTIC_CONTRACT_VIOLATION`. Наличие такого поведения подтверждается только успешным запуском gate.
- **Green evidence:** ждать фактических результатов GitHub Actions на финальном HEAD Draft PR; до этого не объявлять CI зелёным.
- Это **детерминированная проверка ограниченного набора семантических инвариантов**, а не универсальный AI judge всей доменной модели и не автоматическое RCA любого сбоя.
- Отдельная PR #27 уже вносит изменения UX-0.1/0.2 и часть status corrections; при объединении веток требуется сохранить semantic gate и согласовать конфликты, не затирая UI Baseline.

## 5. Решение о Harness
**На данном этапе не изменять `AGENTS.md` или Skills**: недостаток обусловлен верифицируемым пробелом спецификации и coverage, а не доказанной ошибкой инструкции. Если аналогичные потери семантики повторятся после внедрения контракта, инициировать SDLC-04 гипотезу о дополнительной доменной проверке при OpenSpec handoff и оценить её в контролируемом эксперименте.

**Решение для review:** принять этот пакет только после зелёного `semantic-contract` + `web` и независимого сопоставления UI с нормативными границами. Связанный Issue #30 закрывать после принятия и демонстрации регрессионного контроля, не при создании Draft PR.

## 6. Исправления после независимого review (2026-11-08)

Источник: [переданный Independent Review](pr31-independent-review-2026-11-08.md) — REQUEST CHANGES, 3 P1 / 4 P2 / 1 P3. Отдельно от установленных spec-gap/coverage-gap выделены **type-model gap** (общий `state?: string`), **presentation mapping drift** (универсальный status badge и общая коллекция) и неполная нормативность исследовательской IA. Все три — подтверждённые свойства исходного кода/документации; конкретное влияние на решения Codex без trace не доказано.

Контроль ограничен UX-0, но теперь охватывает **все 16 существующих Kind** и требует явного status/no-status решения для нового Kind. JSON разделён на `enforced` / `documentationOnly`; TypeScript discriminated union предотвращает неверный статус при компиляции. Browser-tests проверяют DOM-строки, тип и подпись, а не фиксированную численность Q1/Q2/P1.

Интегрированный HEAD включает реализацию UI Baseline из PR #27; наборы проверок обеих веток должны пройти на **одном commit** до рассмотрения merge. Validator mutation sentinels являются самотестами валидатора, **не** доказательством настоящего red/green UI — для этого нужен отдельный испорченный render в PR probe и ошибка браузерного gate.

### Evidence status

- Интеграционный CI: до получения фактических GitHub Actions нельзя писать PASS.
- Негативная UI-мутация: отдельный воспроизводимый probe, его результат и ссылку внести в PR после выполнения.
- Отдельный реальный API и физическая ERD не менялись.

**Quality escape остаётся OPEN до независимого re-review и принятого merge.**

## 7. Проверенное red/green свидетельство (2026-11-08)

**Green, интегрированный продукт и quality gate:** [PR #31 / Verify #42519088770](https://github.com/lehater/napms-2/actions/runs/42519088770) на commit `8a07e13a77e22730607994985096bb762a1061c5`, с обоими родителями PR #31 и PR #27 в истории. Четыре jobs PASS: `semantic-contract` — 16 Kind, 8 top-level sections, type-specific statuses/route/denial; `web` — 21 Playwright PASS; `application` — 80 pytest PASS; `validate` — 7/7 OpenSpec PASS. Прототип сохранил Shell/Resources/ResourceDetail и полный UX-0.2 E2E. Это доказывает совместимость в этом интеграционном дереве, а не автоматически в будущих PR.

**Red, реальная намеренная UI-регрессия:** [test-only PR #32](https://github.com/lehater/napms-2/pull/32), [Verify #42519051142](https://github.com/lehater/napms-2/actions/runs/42519051142). В `Prototype.tsx` изменена только выборка **отрисованных** policy rows, из-за чего в каталоге PolicyRule оказались две AccessRequest. Fast `semantic-contract` сохранил PASS (fixture и `visibleCollection` не изменялись), но browser gate `web/e2e/semantic-contract.spec.ts` воспроизводимо завершился FAIL: expected 1, received 3. Остальные 20 E2E прошли. В том probe прежний `validate` также падал из-за требования OpenSpec до его исправления; этот независимый сбой **не** используется как evidence semantic gate. PR #32 закрыт без merge.

**Вывод:** это ограниченное, но воспроизводимое доказательство `bad UI rendering → failing browser regression → corrected implementation → PASS`. Проверка произвольных новых страниц и истинности естественно-языковых текстов остаётся задачей контрактов и архитектурного review при расширении scope.
