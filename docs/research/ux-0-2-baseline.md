# UX-0.2 — UI Baseline v0.1: Resources

Рабочий [Draft PR #27](https://github.com/lehater/napms-2/pull/27), ветка `feat/ux-0-1-applications`. Основа синхронизации: `origin/main` `dc64fe4` (baseline из PR #28). Все изменения UX-0.1 сохранены; merge PR не выполняется.

## Сопоставление и границы

Основной визуальный источник: [reference.html](ui-baseline-v0.1/reference.html), правила применения: [README](ui-baseline-v0.1/README.md). Данные и связи: неизменённый `web/src/prototype/data.ts`. Иллюстративные placeholders, кнопки и значения HTML не считаются продуктовыми требованиями.

| Baseline / исходное расхождение | Реализовано в минимальном срезе | Отложено |
| --- | --- | --- |
| Fluid Layout; ранее Application ограничен 1200 px | Полноэкранный Shell, workspace занимает остаток окна, глобальный max-width удалён | — |
| Тёмный Sidebar; ранее светлый фиксированный 220 px | 264 px, границы 200–360, pointer capture, ArrowLeft/Right ±10, Shift ±50, Home/End, числовая настройка после reload | Новые вложенные пункты навигации |
| Collection: заголовок → поиск/фильтры → таблица → pagination; ранее смешаны Resource и Endpoint | Только 2 Resource, предметные колонки имени/scope/адреса/площадки/ответственности, поиск, scope/site фильтры, размер страницы 1/2 | Перевод остальных каталогов на этот pattern |
| Detail: тип, имя, назначение → предметные вкладки; ранее длинные связанные списки | Resource Overview, Endpoints, Deployments, History; дочерние и самостоятельные связи разделены; общие вложенные таблицы | Внутренняя композиция остальных Object Detail |
| Навигация и контекст родителя | URL `?tab=…`, breadcrumbs, Resource в breadcrumbs Endpoint/Deployment, Back/reload; query списка передаётся в Detail и обратно | Diff Viewer |
| Адаптивность; ранее переполнение контролировалось только на отдельных страницах | Три desktop-размера, крайние ширины Sidebar, 390 px; grouped navigation сверху на mobile, локальная прокрутка таблиц и вкладок | Mobile drawer и иные способы навигации требуют наблюдаемой необходимости |

Переход в остальные семь разделов и их ссылки сохранены. Application → Interaction → InteractionRevision, роли участников и направление коммуникации, неизменяемость revision, Unknown/Uncomparable и настоящий AccessRequest проверяются прежними регрессиями. Новых зависимостей, backend/API/SQLite изменений и доменных фактов нет.

## Воспроизводимый walkthrough

1. `cd web && npm run dev`, открыть `/prototype/resources` без backend/credentials.
2. Поиск `192.0.2.10` показывает только `order-api-01`. Scope `orders-prod` и Site `DC-2` дают честный пустой результат; сброс Scope оставляет `ledger-api-01`.
3. Сбросить фильтры, выбрать 1 строку, перейти на следующую страницу, открыть `ledger-api-01`.
4. Overview показывает identity отдельно от адреса, читаемого из истории. Endpoints показывает структурно подчинённый Endpoint; открыть его, затем browser Back. Deployments показывает самостоятельное размещение; открыть и вернуться.
5. History содержит только address/site/OWNER интервальные факты с источниками из fixture. Отсутствие предыдущих значений, авторов и событий явно подписано. Это не журнал и не редактор истории; OWNER не grant.
6. «К списку Resources» или Resources в breadcrumbs возвращает поиск/фильтры/размер/страницу из URL. Прямой URL `/prototype/resources/mock-resource-order?tab=endpoints` работает после reload.
7. Перетащить разделитель Sidebar или сфокусировать его Tab и использовать стрелки, Home/End; reload восстанавливает предпочтение. На mobile resize скрыт, навигация доступна сверху.

В localStorage допустим только `napms.prototype.sidebarWidth` со значением ширины. Subject mock-данные, credentials, sessionStorage и cookies прототип не сохраняет. Заблокированный storage не мешает работе. Данные остаются в памяти одного fixture; fetch/XHR прототип не выполняет. REAL API имеет отдельную подписанную область навигации.

## Браузерная визуальная проверка

Реальные Chromium screenshots, исключительно mock без credentials:

- [Resources Collection, 1920 × 1080](assets/ux-0-2/resources-1920.png).
- [Resource Overview, 1920 × 1080](assets/ux-0-2/resource-overview-1920.png).
- [Resource Endpoints, 1440 × 900](assets/ux-0-2/resource-endpoints-1440.png).
- [Resource Overview, 390 × 844, full page](assets/ux-0-2/resource-mobile-390.png).
- [Измеренная геометрия этих кадров](assets/ux-0-2/geometry.json).

Локальный HTML baseline также открыт в Chromium в тех же desktop-размерах. Кадры просмотрены и сопоставлены: совпадают Sidebar 264 px + разделитель 6 px, workspace 1650/1170 px, внешние отступы 28 px, тёмная навигация, светлый canvas, таблицы на доступную ширину, горизонтальные вкладки, Overview из двух панелей. Числа совпадают с [baseline geometry-check](ui-baseline-v0.1/geometry-check.json). Широкое окно не ограничено 1200 px.

Осознанные отличия: placeholders референса отсутствуют; глобальный декоративный поиск, профиль, «Все фильтры» и неподтверждённые действия не перенесены. Работающие select/input имеют видимые подписи. Пагинация 1/2 вместо иллюстративных 25 позволяет проверить две существующие записи. В Overview сохранены фактические identity/provenance и ограничения fixture. На mobile навигация перестраивается в две колонки, вкладки/таблицы прокручиваются локально; глобального горизонтального overflow нет.

## Проверки и оставшиеся замечания

- TypeScript typecheck и production build — PASS.
- Полный Playwright — 17/17 PASS: 12 prototype и 5 прежних real FastAPI/temporary SQLite; API interception отсутствует.
- Desktop 1440 × 900, 1920 × 1080, 2560 × 1440: fluid geometry, min/max Sidebar, мышь/клавиатура, persistence и все Resource tabs без page overflow. Mobile 390 px: навигация, вкладки, поиск вложенных коллекций и возврат.
- Рабочая фильтрация и pagination, сохранение query-контекста, все прежние object links, прямые URL/reload/Back, нулевой fetch/XHR и запрет credentials/domain storage — PASS.
- `openspec validate --all --strict` — 7/7 PASS; `git diff --check` — PASS.
- WSL2 Chromium использует ранее установленный `LD_LIBRARY_PATH=/tmp/napms-browser-libs/usr/lib/x86_64-linux-gnu`; конфигурация проекта и зависимости не менялись.
- Финальный HEAD и GitHub CI указываются в описании PR: SHA невозможно записать внутрь собственного коммита.

P0/P1 в проверенном срезе не обнаружены. P2: смешение русских пояснений и английских технических названий; малый fixture не позволяет судить о производительности/плотности больших коллекций; остальные Detail пока используют старую внутреннюю композицию. Требуется review координатора и владельца, техническая визуальная проверка не заменяет их приёмку.

Следующий минимальный срез после review: Applications Collection → Application Detail с предметными вкладками, сохранив уже проверенные роли, направление и цепочку Interaction/Revision. До review не реализуется.
