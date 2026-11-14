# Tasks

## 1. Application Catalog API

- [x] 1.1 Add strict Application, Component, and Interaction/revision create, list, and detail DTOs and transactional use cases; verify names, same-Application direction, protocol, ports, ordering, and page bounds with focused backend tests.
- [x] 1.2 Add catalog read/create authorization using the separate `catalog.read` and `catalog.create` grants, and seed `catalog.create` for the local-demo requester; verify unauthorized reads/mutations are rejected and shared-read mode does not grant mutation, submit, or decide authority.
- [x] 1.3 Expose the Application catalog routes and verify newly created Interactions appear in existing business-process need-options without manual IDs.

## 2. Deployment Catalog API

- [x] 2.1 Add bounded ComponentDeployment and read-only Resource selector/detail use cases and routes; verify unknown relations and unauthorized creation are rejected and existing demo Resources remain readable.
- [x] 2.2 Verify new deployments appear in compatible request options, while mismatched Components, revisions, and deployments remain rejected without creating requests or PolicyRules.

## 3. REAL Application Catalog UI

- [x] 3.1 Add `/applications` collection, create flow, and Application detail with Components and Interactions tabs, using the shared REAL collection/detail/table components; verify TypeScript typecheck and direct route navigation.
- [x] 3.2 Add Component and directed Interaction/revision creation within Application detail, with real API calls and related links; verify created records can be selected in the existing BusinessProcess Need flow.

## 4. REAL Deployment Catalog UI

- [x] 4.1 Add `/deployments` collection, creation flow using existing Components and read-only Resources, and Deployment detail with links to Component, Application, and Resource; verify TypeScript typecheck and direct route navigation.
- [x] 4.2 Add the minimal read-only Resource detail relation target and five-entry Sidebar contract (Business Processes → Applications → Deployments → Access Requests → Policy Rules); verify breadcrumbs and all relation links resolve to REAL routes.

## 5. End-to-End Acceptance

- [x] 5.1 Add and run one focused Playwright scenario on a fresh initialized SQLite database: create Order/Sender/Receiver, TCP/443 Interaction, and deployments on two seeded Resources; create a BusinessProcess and Need; submit as requester; decide ALLOWED as decider; verify one ACTIVE PolicyRule links the created deployment/revision and decision, existing demo objects remain visible, and incompatible links fail.
- [x] 5.2 Inspect an actual desktop render of the new REAL screens against `docs/ux/real-ui-conformance.md`, and run `openspec validate --all --strict` on the final files; record the shared components and any remaining limitations for handoff.

## Review follow-up

- [x] 1.4 Allow a directed Interaction whose source and destination are the same logical Component; verify UDP/123 and separate deployment identities remain valid through request composition.
- [x] 3.3 Scope Component, Interaction, Deployment, and Resource detail results/errors to the current route ID and ignore stale asynchronous responses; verify A → B → unknown ID shows B then 404.
- [x] 3.4 Paginate Interactions using bounded `limit`/`offset` and preserve the Application tab; verify 21 rows, next page, and return to the first page.
- [x] 5.3 Run a focused smoke through `napms-dev run --profile local-demo`: requester creates a self-interaction and two placements, submits; decider allows; requester and exporter see the one ACTIVE PolicyRule.
