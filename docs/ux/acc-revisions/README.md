# ACC revision UX evidence

Real Playwright renders from `web/e2e/catalog-journey.spec.ts` (temporary FastAPI + SQLite). Each screen was captured at 1920×1080 and 1440×900.

| Screen | 1920×1080 | 1440×900 |
| --- | --- | --- |
| Create Interaction + Revision #1 draft | [PNG](evidence/interaction-create-1920.png) | [PNG](evidence/interaction-create-1440.png) |
| Published revision list | [PNG](evidence/revision-list-1920.png) | [PNG](evidence/revision-list-1440.png) |
| Revision Detail / TrafficClauses | [PNG](evidence/revision-detail-1920.png) | [PNG](evidence/revision-detail-1440.png) |
| New revision draft | [PNG](evidence/revision-draft-1920.png) | [PNG](evidence/revision-draft-1440.png) |

The journey also checks breadcrumbs, direct Revision URL reload, missing Revision handling, publication error messaging, draft cancellation without a new snapshot, read-only published detail, exact multi-clause request summary, and preservation of the original revision and Rule reference after publishing a new snapshot.

REAL screens reuse the shared `Frame`/`Shell`, `DetailView`, `EntityTable`, and `Button` components. The captures were visually inspected at both desktop sizes.

Owner visual acceptance remains pending. Historical-revision selection for new requests remains a separate domain decision recorded in Issue #75; this UI change preserves current behavior.
