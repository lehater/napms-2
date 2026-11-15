# REAL UI conformance contract

This is the required structural contract for REAL screens before owner handoff.

- The REAL shell remains the existing `web/src/Frame.tsx` and `web/src/Shell.tsx`; research routes remain isolated.
- REAL entity collections use the shared `CollectionView` and `EntityTable` patterns. Embedded collections, including Process Needs, use `EntityTable`.
- REAL entity details use the shared `DetailView` pattern. A navigable relation graph connects Sidebar → Collection → Detail → real related entity or the existing return path.
- Reuse the established `ux-*` classes from `web/src/baseline.css` and the existing `Button` and `Badge` components. Keep domain-specific columns, tabs, and links in their screen callers.
- Do not add search or filters when the REAL API does not support them. Do not import MOCK fixtures or prototype components into REAL screens.

## Reuse lookup for REAL screens

Before writing a new REAL screen structure, find the existing shared component and inspect one working caller. Keep domain-specific content in the caller. Native semantic HTML for domain forms and content is valid; do not introduce a wrapper solely to avoid HTML.

| UI task | Existing component | Working caller |
| --- | --- | --- |
| Entity list, actions, pagination | `web/src/components/real/CollectionView.tsx` | `web/src/BusinessProcesses.tsx` (`ProcessList`) |
| Entity detail, breadcrumbs, tabs | `web/src/components/real/DetailView.tsx` | `web/src/PolicyRule.tsx` (`RuleDetail`) |
| Related or embedded entity rows | `web/src/components/real/EntityTable.tsx` | `web/src/Needs.tsx` |
| Error with optional retry | `web/src/components/ErrorNotice.tsx` | `web/src/Needs.tsx` |
| Actions and status labels | `web/src/components/ui/button.tsx`, `web/src/components/ui/badge.tsx` | `web/src/App.tsx` |

Use a new shared abstraction only when existing components cannot express a demonstrated repeated need.

This contract is mandatory before owner handoff. A deviation must be justified in the PR report.
