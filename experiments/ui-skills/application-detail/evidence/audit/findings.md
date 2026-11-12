> **АРХИВ / исследовательский материал, не принятый продуктовый контракт.** Исходник: [PR #39](https://github.com/lehater/napms-2/pull/39), [commit `990e17eff64e`](https://github.com/lehater/napms-2/commit/990e17eff64e3d5368ffeeaeea542bcc02e65e09). Текст и выводы относятся к состоянию исследования 7–9 ноября 2026 года. Приведённые ссылки на отсутствующие в архиве бинарные доказательства ведут к исходному коммиту; исходные ветки пока сохраняются.

# Independent read-only comparative audit

Both frozen arms were inspected only after their edit-ready signals. No implementation was patched and no patch requests were sent. Same pinned Vercel rules in vercel-command.md applied to both. Baseline is unchanged 642a6f8. Captures: baseline/ and A/ here; B screenshots/measurements are ../B/ (same preserved capture.mjs). Representative desktop/narrow screenshots inspected; all 27 state/viewport geometry and keyboard records reviewed. This is a source/browser inspection, not a full WCAG conformance audit or screen-reader user study.

## Findings by file

### Both arms and baseline: web/src/prototype/Shell.tsx

- **P2, inherited** — `web/src/prototype/Shell.tsx:21`: no skip link before repeated Sidebar; `:39` main has no link target. At fresh page, Tab reaches object tabs only at positions 14–16 desktop / 13–15 narrow, repeating navigation on each object. Reproduce at target route with keyboard Tab from document start. Vercel heading/skip-link rule. Existing issue, not an arm regression and not grounds for a hard fail of this change.

### Arm A: web/src/prototype/baseline.css

- **P3, introduced readability tradeoff** — `web/src/prototype/baseline.css:34`: fixed equal-width Communications table plus `:35` anywhere wrapping compresses four columns at 390×844. At `?tab=interactions`, OrderClient becomes `OrderClie`/`nt`, LedgerApi becomes `LedgerAp`/`i`, and Current becomes `Curren`/`t`; destination and status take more effort to scan. Screenshot A/390x844-communications.png. Baseline/B preserve whole-word text inside an intentional horizontal table scroller. A exposes all columns without scrolling, so this is a readability tradeoff, not clipped/missing content or an inaccessible control; no hard fail claimed.

### Arm B: changed files

No additional actionable P0–P3 finding established. Retains inherited shell issue and horizontal table scroll. No claim of complete accessibility conformance.

No P0/P1 findings, new inaccessible controls, page-width overflow or verified accessibility regression found in either arm.

## Rejected false positives

- Native React Router Links and details/summary do not require redundant onKeyDown handlers; browser supplies keyboard behavior. Object tab links preserve URL state and aria-current.
- Visible focus is present: recorded 2px outlines on object tabs in every arm/viewport; A adjusts outline inset rather than removing it.
- sr-only caption scrollWidth>clientWidth is deliberate hiding for assistive technology, not visible clipping.
- Narrow tab strip 367px contents within 358px scroll container is inherited; document width remains 390px and Tab scrolls focused links into view.
- Baseline/B 586px Communications table inside 356px horizontal scroller is intentional localized scrolling, not document overflow. B's added flow/revision summary makes the key task visible before that scroller.
- Direction arrow has a semantic label; source/destination words explicitly identify roles. No invented Component identity/state found.
- More wrapping/vertical height alone is not an accessibility failure; title-case/curly-quote preferences were not promoted to product defects in Russian fixture UI.

## Gates and rubric

Build/semantic/E2E evidence supplied in ../A/ and ../B/ passes (26 browser tests each); audit inspected changes relative to base: only Views.tsx and baseline.css, 29 insertions/6 deletions each; no dependency, fixture, API, schema, contract, CI or navigation changes. Separate source checks found MOCK/REAL separation and role semantics preserved. No hard fail identified within audit coverage. Gate execution belongs to implementation agents; auditor did not rerun those full suites.

| Criterion vs unchanged baseline | A | B | Evidence/interpretation |
| --- | --- | --- | --- |
| Source/destination/roles/direction/revision comprehension | improved | improved | Both label roles and link directly to exact revision on Overview. B also does so on Communications; A instead gives navigation instructions. |
| Desktop hierarchy/information density | improved | improved | Explicit role labels; grouped revision/traffic. B removes inner bordered box and uses shorter Overview card (1440px representative screenshot); no aesthetic score assigned. |
| Narrow readability/no clipped content | unchanged, mixed tradeoff | improved for key task | A removes table scroll but splits names/status (P3); B retains baseline table scroll while showing full source/destination/traffic and revision above it. All document scrollWidth=viewport. |
| Keyboard navigation/visible focus | unchanged | unchanged | All object tabs keyboard reachable with visible outline. Both add working native revision links; B adds one on Communications. Shared skip-link issue persists. |
| Change cost/reuse | unchanged cost class | unchanged cost class | Both 2 files +29/-6, 0 dependencies, scoped CSS, helper reused; B reuses flow on both Overview/Communications. Baseline necessarily has zero change cost. |

## Direct comparison and decision

B demonstrates a concrete task improvement over A on Communications: source and destination are explicitly labelled, traffic and a keyboard-operable InteractionRevision link appear immediately in a readable summary at 390px and desktop. A requires navigating through the communication and its Revisions tab from Communications; its equal-width table fragments the important component names. Both Overview screens provide the direct revision link. Supplemental keyboard Enter activation results are in activation.json; B has a revision anchor in both Overview and Communications, A only Overview. This improvement is achieved at identical file/LOC/dependency cost and without an observed hard fail.

**Recommendation: retain the paired skill treatment only as a candidate for a larger controlled experiment.** Protocol pilot threshold is met for B; this does not establish general productivity benefit, and cannot identify which of the two skills caused an effect. Do not merge either implementation automatically. Missing skip link remains follow-up evidence, not an authorization to broaden this experiment.

## Independence and causal limitations

Independent delegated read-only review, not external independent evaluator. The fresh-session task brief disclosed treatment labels before assessment; true blinding was impossible. Labels were not used as merit evidence. Same-model/effort inheritance is reported by orchestration, but runtime identity/effort is not independently exposed; installed CLI version is not runtime attestation. Both arms may draw on shared project/context knowledge; separate branches and no cross-arm edits do not prove independent stochastic trials. One task, one pair, one assessor; no statistical or cost/telemetry claim. Browser checks use Chromium only, no assistive-tech or user comprehension study; metrics verify geometry and focus behavior, not subjective understanding.
