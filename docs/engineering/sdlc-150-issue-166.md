# Issue #166 — Historical Langfuse corpus inventory

**Result:** complete bounded inventory for selecting a later diagnostic question. This report contains aggregate counts and coverage only; no substantive content analysis, RCA, effect assessment, or automation was performed.

**Repository baseline:** main@bc17c3c5207f41ed52819aa06895898247fca2c9.
**Issue:** [#166](https://github.com/lehater/napms-2/issues/166), native child of [#150](https://github.com/lehater/napms-2/issues/150).
**Task trace metadata:** runId 0a62c4aec9aa4ac7961a4dfbd0d7b39f; initial checkout SHA ddd11d9a2cdba12e089e6b4bc279f39700a133be. Session/trace IDs were not available.

## Snapshot and method

- One Langfuse project associated with the existing authorized local credential. Its project ID and host address are omitted.
- Snapshot window: 1970-01-01T00:00:00Z <= observation.startTime < 2026-11-21T15:49:20Z (UTC). The fixed upper bound is exclusive for Observations API v2.
- NAPMS attribution requires the exact metadata value repository=lehater/napms-2. Attempts are distinct (repository, issueId, runId) tuples; sourceSha is version metadata, not attempt identity. Absent or invalid repository attribution remains unknown; other repository values are counted separately.
- GET /api/public/v2/observations used core,basic,time,metadata,usage,metrics fields, 1,000 rows per page, following every returned cursor. GET /api/public/v2/metrics supplied aggregate checks. No I/O, prompt, model-parameter, or trace-context field group was requested. Metadata and status text stayed in the local processor; only canonical identifiers, enumerated fields, and aggregates were retained.
- A complete second observation pass checked row/session coverage. A separate Metrics API aggregate checked observation volume/types/root rows and model usage. Duplicate observation IDs were removed; none were found.
- Total was 19 read-only GET requests, including the initial health check, two full observation passes, project-scope checks, aggregate queries, and two lookups for this attempt’s own usage. No Langfuse write request, installation, new credential, infrastructure change, or export file was used.
- Wall-clock elapsed time from scope lock at 15:49:20Z through the final inventory read-back at 15:58:15Z was 8m55s. This is elapsed operator time, not a model-cost estimate.

The local health check returned OK, version 4.82.0. The owner-authorized GET route was used as a manual read-only operation; this does not establish that the key is technically restricted to a Viewer role. The official documentation states that some older SDK/OTEL records can be delayed by up to 15 minutes, so the snapshot may omit recent arrivals.

## Counts

| Measure | Configured project | Exact NAPMS repository attribution |
| --- | ---: | ---: |
| Observations | 4,813 | 3,355 |
| Distinct trace IDs | 105 | 54 |
| Distinct nonempty session IDs | 40 | 18 |
| Rows with a nonempty session ID | 4,813 / 4,813 | 3,355 / 3,355 |
| Repository attribution | 3,355 NAPMS; 0 explicit other repository; 1,458 unknown | 100% of included rows carry exact repository metadata |
| Complete repository + issueId + runId rows | — | 3,355 / 3,355 |
| Unique attempts (repository, issueId, runId) | — | 12 |
| Unique issue IDs | — | 12 |
| Attempts with a valid source SHA | — | 12 / 12 |

Type counts:

- Project: GENERATION 2,406; TOOL 2,288; AGENT 119.
- Exact NAPMS attribution: GENERATION 1,677; TOOL 1,613; AGENT 65.

Level counts:

- Project: DEFAULT 4,811; WARNING 2.
- Exact NAPMS attribution: DEFAULT 3,354; WARNING 1.

The level distribution is inventory metadata only and does not characterize task quality or establish absence of defects.

The Metrics API returned 4,813 observations, matching the fully paginated row count. It returned 119 logical-root rows, while the observation rows contain 105 distinct trace IDs. The distinct trace-ID count is used for traces; the logical-root count is not treated as a trace count.

## Coverage and limitations

| Non-null field coverage | Project | Exact NAPMS |
| --- | ---: | ---: |
| endTime | 4,813 / 4,813 | 3,355 / 3,355 |
| level | 4,813 / 4,813 | 3,355 / 3,355 |
| totalUsage | 4,813 / 4,813 | 3,355 / 3,355 |
| totalCost | 1,678 / 4,813 | 1,043 / 3,355 |
| latency | 2,854 / 4,813 | 1,947 / 3,355 |
| version field | 0 / 4,813 | 0 / 3,355 |

The project-level Metrics API model breakdown was: unspecified 2,407 observations; gpt-6-luna 1,580; gpt-6.2-sol 614; gpt-6.2-astra 110; gpt-6-sol 65; gpt-6.1-sol 37. This is project-wide; no model-to-NAPMS-attempt attribution is claimed. Harness version is unavailable in the returned version field. Recorded Langfuse cost coverage is reported as field availability only, not provider billing or subscription expense.

The observed start-time envelope was 2026-11-18T20:56:11.761Z through 2026-11-21T15:30:48.885Z. Pagination exhausted after five pages in each pass; no duplicate IDs or project-ID mismatches were observed. The current attempt lookup by exact repository/issueId/runId returned zero observations at query time, so analyst usage/cost in Langfuse is unavailable; no zero-cost claim is made. Actual API reads and elapsed wall-clock time are recorded above.

The 1,458 rows without repository metadata may include NAPMS records, but their source cannot be established from this inventory. The fixed snapshot may also miss delayed arrivals. No raw rows, payload, arbitrary metadata, host address, or credentials were included in this report.

## Suggested next decision

For a separate, owner-approved diagnostic task, one useful criterion is whether an executor starts or continues waiting after the matching Verify run for the unchanged PR head is already terminal. Select at most the first five chronologically eligible attempts with complete repository/issueId/runId attribution and independently verifiable GitHub PR-head/Verify evidence; freeze that set before reading telemetry. Incomplete correlation is unknown, not a negative result. This report does not perform that analysis or establish an effect for #144–#146. The criterion follows the earlier bounded proposal recorded in [#150](https://github.com/lehater/napms-2/issues/150#issuecomment-7050084308).

## References

- [Langfuse Observations API v2](https://langfuse.com/docs/api-and-data-platform/features/public-api)
- [Langfuse Metrics API v2](https://langfuse.com/docs/metrics/features/metrics-api)
- Accepted NAPMS data handling and lifecycle contracts: Issues #152–#156 and the execution contract in Issue #166.
