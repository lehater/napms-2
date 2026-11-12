# NAPMS 2.0 — архив исследовательских Draft PR #16, #22 и #39

**Статус:** ARCHIVED RESEARCH / reference only, 2026-11-12.  
**База архива:** `main@9340f1af4530bfd9c5dc41980cf90ecc90df0d8f`.  
**Граница:** материалы не становятся принятыми продуктовыми требованиями, обязательными architecture gates или поручением запускать эксперименты.

Назначение — сохранить полезные отчёты в дереве `main`, чтобы закрытие старых исследовательских PR не лишило проект ключевых выводов. Исторические тексты перенесены в исходные пути с пометкой «Архив». Отдельные бинарные доказательства не переносились.

| Исследование | Сохранённый текст | Что установлено | Что **не** установлено |
| --- | --- | --- | --- |
| [PR #16 — SDLC-04A](https://github.com/lehater/napms-2/pull/16), `d2d24db2276489034f3e534556d4166787c9117f` | [Полное исследование и гипотеза](../engineering/sdlc-04-problem-selection.md) | Исторические сбои strict OpenSpec в PR #4; сформулирована проверяемая гипотеза preflight и независимый A/B-протокол | Влияние инструкции на качество агента **не измерено** |
| [PR #22 — Architecture Validation / X02](https://github.com/lehater/napms-2/pull/22), `f7b4c03fe1f71808817fd7a6cf38f10afbbd0cf0` | [Полный обзор методов](architecture-validation/napms-architecture-verification.md), [план X02](architecture-validation/x02-experiment-plan.md) | Сопоставлены ALMA, ARID, Domain Storytelling, ADR, OPA/CUE и другие готовые подходы; предложена оценка одного change scenario | Сравнительный эксперимент X02 **не выполнялся**, новые архитектурные требования не принимались |
| [PR #39 — Application Detail UI Skills A/B](https://github.com/lehater/napms-2/pull/39), `990e17eff64e3d5368ffeeaeea542bcc02e65e09` | [Полная постановка](../../experiments/ui-skills/application-detail/README.md), [результаты пилота](../../experiments/ui-skills/application-detail/RESULTS.md), [независимый аудит](../../experiments/ui-skills/application-detail/evidence/audit/findings.md), [оговорки по исполнению](../../experiments/ui-skills/application-detail/evidence/meta/execution.md) | В одном контролируемом пилоте вариант B улучшил чтение source/destination/traffic и навигацию к Revision без увеличения размера patch. Обе ветки прошли исходные build/semantic/E2E | Нет доказательства статистического эффекта Skills, стоимости, причинной связи или готовности внедрения UI-патча |

## Судьба исходных PR

- **#16:** после проверки архива можно закрыть **без merge**. Продолжающий исследование [Draft PR #17](https://github.com/lehater/napms-2/pull/17) с frozen SDLC-04B остаётся **OPEN**, без автоматического запуска шести A/B trials. История выбора гипотезы из #16 сохраняется здесь.
- **#22:** после проверки архива можно закрыть **без merge**. План X02 остаётся неисполненным кандидатом, а не обязательным этапом развития NAPMS.
- **#39:** после проверки архива можно закрыть **без merge**. При необходимости будущего внедрения B сначала потребуется новое предметное решение и независимый продуктовый PR, основанный на актуальном `main`.

## Что намеренно не перенесено в main

- Из [#22: `napms-architecture-checks.zip`](https://github.com/lehater/napms-2/blob/f7b4c03fe1f71808817fd7a6cf38f10afbbd0cf0/docs/research/architecture-validation/napms-architecture-checks.zip) — бинарный архив первичных OPA/CUE/Import Linter проверок.
- Из [#39: экспериментальные evidence](https://github.com/lehater/napms-2/tree/990e17eff64e3d5368ffeeaeea542bcc02e65e09/experiments/ui-skills/application-detail/evidence) — снимки экранов, полные логи, JSON-измерения и исходные patch-файлы, включая оригинальные результаты A/B.

**Ограничение хранения:** ссылка на commit/PR сама по себе не равна долговременному архивированию исходного бинарного содержимого. Поэтому **ветки #22 и #39 удалять нельзя**, пока владелец не подтвердит, что эти доказательства более не нужны, либо пока они не сохранены отдельным защищённым ref/tag/артефактным хранилищем. Закрытие PR не заменяет этот выбор.

В этой архивной поставке не изменяются продуктовый код, CI, тесты, OpenSpec, ветка PR #17 или права доступа. Изменение исследовательских документов носит информационный характер.
