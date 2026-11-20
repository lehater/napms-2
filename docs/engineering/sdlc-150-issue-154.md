# Учёт Findings и Problems в цикле SDLC #150

Дата исследования: 2026-11-20. Область: минимальный маршрут от наблюдения до принятого решения и реализации, без внедрения новых компонентов.

## Краткий вывод

Рекомендую пока не вводить отдельную БД, registry, синхронизацию или новый статус GitHub Project. Использовать GitHub как каноническую запись для Findings, заслуживающих сохранения, Problems, принятых Decisions и Action Items; Langfuse оставить источником сырых traces и детализации отдельных событий. Issue #138 полезен как исследовательский указатель и источник исторических примеров, но остаётся Draft PR и не должен считаться нормативным реестром.

Операционный минимум: краткий Finding помещать в существующую GitHub запись, если она уже описывает тот же симптом; иначе — в Issue/PR, несущий контекст, либо в отдельный Issue только когда проблема требует самостоятельного исследования/действия. Подтверждённое или предполагаемое обобщение фиксировать как Problem с явным уровнем уверенности. Решение сохранять в комментарии/теле canonical Issue или PR. Реализацию вести существующими Issues с native hierarchy/blocked_by и обычным workflow. Не превращать каждое событие или tool error в Issue.

Это рекомендация исследования, не утверждение о принятии владельцем. Автоматические записи, новые labels/views и отдельное хранилище требуют отдельного решения и демонстрации конкретного пробела.

## Источники истины и границы

| Объект | Канонический источник | Минимальное содержание и граница |
|---|---|---|
| Raw Trace / raw event | Langfuse | Исходные события и payload остаются там. В публичный Issue/PR не копировать trace contents, секреты и персональные данные; сохранять минимальную ссылку/идентификатор и нужный временной диапазон только при допустимом доступе. |
| Finding | GitHub Issue/PR, связанный с наблюдением или проблемой | Наблюдаемое утверждение, impact, ссылка на доказательство, дата и источник; отделить факт от интерпретации. Одно событие может быть Finding без отдельного Issue. |
| Problem | Один canonical GitHub Issue, если есть самостоятельный повторяемый вопрос, RCA или действие | Симптом/область, evidence links, число событий и независимых runs/tasks (если известны), first/last seen, severity, confidence, RCA state/hypothesis. Issue lifecycle не копируется в сторонний реестр. |
| Decision | Запись решения в canonical Problem/parent Issue либо в PR, который его реализует | Решение, обоснование, владелец/дата, альтернативы, критерии эффекта и ссылки на исходные Findings. Это факт принятия решения, а не исполнение меры. |
| Action Item | GitHub Issue с обычными Type/Area/Workstream/Priority/Status и native relations | Самостоятельный проверяемый outcome; создавать/переиспользовать через intake/refinement/decompose. При необходимости это native child/sub-issue или отдельный Issue с реальной зависимостью. |
| Effect | Исходный Problem + доказательства в интеграционном PR/CI/последующих наблюдениях | Статус выполнения задачи не доказывает устранение проблемы. Записать baseline/критерий и фактический результат либо явно указать, что эффект не измерен/неизвестен. |

Типизированные связи представлять прямыми GitHub URL и номерами вместе с явной меткой отношения в тексте записи: `Finding —observed-in→ trace`, `Finding —supports→ Problem`, `Problem —decided-by→ Decision`, `Decision —implemented-by→ Issue/PR`, `Problem —effect-evidenced-by→ CI/PR/follow-up`. GitHub native parent/child и blocked_by применяются только к настоящей структуре результата/зависимостям; текстовая ссылка не выдаётся за native relation. Решение и ссылка остаются читаемыми без внешней базы. В текущем workflow уже закреплено, что Issue, native Project fields/relationships и linked PR — источники состояния, а handoff evidence сохраняется в соответствующем Issue/PR.

## Контракт Finding → Problem → Decision → Issue

