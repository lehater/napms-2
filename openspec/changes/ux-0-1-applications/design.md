# Design

## Context

See proposal.md. The current generic table flattens three ACC kinds; all links and display fields already exist. Data nature repeats long captions in every table row. State currently mixes Current, Read-only and Immutable.

## Goals / Non-Goals

**Goals:** Expose existing profile → interaction → revision context and reduce visual noise.

**Non-Goals:** New identities, persistent relationships, catalogue editing, status lifecycle, backend/API/credential changes or a generic view engine.

## Decisions

- Filter the Applications list to Application. Derive child interaction/revision panels and parent breadcrumbs from existing fixture links. Show component role names from interaction participants; no new Component CRUD or entity identities are needed. Keep the generic related-object region and all original links intact.
- Make display state optional. Remove Read-only/Immutable from state, explain UI mode globally and immutable parameters by revision kind. Label existing Current as actuality and genuine state separately; do not add replacement states.
- Use small focused presentation components with existing Tailwind/native controls. Put nature in a collapsible detail block, not repeated row captions. A darkened sidebar and concise labels preserve eight sections; narrow navigation uses a compact grid.
- Browser checks cover the hierarchy, parent breadcrumbs, direct URLs, Back/reload, property distinctions, narrow layout and zero fetch/XHR; the real request suite remains unchanged.

## Risks / Trade-offs

- Hidden parent context from direct URL → derive breadcrumbs from existing graph.
- Nature detail overlooked → clearly labeled disclosure available on every card.
- Research roles mistaken for installations → explicitly describe reusable communication profile and participant roles.

## UX-0.2 decisions

UI Baseline v0.1 reference.html supersedes the Application 1200px constraint. Use full-height fluid workspace, dark 264px sidebar with pointer/keyboard range 200–360px, and persist only its numeric width preference. Narrow screens use grouped navigation above content; resizing is desktop-only.

Resources list only the two existing Resource objects. Columns use name, scope, current address from history, site history and responsibility history. Search and scope/site filters operate on fixture values; page size 1 or 2 makes pagination verifiable without adding rows. URL query parameters preserve list selection across detail and breadcrumb return.

Resource detail uses URL-addressable Overview, Endpoints, Deployments and History navigation. Endpoints are structural children, Deployments independent related placements, History contains existing address/site/responsibility interval facts only, not an event log. Nested collections share the same native table/search/filter/pagination presentation. Missing history and single-endpoint fixture limits are explicit. Preserve all fixture links on their applicable tabs and all original direct object URLs.
