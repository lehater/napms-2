# Proposal

## Why

At accepted `main@4864706e54535e947b6f8b4e4ed09e4c6138b66a` (PR #51), a user can persist a Process and ConnectivityNeed, but REAL request creation still requires four UUID inputs. There is no authorized Revision/Deployment selection API, and the Request response cannot reconstruct its Need and exact subject after reload.

## What Changes

- Add one Process/Need-scoped, paginated read endpoint for exact Revision and compatible source/destination Deployment selection, using existing SQLite data.
- Compose and confirm a request within the selected Need on the existing Process `Потребности` tab; submit the unchanged four-field body to `POST /access-requests` and open the existing Request Detail.
- Add explicit Resource-scoped `access.options.read` disclosure grants, independent of business read, source-only `access.request`, `access.decide`, and `policy.export`.
- **BREAKING (local-demo authorization/error contract):** direct POST must also satisfy business-context and selected Resource disclosure checks, closing discovery bypasses. Missing/unauthorized source references receive the same 403. Hidden and missing remaining references receive the same safe 404. No destination **request** grant is required; disclosure is a separate prerequisite, never permission for network access.
- Add persisted `connectivityNeedId` and exact `subject` to the existing Request DTO, including collection/POST/detail representations. Historical author and independent decider visibility remain intact.
- Replace the mandatory manual UUID creation UI with the Need-context route; keep `/access-requests/new` as a navigation entry to REAL processes.
- Specify real browser acceptance through backend restart and existing ALLOWED/PolicyRule behavior, plus negative security and atomicity checks.

## Capabilities

### New Capabilities

None. Selection and disclosure belong to the existing access-request capability; Need persistence remains the accepted PR #51 contract.

### Modified Capabilities

- `access-requests`: scoped options, explicit disclosure gates, transactional revalidation, safe reference errors, reconstructible persisted request facts.
- `access-requests-web-ui`: Need-context selection/confirmation without UUID entry, persisted composition display and a full REAL journey.

## Impact

Future implementation touches `src/napms/{use_cases,http,dev}.py`, existing domain validation where needed, `web/src/{Needs,App,api}.tsx`/`.ts`, and focused existing pytest/Playwright fixtures and tests. Reuse `Service`, `_compatible`, `validate_subject`, grants, typed client, Shell, actor switch and decision use case. No dependency, QueryService, table, schema-version or migration addition.

This PR contains planning artifacts only. Full catalog CRUD, new IAM, Need lifecycle, display-name fabrication, Rule Detail/export UI, network application, general Visibility UX and redesign are excluded. Issue #37/PR #38 are research context, not normative requirements. Owner/coordinator review of this proposed contract precedes a separately authorized implementation; no merge is authorized here.
