# Proposal — UI Integration Baseline

## Why
The owner accepted UI/IA Baseline v0.2 (three Sidebar groups, seven collections), but real BusinessProcess and real AccessRequest currently render in two different layouts. The root route falls through to the old AccessRequest app, the local-demo actor selector sits above the Shell, and the AccessRequest screen has a second “Demo mode” selector. BusinessProcess uses raw property rows instead of the accepted collection/detail composition. This is an integration defect, not a reason to postpone the next backend slice or initiate a full visual redesign.

## What changes
- Make the existing fluid, resizable Baseline v0.2 Shell the **single application shell** for real BusinessProcess, real AccessRequest and the existing explicitly marked MOCK prototype.
- Resolve `/` deterministically to the real BusinessProcess collection; preserve direct URLs and the complete mock journey under `/prototype/...`.
- Put one real `Demo actor` control in the common topbar in explicit local-demo mode. Remove the redundant real-request “Demo mode”; UI affordances follow the selected demo actor while **FastAPI grants remain authoritative**. Keep manual bearer mode working outside local-demo and the independent MOCK simulation role.
- Bring real BusinessProcess Collection/Detail and real AccessRequest Collection/Detail/Decision into the existing page composition: breadcrumbs, overview, context tabs, readable properties, consistent controls and loading/errors.
- Keep the accepted 3×7 Sidebar taxonomy; route the two available real collections to real APIs and label the remaining five MOCK. Expose the NID-first MOCK journey explicitly without mixing persisted and fictional records.
- Add one end-to-end visual/functional integration acceptance across real Process → real Request → Decider, and regression tests at desktop and narrow viewport sizes.

## Capabilities
### New Capabilities
- `ui-integration-baseline`: navigation, shared shell, context-specific actor control, truthful real/mock composition and regression boundaries.

### Modified Capabilities
None in this planning change. Existing backend and UI requirements remain in force.

## Impact
React Router/layout/components, local-demo selector presentation, shared CSS, existing React pages, documentation and Playwright. **No backend/SQLite changes, new catalog APIs, authorization grants, domain/entity lifecycle changes, full CRUD, redesign in Penpot, dependencies or generic component framework.**

## Dependencies
- `main`: accepted UI/IA Baseline v0.2 and NID-first mock workflow.
- Draft PR #44: persistent BusinessProcess.
- Draft PR #45: one-command local-demo supervisor and proxy actor selector.
- This change is a stacked **Draft PR based on PR #45 HEAD**, not on `main`. Do not merge or retarget until #44 and #45 are accepted in sequence.

## Exit condition
Manual owner acceptance of one application shell with an unambiguous root URL, one real actor selection, real Process and Request interactions, and preserved mocked journey. After acceptance, merge #44 → #45 → UI integration in sequence, then start ConnectivityNeed as a new vertical slice from the resulting `main`.
