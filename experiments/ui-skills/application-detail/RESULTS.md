# Application detail UI skills: executed paired pilot

Both arms started at `642a6f8f5d7e903641068887bd5a32ae6ea466d3`. The existing Draft PR remains an evidence-only change; UI implementations are isolated on separate branches.

| Result | A: incumbent instructions | B: pinned frontend-design + shadcn |
| --- | --- | --- |
| Implementation commit | [`5e9ee5f`](https://github.com/lehater/napms-2/commit/5e9ee5f) | [`1950c62`](https://github.com/lehater/napms-2/commit/1950c62) |
| Build / semantic | PASS / PASS | PASS / PASS |
| Full E2E | 26 passed, 25.8s | 26 passed, 24.7s |
| Patch complexity | 2 files, +29/−6, 0 dependencies | 2 files, +29/−6, 0 dependencies |
| Screenshots | 9 | 9 |
| Document overflow | none in 9 states | none in 9 states |
| New audit finding | P3 mobile table word fragmentation | none established |

Timing above is test execution time, not agent implementation cost. Both final diffs contain only `web/src/prototype/Views.tsx` and `baseline.css`; no OpenSpec, backend, domain, fixtures, contracts, dependencies or CI changes. Initial environment failures and retries are retained in the run reports and logs. No hard fail was established within the recorded test/audit coverage.

## Comparative assessment

Both implementations label source and destination roles and add an exact InteractionRevision link to Overview. B additionally reuses that readable communication summary on Communications, exposing roles, direction, traffic and a direct keyboard-operable revision link before the existing horizontal table scroller. A supplies navigation instructions there and compresses the mobile table into narrow columns, splitting component names and Current. B's concrete advantage appears at equal file/LOC/dependency cost. Neither fixes the inherited shell skip-link issue; neither is claimed fully accessible.

| Criterion against baseline | A | B |
| --- | --- | --- |
| Communication/role/revision comprehension | improved | improved; additional direct path on Communications |
| Desktop hierarchy | improved | improved |
| Narrow readability | unchanged, mixed tradeoff (P3) | improved for key task; table still scrolls |
| Keyboard/focus | unchanged overall; added Overview link | unchanged overall; added links on both tabs |
| Change cost | same small cost class | same small cost class |

**Decision: advance the paired B treatment to a larger controlled trial.** The pilot's threshold is met: one reproducible task improvement over A, no observed hard fail, and equal measured patch size. This is not a decision to install skills into the Harness or merge either UI patch. One pair cannot attribute causality to a particular skill or establish productivity/cost improvement.

## Reviewable evidence

- [Independent pinned-guideline audit, file:line findings, false positives and limitations](evidence/audit/findings.md)
- [Execution/session provenance](evidence/meta/execution.md), [A report](evidence/A/run-report.md), [B report and pinned skills](evidence/B/run.md)
- [A build](evidence/A/build.log), [semantic](evidence/A/semantic.log), [E2E](evidence/A/e2e-escalated.log), [patch](evidence/A/implementation.patch)
- [B build](evidence/B/build.log), [semantic](evidence/B/semantic.log), [E2E](evidence/B/e2e.log), [patch](evidence/B/implementation.patch)
- [Shared browser capture script](evidence/audit/capture.mjs), [baseline measurements](evidence/audit/baseline/measurements.json), [A measurements](evidence/A/measurements.json), [B measurements](evidence/B/measurements.json), [revision Enter activation](evidence/audit/activation.json)

All screenshots use Chromium, scale 1, the same Sidebar and state, three tabs at 1440×900, 1920×1080 and 390×844. Images are full-page captures at those viewport dimensions. Nine unchanged baseline screenshots are retained alongside the 18 implementation screenshots. Representative comparisons:

| State | Unchanged baseline | A | B |
| --- | --- | --- | --- |
| Desktop Overview | [image](evidence/audit/baseline/1440x900-overview.png) | [image](evidence/A/1440x900-overview.png) | [image](evidence/B/1440x900-overview.png) |
| Mobile Components | [image](evidence/audit/baseline/390x844-components.png) | [image](evidence/A/390x844-components.png) | [image](evidence/B/390x844-components.png) |
| Mobile Communications | [image](evidence/audit/baseline/390x844-communications.png) | [image](evidence/A/390x844-communications.png) | [image](evidence/B/390x844-communications.png) |

## Limits

Fresh delegated Codex sessions inherited identical model/effort and permissions; no cross-arm edits were read. Installed CLI 0.167.0 is recorded, but these were not CLI subprocess executions. Exact serving model/effort is not independently exposed, so the protocol's runtime provenance is only partially verified. The auditor is a separate read-only agent, knows treatment labels, and is not an external blinded assessor. Chromium geometry, focus and native-link activation are actual observations; no user comprehension study, assistive-technology study, statistical significance or agent cost/trace measurement is claimed. A stricter replicated CLI run with explicit runtime metadata and blinded assessment is needed before broad adoption.
