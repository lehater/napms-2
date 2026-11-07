# UX-0: интерактивный исследовательский прототип

Issue [#23](https://github.com/lehater/napms-2/issues/23). Восемь компактных read-only разделов, не принятая продуктовая IA. Требования change относятся только к поведению прототипа; исследовательские capabilities и будущие backend-контракты не утверждаются.

## Запуск и walkthrough

Из корня репозитория:

```bash
cd web
npm ci
npm run dev
```

Откройте <http://127.0.0.1:5173/prototype>. Backend и token для прототипа не нужны.

1. Обзор: раздельные карточки декларированного разрешения, Drift и Uncomparable.
2. Ресурсы: поиск по `192.0.2.10` → `order-api-01` → `dep-order-1`.
3. В карточках следуйте `Interaction` → `need-001` → `Q1` → `P1` → `Required` → `Configured`. В Q1 отдельно откройте точную `InteractionRevision`; Need связан с Interaction и участником OrderClient, не с revision.
   В Configured откройте `TAE capture F2` → `TAE entry F2 / 1`, затем вернитесь через вычисленную интерпретацию в Configured → Reconciliation.
4. В карточке Need откройте BusinessProcess Settlement и отдельные заявки Q1 ALLOWED/Q2 DENIED. У Q2 нет Rule; P1 остаётся Active.
5. Сравнение ACL-APP: missing TCP/443, excess TCP/8443, common 0, Drift. У ACL-CORE нет capture и target adaptation: Unknown/Uncomparable.
6. Проверьте breadcrumbs, Back и reload прямой ссылки. Неизвестный object URL показывает «Объект не найден».
7. «Новая заявка» переводит в настоящий `/access-requests/new`, без переноса mock ID. Для настоящего сценария запустите API и используйте локальные credentials по README.

Представления: Обзор; Ресурсы; Приложения и коммуникации; Размещения компонентов; Бизнес-процессы и ConnectivityNeed; Декларированная политика и PolicyRule; NST и фактическая конфигурация; Сопоставление политик. Общие таблицы с поиском и карточки со связанными объектами.

## Граница mock и evidence

Все данные `/prototype` — единый детерминированный fixture `web/src/prototype/data.ts`, идентификаторы `mock-*`, документационные адреса. Одна revision, один Endpoint на Resource. Время оценки фиксировано: `2026-11-07T12:00:00Z`, не live-статус. Source time и collectedAt показаны отдельно.

После review PR #25/#26 fixture согласован с [логической ERD](persistent-state-erd.md). Метка «Устойчивое состояние (логическая модель)» обозначает предметные факты, а не сохранение в браузере или новую SQL-схему. Она применяется к Resource/Endpoint, Application/Deployment, Interaction/Revision, BusinessProcess/Need, Request/Rule и TAE Set/Entry. Метка «Вычисляемое представление» применяется к Required, Configured, Reconciliation и NST-кандидатам. URL и UI-ссылки позволяют drill-down, но не устанавливают хранимые связи между контекстами. Matching и common/missing/excess — предустановленные результаты вычисления, не постоянные сущности.

TAE capture хранит фиктивные source identity, capture reference, scope, source/collection/recording times и оговорки достоверности/полноты; отдельного EvidenceSource-каталога нет. Entry показывает пять измерений: source/destination addresses, IP protocol, source/destination ports. Source ports явно Any, destination ports — диапазон 8443–8443. Configured — интерпретация этих фактов в выбранном scope при выдуманном допущении полноты, не сам capture. Unknown ≠ Any ≠ пустой набор; отсутствующий capture не означает отсутствие правил. Технический Permit не равен AP-разрешению. Между TAE и Rule/Firewall нет постоянных ссылок; из TAE доступны только собственные факты и вычисленная интерпретация.

RC показывает текущий адрес как чтение EndpointAddressHistory; площадка и OWNER отображаются как временные факты с интервалами. Это не редактор истории. OWNER не предоставляет action grant. В обеих заявках отдельно подписаны source-only RequestAuthorityEvidence (`access.request`, scope, окно grant и время проверки) и authority решения (`access.decide`). RuleAuthorizationEvidence связывает P1 с Q1 ALLOWED и не заменяет evidence подачи заявки.

Существующие NST-карточки показывают вычисляемый FirewallCandidate, а не сохраняемый Firewall NEP. CurrentRoutingState означает последнее успешное состояние маршрутизации, EffectiveReachabilitySegment — сохраняемую перестраиваемую проекцию; они не реализованы и не имитируются в UX-0. Placement остаётся недоказанным. TAE и NEP независимы; NEO не входит в прототип.

Приложение прототипа не получает API-клиент и credentials, не обращается к SQLite, ничего не сохраняет. Переход из реального UI в прототип размонтирует credential-owning App; при возврате token вводится заново. Нет новых API, сетевых операций, отзыва доступа, автоматической смены revision или имитации выполненного исправления. Настроенные permits и эквивалентность NST — только фиктивное допущение. Candidate placement не доказывает маршрут или доставку. Отсутствующий capture не интерпретируется как пустая политика.

## Проверки

Из `web`: `npm run typecheck`, `npm run build`, `npm run test:e2e`. Проверки проверяют fixture, восемь разделов, каждую ссылку, цепочку через TAE, Need→Interaction и Request→Revision, типы данных, независимость TAE/AP/NEP, поиск, прямые URL, Back/reload, отсутствие fetch/XHR и границу реальных маршрутов. Существующий `requests.spec.ts` использует настоящие FastAPI и временную SQLite без mock interception, включая ALLOWED/DENIED и отрицательную авторизацию. Общий CI web job запускает обе группы.

## Вопросы владельцу для следующего этапа

- Понятны ли пользователям разделение «потребность / разрешено / требуется NST / настроено» и восемь названий разделов? Нужны task walkthrough с заявителем и сетевым оператором.
- Как выбирать candidate NST и доказывать scope, completeness, freshness и эквивалентность адаптации перед реальным сравнением?
- Какой контекст должен предоставлять будущий picker заявок вместо четырёх UUID, сохраняя BusinessProcess/Need и source authority?
- Как отдельно определить прекращение доступа и lifecycle InteractionRevision? В UX-0 этих действий нет; DENIED не служит отзывом.
