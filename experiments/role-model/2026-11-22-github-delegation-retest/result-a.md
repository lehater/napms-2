## Issue #153 — Finding methodology

[Issue #153](https://github.com/lehater/napms-2/issues/153) is a child of [#150](https://github.com/lehater/napms-2/issues/150), with no native blockers stated. It asks for a repeatable, evidence-based method to turn real execution signals into verifiable Findings, with useful symptom groupings and explicit uncertainty.

- **Accepted outcome:** a minimal Finding contract and documented category boundaries; distinguish normal probes/TDD steps, execution failures, evidence-backed problems, and hypotheses. The research found no privacy-safe sample with independent expert labels, so it reports no false-positive/false-negative rate. It does not introduce an analyzer, mandatory taxonomy, or judge gate.
- **Constraints/non-goals:** research and documentation only; no required LLM judge, paid model, synthetic runs, or Harness change. Protect private traces and payloads.
- **Artifact and merged PR:** [`docs/engineering/sdlc-150-issue-153.md`](https://github.com/lehater/napms-2/blob/de05720f5aa16f9833897fc045acd8cf2509973a/docs/engineering/sdlc-150-issue-153.md), added by [PR #160](https://github.com/lehater/napms-2/pull/160), verified **MERGED** on 2026-11-20.

## Issue #155 — Measuring improvement effects

[Issue #155](https://github.com/lehater/napms-2/issues/155) is also a child of [#150](https://github.com/lehater/napms-2/issues/150), with no native blockers stated. It asks how to assess whether accepted Harness changes actually resolve specific observed problems, using comparable follow-up evidence and explicit uncertainty.

- **Accepted outcome:** define defect-linked baseline, change/version, ordinary post-change observations, and outcomes such as confirmed, mitigated, unknown, or regression. The report finds the available evidence insufficient to establish effects; it does not claim improvement from merged changes alone.
- **Constraints/non-goals:** no arbitrary run counts, mandatory A/B tests, new telemetry, dashboards, gates, or unsupported cost-savings claims. Protect private traces.
- **Artifact and merged PR:** [`docs/engineering/sdlc-150-issue-155.md`](https://github.com/lehater/napms-2/blob/c71c16edd698a6ec5f800c879d64ce7869107f0c/docs/engineering/sdlc-150-issue-155.md), added by [PR #162](https://github.com/lehater/napms-2/pull/162), verified **MERGED** on 2026-11-20.

## Issue #156 — Minimal analytics pilot plan

[Issue #156](https://github.com/lehater/napms-2/issues/156) is a child of [#150](https://github.com/lehater/napms-2/issues/150) and was natively blocked by **#151–#155**. Its issue text and linked result record those five blockers closed/Done with merged PRs #158–#162. Thus, **#156 consumes the accepted outcomes of #151–#155** as inputs to its plan; it does not itself implement them.

- **Accepted outcome:** an on-demand, read-only pilot plan connecting available evidence to Findings and GitHub outcomes, with privacy, quality, cost, and stop criteria. The plan defers live Langfuse reading until version, Viewer access, permitted route/recipient, and a limit are confirmed.
- **Constraints/non-goals:** no runtime automation, service, schedule, dashboard, auto-write, permission change, or product/Harness change; no raw traces or private payload publication.
- **Artifact and merged PR:** [`docs/engineering/sdlc-150-issue-156.md`](https://github.com/lehater/napms-2/blob/bc17c3c5207f41ed52819aa06895898247fca2c9/docs/engineering/sdlc-150-issue-156.md), added by [PR #164](https://github.com/lehater/napms-2/pull/164), verified **MERGED** on 2026-11-20.

**Unknowns:** The records establish merged documentation and stated research limitations; they do not establish operational effectiveness, measured Langfuse outcomes, or that a live pilot ran.
