# SDLC-02 — воспроизводимый baseline наблюдаемости GitHub

**Issue:** [#8](https://github.com/lehater/napms-2/issues/8) · **Дата снимка:** 2026-11-07.  
**Источник:** `main@ae1c9a3d0c9d26628405c124213fe9f06b6504e0`.  
**Период наблюдения:** 2026-11-06 00:06:23–23:08:06 UTC (вся история `Verify`, доступная на момент снимка).  
**Выборка:** 28 workflow runs, 9 PR, все PR объединены. Это историческая выборка, а не устойчивая статистическая оценка процесса.

## 1. Контракт измерения

| Сущность / метрика | Определение | Источник |
| --- | --- | --- |
| PR lifecycle | `number`, `created_at`, `merged_at`, `head.ref`; elapsed `merged_at - created_at` только для merged PR | [Pull requests API](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests) |
| CI run outcome | Один workflow run (`id`, `event`, `conclusion`); доля успешных = `success / completed` | [Workflow runs API](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-repository) |
| CI elapsed proxy | `updated_at - run_started_at` в секундах; timestamps workflow, не фактическое CPU-время и не затраты агента | Workflow runs API |
| CI reruns | `run_attempt > 1` означает повторную попытку *того же* workflow run | Workflow runs API |
| PR проверочные итерации | Количество `pull_request` workflow runs по ветке PR; дополнительные проверки = `max(0, runs - 1)` | Workflow runs + PR head branch; связь проверена на этой выборке |
| CI jobs / blocking gates | `job.conclusion`, `job.started_at`, `job.completed_at`; сбой конкретного шага — по job steps и логам | [Workflow jobs API](https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run), job logs |
| Advisory quality | Исходный `steps.<id>.outcome` в `GITHUB_STEP_SUMMARY` или логи; **не** `job.conclusion` и не `steps[].conclusion` REST API | [Verify workflow](../../.github/workflows/verify.yml), run logs |

Сопоставление PR→runs в этом снимке выполнено по уникальной ветке `head.ref == head_branch` и `event == pull_request`; все 19 PR runs сопоставлены. В общем случае при повторном использовании имени ветки / форках / удалённой истории нужно использовать более надёжный идентификатор из события и учитывать время; массив `workflow_run.pull_requests` в полученном ответе был пуст.

## 2. Baseline — исторические измерения

| Показатель | Значение |
| --- | --- |
| `Verify` runs | **28**: 26 success, 2 failure; 26/28 = **92,9%** успешных |
| `push` / `pull_request` runs | **9/9** success для push; **17/19** success для PR |
| GitHub Actions rerun attempts | **0**; у всех 28 runs `run_attempt = 1` |
| PR | **9 merged**, 0 open |
| PR проверочные итерации | 19 PR runs по 9 PR; **10 дополнительных** workflow runs сверх одного на PR |
| PR lifecycle elapsed | медиана **198 с (3:18)**, диапазон **41–2822 с**; 9 merged PR |
| Workflow elapsed proxy | медиана **19 с**, диапазон **11–32 с**; 28 runs |

PR runs по веткам: #1 — 1, #2 — 1, #3 — 4, #4 — 4, #5 — 2, #6 — 1, #11 — 1, #12 — 4, #13 — 1. У каждого PR run в выборке свой `head_sha`; дополнительные запуски не равны GitHub Actions reruns и не доказывают число внутренних итераций Codex.

**Два failure**: [42283409764](https://github.com/lehater/napms-2/actions/runs/42283409764), [42283418956](https://github.com/lehater/napms-2/actions/runs/42283418956), оба на ветке PR #4. Job `validate` упал на `openspec validate --all --strict`: требование `policy-export/spec.md / Coherent single evaluation` превышало 500 символов. Оба запуска имеют `run_attempt = 1` и разные `head_sha` — это два run, не повторы одной попытки.

## 3. Последний `main` и качество сигналов

[Verify 42309722384](https://github.com/lehater/napms-2/actions/runs/42309722384), `main@ae1c9a3`, завершён успешно: **application** и **validate** — success.

В логе application при этом: **60 pytest PASS**, statement coverage **324/341 (95%)**, Ruff core **0 / PASS**; advisory: Ruff extended **19 ошибок**, Ruff format **10 файлов**, Pyright **8 ошибок**. Исходные advisory outcomes — `failure`, хотя REST job steps показывают `conclusion: success` из-за `continue-on-error`. Таким образом, **green workflow не означает clean lint/types**. Источник для сопоставления — [SDLC-01 baseline](quality-gates-baseline.md).

Для последнего workflow run запрос artifacts вернул пустой список. Это не позволяет делать вывод об отсутствии любых артефактов в других runs. Структурированной телеметрии Codex (токены, стоимость, reasoning/trajectory, внутренние retry) в исследованных GitHub данных нет.

## 4. Воспроизведение через GitHub CLI

Требуются `gh` (с правами чтения репозитория и Actions), `jq`, сетевой доступ. Запускать в пустой временной директории; данные среза можно сверять по исходным ID выше. Команды читают API, не изменяя репозиторий.

```bash
repo=lehater/napms-2
gh auth status
gh api --paginate "repos/$repo/actions/runs?per_page=100" \
  | jq -c '.workflow_runs[] | {id,event,head_branch,head_sha,conclusion,run_attempt,run_started_at,created_at,updated_at}' > runs.ndjson
gh api --paginate "repos/$repo/pulls?state=all&per_page=100" \
  | jq -c '.[] | {number,created_at,merged_at,head_branch:.head.ref}' > prs.ndjson

jq -s '{
  total:length,
  success:([.[]|select(.conclusion=="success")]|length),
  failure:([.[]|select(.conclusion=="failure")]|length),
  pr_runs:([.[]|select(.event=="pull_request")]|length),
  push_runs:([.[]|select(.event=="push")]|length),
  gha_reruns:([.[]|select(.run_attempt>1)]|length)
}' runs.ndjson

jq -s --slurpfile prs prs.ndjson '
  [.[] | select(.event=="pull_request")] as $runs
  | [$prs[] | .head_branch as $branch |
      {pr:.number, runs:([$runs[]|select(.head_branch==$branch)]|length)}]
' runs.ndjson

jq -s '
  def median: sort as $a | ($a|length) as $n |
    if $n == 0 then null
    elif $n % 2 == 1 then $a[($n/2|floor)]
    else ($a[($n/2|floor)-1]+$a[($n/2|floor)])/2 end;
  [.[] | select(.merged_at != null) |
    ((.merged_at|fromdateiso8601)-(.created_at|fromdateiso8601))] |
  {merged_prs:length, median_pr_elapsed_seconds:median}
' prs.ndjson

jq -s '
  def median: sort as $a | ($a|length) as $n |
    if $n == 0 then null
    elif $n % 2 == 1 then $a[($n/2|floor)]
    else ($a[($n/2|floor)-1]+$a[($n/2|floor)])/2 end;
  [.[] | ((.updated_at|fromdateiso8601) -
    ((.run_started_at // .created_at)|fromdateiso8601))] |
  {runs:length, median_elapsed_proxy_seconds:median}
' runs.ndjson

gh api "repos/$repo/actions/runs/42309722384/jobs?per_page=100" \
  --jq '.jobs[] | {name,conclusion,started_at,completed_at,steps:[.steps[]|{name,conclusion}]}'
gh run view 42309722384 --repo "$repo" --log
```

**Повторные измерения:** записывать момент снимка, ref/commit, период, выбранные run ID и конфигурацию workflow. Вывод `gh api --paginate` включает все доступные страницы. Для повторения *исторического* среза фильтровать по периоду, а не автоматически сравнивать растущую полную историю. Для диагностики failure: `gh run view <run-id> --repo "$repo" --log-failed`. Источник числа advisory errors — логи, не JSON job conclusion.

## 5. Достоверность и критерий последующего сравнения

- **Не измеряются:** Codex tokens/cost, время программирования, число запросов к модели, его внутренние решения и причины собственных retry. GitHub workflow events не являются агентной трассировкой.
- **Ограничения:** всего один календарный день, девять PR; выборка включает bootstrap, спецификации, продукт и Quality Gates с различным составом проверок. Медианы elapsed нельзя интерпретировать как эффективность труда или сравнивать «до/после» без контроля состава задач.
- **Неоднородность CI:** quality gates менялись в конце периода. Для будущего сравнения сохранять версию workflow, набор проверок и разделять blocking/advisory, а также PR/push runs.
- **Следующий эксперимент (#10):** заранее задать одинаковое задание и критерии приёмки, зафиксировать исходный commit, версии инструментов, число отдельных runs, blocking failures и PR elapsed. Сравнивать только сопоставимые срезы и проверять CI-логи; отсутствие улучшения считать допустимым результатом. При малой выборке не вводить целевые пороги.
- **Решение SDLC-02:** текущие GitHub API, CLI и logs достаточны для минимального baseline; отдельная БД, dashboard, agent telemetry pipeline и изменения Harness **не требуются**. Автоматизацию сборщика рассматривать лишь после появления повторяющейся ручной работы.

**Приёмка:** документ и воспроизводимые команды в Draft PR; CI проверяется по конкретному head SHA. Merge и закрытие #8 — после review владельцем.
