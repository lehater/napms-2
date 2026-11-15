# REAL UI conformance contract

This is the required structural contract for REAL screens before owner handoff.

- The REAL shell remains the existing `web/src/Frame.tsx` and `web/src/Shell.tsx`; research routes remain isolated.
- REAL entity collections use the shared `CollectionView` and `EntityTable` patterns. Embedded collections, including Process Needs, use `EntityTable`.
- REAL entity details use the shared `DetailView` pattern. A navigable relation graph connects Sidebar → Collection → Detail → real related entity or the existing return path.
- Reuse the established `ux-*` classes from `web/src/baseline.css` and the existing `Button` and `Badge` components. Keep domain-specific columns, tabs, and links in their screen callers.
- Do not add search or filters when the REAL API does not support them. Do not import MOCK fixtures or prototype components into REAL screens.

## Screen composition: default and exceptions

- Default object-browsing path: a user-facing Sidebar collection → a `CollectionView` with one row per entity identity → a URL-addressable `DetailView` with breadcrumbs and a meaningful return path → Overview plus applicable domain tabs. A subordinate entity may have its own Detail without a separate Sidebar collection.
- Before implementing a screen, identify its list columns, essential Overview facts, applicable tabs, relation types and the REAL data source for each. Navigation groups and entries follow `docs/ux/real-navigation.md`; historical v0.2 prototype navigation is not the current REAL menu.
- Overview owns identity, purpose, primary properties, and concise summaries or links to related records. Full subordinate/related collections, revisions, history and provenance belong on appropriate domain tabs, using `EntityTable` when tabular. Distinguish containment, independent relations and historical facts; navigation links do not imply new persisted relationships.
- Show a tab only when the type of content is meaningful for this entity and supported by the REAL UI/API. An empty valid collection can show an honest empty state; do not create placeholder tabs, rows, filters, pagination, or actions.
- Preserve navigable related-object links, direct tab URLs and useful list context (including filters/page when supported); keep Overview readable on desktop rather than stacking every relationship below its properties.
- Use a specialized workspace or interaction instead of Collection → Detail when the **user task** warrants it (for example, creation flow, comparison, graph exploration or reconciliation). Briefly justify the alternative and its navigation/data behavior in the PR; reuse the existing Shell and primitives wherever suitable.

## Reuse lookup for REAL screens

Before writing a new REAL screen structure, find the existing shared component and inspect one working caller. Keep domain-specific content in the caller. Native semantic HTML for domain forms and content is valid; do not introduce a wrapper solely to avoid HTML.

| UI task | Existing component | Working caller |
| --- | --- | --- |
| Entity list, actions, pagination | `web/src/components/real/CollectionView.tsx` | `web/src/BusinessProcesses.tsx` (`ProcessList`) |
| Entity detail, breadcrumbs, tabs | `web/src/components/real/DetailView.tsx` | `web/src/PolicyRule.tsx` (`RuleDetail`) |
| Related or embedded entity rows | `web/src/components/real/EntityTable.tsx` | `web/src/Needs.tsx` |
| Error with optional retry | `web/src/components/ErrorNotice.tsx` | `web/src/Needs.tsx` |
| Actions and status labels | `web/src/components/ui/button.tsx`, `web/src/components/ui/badge.tsx` | `web/src/App.tsx` |

## Component selection

1. Define the required behavior, domain semantics, interaction states, and accessibility before choosing a component.
2. Search existing REAL and domain components, `web/src/components/ui/`, and their working callers. Reuse when the behavior and contract fit; prefer composition over copying or adding a wrapper.
3. If the capability is missing, choose the simplest suitable foundation: semantic native HTML for ordinary controls; an installed UI primitive or a suitable component from the configured shadcn/ui catalog for richer interaction. A shadcn/ui catalog entry is not installed until added to this project.
4. Consider a maintained external library only when existing options are insufficient and the saved implementation/maintenance cost justifies a dependency. Otherwise implement a feature-local component with domain-specific behavior.
5. Promote a local component to shared when a stable, independently useful contract is demonstrated, including repeat use or substantial isolated complexity. Appearance alone is not a reuse contract; do not generalize for hypothetical consumers.
6. Verify actual behavior on REAL data, keyboard/accessibility, empty/loading/error states, established styling, and a desktop render. Add a working example to this lookup when a new shared component becomes canonical.

This contract is mandatory before owner handoff. A deviation must be justified in the PR report.
