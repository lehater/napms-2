# Контракт работающего UI NAPMS 2.0

Все коллекции рабочего приложения получают данные через FastAPI из SQLite.
Сценарная fixture-модель и маршрут `/prototype` удалены из исполняемого frontend.
Исторические материалы UX-0 в `docs/research/` являются архивом исследования,
а не источником предметных данных.

[Машинно-читаемый контракт](ux-0-semantic-boundaries.json) проверяется
`npm run test:semantic`: шесть разделов навигации, удаление prototype,
отсутствие импорта mock-модулей и единый источник данных.

Доменную семантику (PENDING/ALLOWED/DENIED, PolicyRule ACTIVE/INACTIVE,
неизменяемость опубликованной Revision) проверяют backend и REAL Playwright E2E.
