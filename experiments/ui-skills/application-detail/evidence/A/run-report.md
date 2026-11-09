# Arm A actual run

Source: `642a6f8f5d7e903641068887bd5a32ae6ea466d3`; branch `exp/ui-application-A`; worktree `/tmp/napms-ui-A`.
Observed start timestamp (after input review): 2026-11-08T23:58:51Z. Checks completed: 2026-11-09T00:00:55Z. Screenshots completed shortly afterward.
Installed CLI: `codex-cli 0.167.0`. Execution was a fresh delegated Codex session, not a spawned CLI run. Actual session model/effort are not exposed to this agent; inherited identically by parent orchestration. No inferred model/config or cost claims.

Instructions used: root conversation AGENTS.md; worktree AGENTS.md; experiment README identical task and arm A restriction; docs/engineering/sdlc-improvement-roadmap.md. No additional UI skills loaded. No OpenSpec changes, so no spec-management skill applied. Domain, semantic contract, v0.2 baseline, v0.1 HTML reference, presentation sources and browser test inputs inspected. No B edits or B skills inspected.

The patch labels source and receiving Component roles directly around the direction arrow, groups the exact revision and traffic below that communication, and adds keyboard reachable links to Interaction and InteractionRevision. Component rows now explain each role's participation using existing fixture fields. Profile properties use reader-facing labels. CSS stays scoped to the Application detail, preserves incumbent panels and tabs, and wraps narrow tables instead of forcing page overflow. No dependencies or fixture values changed.

## Actual commands and outcomes

- `npm ci`: exit 1 inside sandbox (esbuild subprocess EPERM); retained npm-ci.log. Retried with normal command escalation: exit 0, npm-ci-escalated.log.
- `npm run build`: first premature run after failed install failed missing node types; final installed run exit 0, build.log.
- `npm run test:semantic`: final exit 0, semantic.log.
- `NAPMS_PYTHON=/home/alex/projects/napms-2/.venv/bin/python LD_LIBRARY_PATH=/tmp/napms-browser-libs/usr/lib/x86_64-linux-gnu npm run test:e2e`: sandbox server start failed exit 1, e2e.log. Escalated retry exit 0: 26 passed, e2e-escalated.log.
- `git diff --check`: exit 0. Diff: 2 presentation files, 29 insertions, 6 deletions. Patch/stat files retained.
- `npm run dev -- --port 5174`: capture server.
- Shared `evidence/audit/capture.mjs A 5174` with same browser setup as baseline: exit 0. Nine screenshots, measurements.json copied here from audit/A.

All nine document widths equal viewport widths. Mobile tabs retain their existing 9px internal scroll, keyboard reachable; hidden sr-only captions also report internal overflow (not visible clipping). Desktop keyboard measurements verify tabs and direct revision link receive visible 2px focus outlines. Mobile communications table wraps densely, including Current and long words; screenshot records this readability limitation. No claim of overall merit versus arm B is made by this implementer.

Audit performed separately by parent; patch frozen after validation.