1. **Finding:** записать `finding_id` (GitHub URL + локальный идентификатор, если есть), `observed_at`, `source_kind`, evidence reference, краткий symptom, область/компонент, влияние и факт/гипотезу. Сохранять только минимум контекста, достаточный для проверки; не публиковать raw trace.
2. **Problem:** связать один или несколько Findings с canonical Problem Issue. Поля-кандидаты: стабильный fingerprint, описание симптома, версии/условия, `event_count`, `independent_run_count`, `independent_task_count` (все с диапазоном/неполнотой при необходимости), first/last seen, severity, confidence, RCA (`unknown | hypothesis | confirmed | refuted`), причина и критерий пересмотра. Не смешивать severity (влияние/серьёзность) с Project Priority (очередность работы).
3. **Decision:** добавить запись в Problem Issue с outcome `accept | defer | no_change | investigate_more`, основанием/альтернативами, владельцем, датой, критерием проверки эффекта и условиями повторного открытия. Не считать mitigation закрытием до evidence.
4. **Issue/PR:** для принятого action переиспользовать подходящий Issue или предложить новый distinct outcome в штатном intake; проверить прошлые open/closed Issues и принятые решения. Записать native relations, классификацию и критерии, затем исполнить через Ready/admission/PR. Принимать результат и эффект раздельно.

Пока не требуется отдельный глобальный Finding ID-сервис. GitHub URL/номер стабилен в рамках записи; fingerprint служит для поиска кандидатов, не идентификатором истины. Предлагаемый fingerprint для ручного поиска: `source/workstream + normalized symptom + affected surface + trigger/condition + relevant version`. Убирать динамические значения и персональные данные; хранить исходное описание рядом. Не включать root cause в ключ: причина часто неизвестна или меняется в ходе расследования. Совпадение fingerprint — повод сравнить evidence, не автоматическое доказательство дубля.

## Дедупликация, обновление и эскалация

| Ситуация | Предлагаемое действие |
|---|---|
| Единичное, низкой серьёзности наблюдение без повторяемого action | Оставить evidence в Issue/PR, CI или Langfuse annotation, если там уже ведётся ручной анализ. Отдельный Problem Issue не обязателен. При потере cross-task discoverability можно записать короткую ссылку в существующую подходящую GitHub запись. |
| Повторный симптом, но одна задача/run повторяет вызов | Обновить существующий Finding/Problem ссылками и счётчиками; это несколько событий, но не независимые затронутые задачи. Повторно исследовать RCA только если новое evidence меняет гипотезу/условия. |
| Повтор в независимой задаче/run | Найти canonical Problem по fingerprint и evidence; дополнить счётчики, first/last seen и ссылки, сохранив неизвестные значения как неизвестные. Не создавать новый Issue по числу событий одному run. |
| Серьёзное/потенциально срочное событие | Немедленно уведомить владельца/ответственного через существующий GitHub Issue/PR или принятый incident-маршрут; зафиксировать severity отдельно от P0–P2 priority и продолжить проверку доказательств. Порог/матрица severity не заданы данным исследованием. |
| Уже есть открытый Issue того же outcome | Добавить evidence и уточнить scope/acceptance без дублирования. Новую задачу создавать только для distinct результата; native relationship — если зависимость реальна. |
| Похожий закрытый Issue | Сначала проверить прежний scope, решение и эффект. Если принятие осталось верным, создать отдельный follow-up/regression кандидат и связать с историческим; переоткрывать только если evidence опровергает первоначальное принятие. Это соответствует существующей intake policy. |
| Симптом повторился после принятой меры | Пометить как candidate regression в существующей Problem/effect записи, связать с PR/CI/новыми traces, проверить версию и соблюдение меры. Не закрывать исходную проблему только фактом merge. |
| Дедуп ошибочен | Человек вручную split/merge: сохранить историю ссылок, объяснить критерий, назначить canonical Issue и обновить перекрёстные ссылки. Не терять исходные Finding/evidence при объединении. |

Ни число независимых задач, ни first/last seen не считать полными, если источники не дают надёжной корреляции. «3 независимые задачи» остаётся гипотезой для будущей калибровки. До накопления репрезентативных примеров применять экспертную эскалацию по серьёзности и контексту, а не фиксированный автоматический порог.

## Проверка кандидатов и примеры

