# UX-0 — проверяемые границы доменной семантики в UI

**Статус:** узкий нормативный контракт для *исследовательского* UX-0. Источник машинно-читаемых правил: [ux-0-semantic-boundaries.json](ux-0-semantic-boundaries.json). Не расширяет принятую доменную модель, OpenSpec продуктов или физическую ERD.

## Назначение
UI отображает разные сущности, состояния и вычисляемые результаты с сохранением их предметного значения. Навигационное объединение нескольких видов данных допустимо, но список **правил политики** содержит только PolicyRule. Заявки AccessRequest видны отдельно (в контексте или в отдельном списке) и могут использоваться как provenance правила.

## Проверяемые инварианты
1. **PolicyRule — декларативное разрешение (PERMIT); AccessRequest — заявка на доступ.** DENIED относится к решению по заявке, а не к техническому сетевому DENY или отзыву действующего правила.
2. **Статус имеет тип.** `PENDING/ALLOWED/DENIED` — статус заявки; `Active/Inactive` — состояние PolicyRule; `Drift/Uncomparable` — результат сравнения. Ни одно значение не переносится в другой тип.
3. **Режим/инвариант — не статус.** `Read-only` — режим прототипа, `Immutable` — неизменяемость параметров InteractionRevision. Эти понятия не выводятся в UI как состояния соответствующих объектов.
4. **Кнопки и ссылки не создают новую доменную связь.** Обратная ссылка из PolicyRule на заявку означает provenance, не общее lifecycle состояние.
5. Сохраняются восемь существующих верхнеуровневых разделов UX-0 и изоляция MOCK от реального `/access-requests` API. Для mock-заявок используется отдельный вложенный URL `/prototype/requests/…` (не девятый пункт меню); прежние `/prototype/policy/mock-request-*` перенаправляются на него. Заявки остаются доступны через Need, Overview и provenance, но не попадают в каталог PolicyRule.

## Автоматический контроль
- Блокирующая быстрая проверка в GitHub Actions `Verify / semantic-contract` выполняет `node --experimental-strip-types scripts/check-semantic-contract.mjs` (из `web/`). Она проверяет все 16 типизированных Kind, statusDomains, маршруты и policy fixture с JSON-контрактом; при нарушении выдаёт конкретный `entity/kind/state`.
- Playwright проверяет видимое браузерное представление PolicyRule/AccessRequest, смысл подписи статуса и переходы. Проверка выполняется в полном `npm run test:e2e` без mock network API.
- При нарушении CI автоматически сигнализирует о проблеме, расследование RCA и потенциальное изменение Harness оформляются отдельным Issue/PR. Автоматического изменения инструкций или `main` нет.

**Граница:** эти проверки надёжно ловят формализованные инварианты, но не заменяют семантический review новых доменных типов, пользовательскую оценку навигации или проверку архитектурных предположений.

Источники: [UX-0 OpenSpec](../../openspec/changes/ux-0-prototype/specs/ux-research-prototype/spec.md), [Research IA](../research/ux-information-architecture.md), [AccessRequest spec](../../openspec/specs/access-requests/spec.md), [AccessRequest UI spec](../../openspec/specs/access-requests-web-ui/spec.md).

## Coverage и правила расширения

**Enforced (исполняется):** `enforced.statusDomains` задаёт решение о статусах или явном отсутствии статуса для всех 16 Kind; `enforced.routes`, `enforced.catalogues.policy`, `enforced.deniedRequest` и `enforced.coverage.topLevelSectionIds` проверяются быстрым валидатором. TypeScript `MockObject` — discriminated union и ограничивает значения при компиляции. Добавление Kind/раздела без обновления контрактов и тестов вызывает ошибку сборки/быстрой проверки.

**Documentation only:** смысловые различия, внешние первоисточники и границы универсальности перечислены в `documentationOnly`. Они **не становятся автоматическим инвариантом** от одной записи в JSON.

**Browser coverage:** `web/e2e/prototype.spec.ts` проверяет восемь разделов, ссылки и UX Baseline; `web/e2e/semantic-contract.spec.ts` проверяет реальные DOM-строки policy/request, статусы и доступность маршрутов. Любая новая UI-коллекция требует нового browser-кейса и обновления coverage evidence в PR. На review проверяют, что тест действительно наблюдает DOM.

**Не покрыто:** произвольные новые экраны до обновления контракта и независимый реальный `/access-requests` UI (для него действует собственный E2E). Fast gate не является LLM-оценкой семантики всего интерфейса и не гарантирует качество каждого текста summary/fields. Критерий принятия — автоматическое выявление нарушений *зафиксированных* инвариантов плюс архитектурный review новых представлений.

**Команды:**
```bash
cd web
npm ci
npm run test:semantic    # быстрый fixture/route/status gate
npm run test:e2e        # реальный Chromium DOM + настоящий backend в существующем тестовом окружении
```
