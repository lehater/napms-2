# REAL UI conformance contract

This is the required structural contract for REAL screens before owner handoff.

- The REAL shell remains the existing `web/src/Frame.tsx` and `web/src/Shell.tsx`; research routes remain isolated.
- REAL entity collections use the shared `CollectionView` and `EntityTable` patterns. Embedded collections, including Process Needs, use `EntityTable`.
- REAL entity details use the shared `DetailView` pattern. A navigable relation graph connects Sidebar → Collection → Detail → real related entity or the existing return path.
- Reuse the established `ux-*` classes from `web/src/baseline.css` and the existing `Button` and `Badge` components. Keep domain-specific columns, tabs, and links in their screen callers.
- Do not add search or filters when the REAL API does not support them. Do not import MOCK fixtures or prototype components into REAL screens.

This contract is mandatory before owner handoff. A deviation must be justified in the PR report.
