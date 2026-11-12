# Design — unify the existing UI, do not rebuild it

## Observed state at PR #45 HEAD
- `web/src/main.tsx`: `/business-processes/*` uses BusinessProcesses, `/prototype/*` uses Prototype, wildcard routes to legacy `App.tsx` including `/`.
- `web/src/prototype/Shell.tsx`: accepted full-width Sidebar, 200–360 px resize, three groups/seven links, used by Prototype and real BusinessProcesses; separate REAL API links and simulation role UI.
- `web/src/App.tsx`: independent centered max-width request app, separate sidebar/header and `Demo mode`, even under the global local-demo `DemoProfile`.
- `web/src/DemoProfile.tsx`: shared in-memory real actor, but its control is rendered in a separate yellow strip above each page rather than the common Shell topbar.
- Existing React `api.ts` and proxy can read/create Process and list/create/decide Requests. No read context for Process→Need, no general-purpose Rule collection API. `/prototype/*` is a fictional, disconnected scenario.
- Accepted source: `docs/research/ui-baseline-v0.2/README.md`, and the NID-first UX Scenario Contract. This change modifies presentation, not semantic data ownership.

## Decision 1 — one mounted Shell, one Sidebar
Use the existing `Shell` visual design as the canonical React app layout. Mount it **once** around route content rather than nesting independent layouts. Keep resizable sidebar bounds, full-width workspace, topbar, breadcrumbs and scroll behavior. Reuse minimal page components for list/detail/tabs/form/alerts instead of introducing a new design system. Preserve the three groups and exactly seven collection entries:
1. Бизнес-контекст: Бизнес-процессы → `/business-processes` (**REAL**); Потребности в коммуникациях → `/prototype/needs` (**MOCK**).
2. Каталоги: Ресурсы, Профили приложений, Развёрнутые компоненты → their existing `/prototype/*` collection paths (**MOCK**).
3. Управление доступом: Заявки на доступ → `/access-requests` (**REAL**); Правила политики → `/prototype/policy` (**MOCK**).

Show REAL/MOCK status with unobtrusive text per entry, not a duplicate navigation group. The existing real Request routes must not be hidden behind another REAL API sidebar. Preserve the old `/prototype/requests` mock collection and historical scenarios via **explicit** “MOCK Simulation” entry and contextual links, not as an alternative real dataset. Do not create a synthetic mixed list or infer a Rule collection from the export endpoint.

## Decision 2 — routing and continuity
`/` redirects to `/business-processes` as the first real business-context collection. Do not use catch-all fallback to Requests: unknown application paths display Not Found with a link to the root. Preserve direct routes `/business-processes/new`, `/business-processes/:processId`, `/access-requests/new`, `/access-requests/:requestId` and the complete existing `/prototype/*` route set, including mock Need→Request→Rule deep links. Breadcrumbs and “Back to list” actions must preserve meaningful collection state; do not change existing mock relation routes or IDs.

The acceptance entrypoint is `http://127.0.0.1:5173/`. The one-command supervisor may print this root URL after the integration. No server route changes are necessary: preserve Vite HTML fallback and API proxy separation.

## Decision 3 — real actor and mock role are different contexts
The shared local-demo actor is `anonymous | requester | decider | exporter`, held only in memory by `DemoProfile`, with existing server-only proxy bearer injection. Move its UI into the shared Shell topbar (the provider stays above all routes) and show exactly one real actor selector while a REAL route is active. Remove the redundant `App.tsx` real `Demo mode` selector in local-demo; a decider-selected actor may be offered the decision UI, but the backend still authorizes or denies every operation. No front-end role selection or visibility implies a grant.

On explicitly MOCK routes, retain the independent MOCK Requester/Decider simulation role, prominently marked MOCK; the real actor selection must not be confused with or change that role. Show one context-appropriate control per view, not simultaneously active indistinguishable role selectors.

Switching real actor or clearing a manual credential must synchronously unmount or clear protected Request/Process data, forms and pending decision confirmation. In-flight responses from the previous actor must not appear after a switch. Full refresh resets local-demo actor, but SQLite facts persist. Outside explicit local-demo preserve the existing manual bearer workflow for real Request and Process without silent actor impersonation or persistence of tokens. No token handling or security policy changes in FastAPI/Node proxy.

## Decision 4 — structure before cosmetic styling
Use accepted Collection → Object Detail pattern. All real screens share the Shell's header, spacing, breadcrumb, panel width and readable alignment.

**BusinessProcess:** collection with one process per row, name/organization and correct server pagination; `Создать` as a primary action. Detail shows Overview with ID/name/description/responsibility and a contextual `Потребности` tab. Because the API has no Needs read, label that tab **“Серверное чтение потребностей ещё не подключено”**; never claim zero Needs or import mock rows. A migrated v1 Process with NULL name reads as `Название не указано`, not a fake inferred name.

**AccessRequest:** list/new/detail/ALLOWED/DENIED use the same Shell and consistent tables, status labels, forms, errors, breadcrumbs. Detail separates Overview and Decision/evidence; show only information available in real AccessRequest/Decision DTO. Do not introduce a Process/Need selection workflow using fake IDs, invent a Rule list, or alter server-side admission/decision endpoints.

**Visual scope:** apply existing baseline controls for buttons, tables, horizontal tab navigation, loading/empty/error states, spacing and typography in the real pages. Use Russian user-facing labels where modifying surfaces, preserve technical identifiers and enum values. Test 1920×1080, 1440×900, 2560×1440 and narrow 390 px for overflow/readability; sidebar remains resizable 200–360 px. No pixel-perfect Penpot reproduction or broad restyling of MOCK pages.

## Decision 5 — test the cross-route contract, not mock-only screenshots
Extend Playwright on the real loopback supervisor (FastAPI + SQLite + Vite, no intercepted APIs) for: root → shared Sidebar → real Process create/list/detail → real Request list/create → real Decider decision → persisted result; one visible real selector; switching actor clears pending actions; independent 401/403; no browser bearer headers; a reload is harmless. Test direct URLs and true backend errors.

Existing Playwright mock NID-first journey, 16-kind semantic contract, seven-collection tests, source-only request authority, policy export, migration and dev-proxy security tests remain passing. Integrate new tests into existing CI rather than establishing another test harness.

## Non-goals and risks
- **P0:** no credential leakage, actor privilege granted by UI, or mock→real API mixing. Keep backend authority and secure proxy unchanged.
- **P1:** do not break legacy `/prototype/*` deep links, already accepted NID-first flow or active real route links.
- **P1:** do not introduce a second navigation source, second Shell, or duplicate local-demo actor selector.
- **P2:** no unsupported Needs “empty relationship” or false Rule UI completeness.
- **P3:** defer typography micro-tuning and visual decoration unless it blocks comprehension.

## Delivery and integration
Implement on this stacked branch, keep it Draft, and verify against its upstream PR #45 base. When owner accepts: merge #44 into `main` first; rebase/retarget #45, verify and merge; then rebase/retarget this PR, verify and merge. No independent merge or commits to `main` from this change.
