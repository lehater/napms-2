# Proposal

## Why

At accepted `main@4864706e54535e947b6f8b4e4ed09e4c6138b66a` (PR #51), a user can persist a Process and ConnectivityNeed, but REAL request creation still requires four UUID inputs. There is no authorized Revision/Deployment selection API, and the Request response cannot reconstruct its Need and exact subject after reload. **Scope extension after PR #52 was accepted:** the real UI also stops at an ALLOWED Rule ID even though Rule Detail and selected-rule JSON/CSV export already exist in FastAPI; finish the user journey by exposing those existing endpoints through a protected React route and actual file download.

## What Changes

- Add one Process/Need-scoped, paginated read endpoint for exact Revision and compatible source/destination Deployment selection, using existing SQLite data.
- Compose and confirm a request within the selected Need on the existing Process `Потребности` tab; submit the unchanged four-field body to `POST /access-requests` and open the existing Request Detail.
- Add explicit Resource-scoped `access.options.read` disclosure grants, independent of business read, source-only `access.request`, `access.decide`, and `policy.export`.
- Preserve direct POST admission: trusted server actor and effective source Resource `access.request`, without additional `business.*`, `access.options.read` or destination grants. Revalidate exact references transactionally. GET disclosure gates do not authorize or constrain submission of known UUIDs. Use neutral reference errors without protected metadata and document the residual object-existence risk for local demo; this does not claim complete non-disclosure.
- Add persisted `connectivityNeedId` and exact `subject` to the existing Request DTO, including collection/POST/detail representations. Historical author and independent decider visibility remain intact.
- Replace the mandatory manual UUID creation UI with the Need-context route; keep `/access-requests/new` as a navigation entry to REAL processes.
- Provide an authorized REAL PolicyRule Detail and actual selected-rule JSON/CSV downloads through existing `GET /policy-rules/{ruleId}` and `GET /policy/export?ruleId=...&format=...`. Handoff from ALLOWED Request to an Exporter-capable route must preserve the Rule ID without granting the Decider export rights.
- Specify real browser acceptance through backend restart, independent ALLOWED decision, Rule inspection and successful downloaded JSON/CSV bytes, plus negative security and atomicity checks.

- Owner-approved acceptance cleanup: show only live Process/Request collections in main navigation; isolate historical `/prototype/*` navigation/state, preserve resizable geometry, and remove obsolete main UI links/labels.

## Capabilities

### New Capabilities

- `policy-export-web-ui`: authenticated selected-Rule inspection and JSON/CSV file download using already-accepted policy-export backend contracts. This is a bounded UI capability, not a new export engine or an all-Rules policy export.

### Modified Capabilities

- `access-requests`: scoped options, explicit disclosure gates, transactional revalidation, safe reference errors, reconstructible persisted request facts.
- `access-requests-web-ui`: Need-context selection/confirmation without UUID entry, persisted composition display and a full REAL journey.

## Impact

Future implementation touches `src/napms/{use_cases,http,dev}.py`, existing domain validation where needed, `web/src/{Needs,App,api}.tsx`/`.ts`, React routing/selected Rule UI, and focused existing pytest/Playwright fixtures and tests. Reuse `Service`, `_compatible`, `validate_subject`, grants, typed client, Shell, actor switch, decision and **existing Rule/export** use cases. No new export backend endpoint, dependency, QueryService, table, schema-version or migration addition.

This OpenSpec change contains planning artifacts only. Full catalog CRUD, new IAM, Need lifecycle, display-name fabrication, **aggregate/all-Rules export**, network application, general Visibility UX and redesign are excluded. Issue #37/PR #38 are research context, not normative requirements. Owner/coordinator review of this proposed contract precedes a separately authorized implementation; no merge is authorized here.