**GitHub Issues/Projects.** Подходят для canonical Problem, принятого Decision и реализации: дают стабильные URL/номера, lifecycle, Project Type/Area/Workstream/Priority/Status, native Sub-issues и blockers, review и PR evidence. Проектная классификация уже задаёт Area (`area:sdlc`), Workstream (SDLC), Priority и Status (включая Preparing/Ready/Running/Review/Done). Не добавлять `Backlog`/`Triage` или новую Issue taxonomy для Finding. View — только сохранённое представление существующих полей после подтверждения потребности; оно не создаёт новый источник истины.

**Quality Escape Handling.** Уже имеет маршрут Register → Reproduce → Localize → Prevent → Improve Harness? → Accept и классификацию причин. Он требует воспроизводимого негативного случая и позитивного исправленного случая для подтверждённого escape. Поэтому этот протокол подходит для Finding, который уже представляет дефект, прошедший проверки; он не требует превращать обычный шум инструмента в escape или отдельное поручение.

**Langfuse scores/comments.** Актуальная документация описывает Scores для trace, observation, session и dataset run; доступны числовые, категориальные, boolean и text значения. Ручные annotations, comments и annotation queues подходят для локальной оценки trace и заметок; scores доступны в аналитике/API. Это подтверждает возможность фиксировать оценку события, но не подтверждает, что Langfuse в данной установке хранит cross-run canonical Problem, GitHub lifecycle/решения или гарантированную дедупликацию независимых задач. Использовать как evidence/annotation слой, а не backlog. Источники: [Scores overview](https://langfuse.com/docs/evaluation/scores/overview), [Scores data model](https://langfuse.com/docs/evaluation/scores/data-model), [Comments](https://langfuse.com/docs/observability/features/comments), [Annotation Queues](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues).

**Отдельная БД.** SQLite/PostgreSQL могут индексировать Findings и агрегировать события, но добавят второй lifecycle, права, резервирование/retention, идентичность canonical записей, reconcile и поддержку split/merge. В доступном evidence нет подтверждения, что GitHub + ссылки на Langfuse не справляются с конкретным требованием. Поэтому отклонить на этом этапе; пересмотреть только при доказанном запросе (например, невозможность ручного поиска/подсчёта на реальном объёме) и отдельном owner decision.

**Пример #30 (Quality Escape).** Issue #30 описал семантическую ошибку UX-0, прошедшую CI: AccessRequest смешан с PolicyRule и различия статусов потеряны. PR #32/Verify #42519051142 добавили negative proof: намеренная утечка UI-only fixture проходит быстрый validator, но падает на browser semantic check. Это конкретная цепочка `Finding (#30, факт и repro) → Problem (coverage/semantic-contract gap, первоначальная RCA-гипотеза) → Decision (добавить детерминированную проверку в существующий Verify; принятие/меры документированы в #30/PR #31) → Issue/PR (#30, #31)`. Не обобщать один кейс на глобальное правило без повторяемости; используемый протокол требует подтверждения и review.

**Примеры HE из Draft PR #138.** HE-001 содержит события sandbox/socket retries и решение MITIGATED с условием проверки на следующей реальной задаче; HE-002 — подтверждённую проблему реконструкции Langfuse и ссылку на внешний upstream #20582, при этом гипотеза о дублировании фактического клиентского запроса не подтвердилась; HE-005 — наблюдения о повторных GitHub/CI запросах и решении использовать bounded wait/read-back в #146/PR #149, с эффектом ещё не измеренным; HE-007/008 фиксируют ограничения данных и обходы без постоянной инфраструктуры. Эти записи полезны как evidence и примеры различия `OPEN/MITIGATED/CLOSED` и статуса эффекта. Но они находятся в Draft #138 на research branch; ряд записей содержит чувствительные к контексту количественные/стоимостные детали. Для повторного использования брать только необходимые, очищенные ссылки и выводы. Не копировать приватные payload или необязательные числа в общий реестр.

**Проверка intake на открытые/закрытые примеры.** #144 был отдельным outcome после повторяющихся ошибок GitHub CLI/API в трёх сессиях; он использовал #138 как evidence и был завершён с отдельным Issue/PR, не переоткрывая закрытые #10/#94. Это соответствует правилу distinct action + reuse history. #94 — закрытое решение не вводить обязательные метрики/A-B/observability без доказанной необходимости; его не следует переоткрывать ради нового registry. #138 не является принятым решением. В родительском #150 уже есть native decomposition #151–#156; #154 — самостоятельный исследовательский outcome, а не разрешение на implementation task.

## Проверяемый intake и обновление

1. На входе сохранить в GitHub evidence reference, симптом, impact и источник; не включать raw trace payload. Если факт только наблюдательный, так и пометить.
2. До создания записи искать по ключевым полям/ссылкам в open и closed Issues, решений roadmap/quality escape и реестре HE как вторичном указателе. Проверить scope, статус и критерии возобновления; поиск не доказывает отсутствие дублей во всех источниках.
3. Выбрать одно: добавить evidence в canonical Issue; связать с существующим Problem; либо предложить новый самостоятельный Problem/action. Для исторического closed Issue сохранить его lifecycle и создать связанный follow-up только при distinct outcome или доказательстве, что acceptance неверно.
4. При любом GitHub mutation подготовить ожидаемое состояние, применить только разрешённые изменения и сделать независимый read-back. Операция повторного запуска должна быть безопасной: сначала найти canonical URL/Issue и уже существующие native links, затем обновлять отсутствующие данные без дублей. Не утверждать успех по API response без read-back.
5. Решение и эффект фиксировать отдельно. Для измерения эффекта указать доступные runs/tasks и период; пропущенную корреляцию/недостаточный baseline раскрывать, не выводить нулевую повторяемость из отсутствия данных.
6. Любая реализация остаётся отдельным согласованным Action Item; этот report не назначает исполнителя и не меняет статусы.

## Ограничения и решение, требуемое от владельца

- Не исследовались закрытые payload, сырые traces или доступ к конкретной Langfuse-инсталляции. Возможности Langfuse выше установлены по опубликованной документации; наличие/настройка функций, scopes, retention и корреляция текущего self-hosted экземпляра не проверены.
- Реестр #138 прочитан через открытый Draft diff. Его полнота относительно всех research-веток не подтверждена, а draft нельзя использовать как нормативный источник.
- Доступные примеры не дают валидной выборки для порогов дедупликации/escalation, baseline частоты независимых задач, severity matrix или причинного измерения эффекта. Порог 3 не калиброван.
- Текущая Project taxonomy проверена по принятой workflow policy и живым Issue/Project handoff данным; предложения source/type/area labels и отдельный View не имеют доказанной необходимости. Не предлагается их добавлять.
- Рекомендация: принять GitHub+Langfuse link-based минимальный подход без БД и синхронизации, оставив Problem запись частью GitHub lifecycle; HE вести только как исследовательский индекс, пока владелец не решит иначе. Если владелец хочет единый постоянный журнал Findings, нужно выбрать конкретный GitHub-носитель (Issue comments, issue body section или отдельный документ) и установить права/retention; текущие свидетельства не требуют отдельного cross-cutting registry.

## Источники

- [Issue #154 и handoff](https://github.com/lehater/napms-2/issues/154#issuecomment-7042746649), [родитель #150 и refinement handoff](https://github.com/lehater/napms-2/issues/150).
- [Workflow policy](../../.ai/workflow.yaml), [Quality Escape Handling](quality-escape-protocol.md), [SDLC roadmap](sdlc-improvement-roadmap.md).
- [Закрытая #10](https://github.com/lehater/napms-2/issues/10), [#94](https://github.com/lehater/napms-2/issues/94), [#30](https://github.com/lehater/napms-2/issues/30), [#144](https://github.com/lehater/napms-2/issues/144), [Draft PR #138](https://github.com/lehater/napms-2/pull/138).
- Langfuse: [scores](https://langfuse.com/docs/evaluation/scores/overview), [score data model](https://langfuse.com/docs/evaluation/scores/data-model), [comments](https://langfuse.com/docs/observability/features/comments), [annotation queues](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues).
