# ci-test-selection Specification

## Purpose

Select only justified regression groups for a PR while preserving critical cross-layer contracts and reliable merge protection.

## ADDED Requirements

### Requirement: Complete merge-candidate change scope
The system SHALL derive impacted paths from the cumulative PR merge-candidate diff, retaining change statuses and both old/new paths for renames. The selection MUST correspond to the commit SHA being verified.

#### Scenario: Multiple commits in one PR
- **WHEN** a PR changes Python in one commit and Web in a subsequent commit
- **THEN** the selector includes both sets of affected contracts instead of using only the latest commit

#### Scenario: Incomplete or unsafe diff
- **WHEN** the merge base is missing, diff cannot be parsed, a path is unknown, or a file is renamed or deleted without known impact
- **THEN** the plan is marked FULL with an explicit reason

### Requirement: Explicit contract dependency mapping
The system SHALL maintain one reviewable versioned mapping from changed source/configuration paths to affected contracts and existing test groups. Impacts across areas SHALL be combined by set union; a high-risk or uncertain change SHALL require FULL.

#### Scenario: Shared API implementation changes
- **WHEN** `src/napms/http.py` or `src/napms/storage.py` changes
- **THEN** the selector requires FULL Python and browser regression regardless of whether `web/` changed

#### Scenario: Independent groups
- **WHEN** two independently mapped UI areas change in the same PR
- **THEN** the plan includes both groups and any mandatory shared checks, with no group lost by filtering

#### Scenario: Unsupported input
- **WHEN** changed paths do not match a maintained rule or a referenced test group is absent
- **THEN** the selector produces FULL rather than an empty or partial selection

### Requirement: Test selection is verifiable
For every run, the selector SHALL produce a deterministic plan identifying the candidate SHA, selected and excluded groups, reasons, and exact executable targets. All selected targets SHALL exist and collect at least one test. The FULL profile SHALL remain available independently of selection.

#### Scenario: Known isolated change
- **WHEN** only the OpenCode role configuration changes and its mapping is enabled
- **THEN** the plan explicitly includes the OpenCode contract tests and documents why unrelated groups are excluded

#### Scenario: No test cases selected
- **WHEN** a selected pytest or Playwright group contains no discovered test cases
- **THEN** verification fails or runs FULL; it SHALL NOT report that an unexecuted required group passed

#### Scenario: Reproducible plan
- **WHEN** the same candidate SHA and mapping revision are evaluated twice
- **THEN** the resulting selected groups, target lists and reasons are identical

### Requirement: Merge status reflects executed verification
The system SHALL distinguish an approved intentional omission from an accidentally skipped, failed or cancelled job. A merge gate SHALL pass only if the approved plan was fully executed and every required outcome succeeded. Existing required check names and Draft behavior SHALL remain unchanged until a separate, verified GitHub Ruleset migration.

#### Scenario: Unexecuted required checks
- **WHEN** a required group is omitted because a job was skipped, failed or cancelled without an approved plan entry
- **THEN** the merge gate fails

#### Scenario: Docs-only plan
- **WHEN** the diff contains only approved documentary or OpenSpec text changes
- **THEN** documentation and semantic/strict validation are required, and the report explicitly records why application/browser tests were not required

#### Scenario: Changed merge candidate
- **WHEN** `main` advances after a successful selection and the PR merge candidate changes
- **THEN** selection and verification are repeated for the current candidate before merge approval

### Requirement: Roll out selection by evidence
The system SHALL support shadow mode in which a selection plan is computed and reported while the current FULL suite remains authoritative. Selective execution SHALL be activated only for mappings that have passed unit-level edge cases and cross-layer regression comparisons.

#### Scenario: Initial shadow rollout
- **WHEN** the selector is introduced for the first time
- **THEN** its proposed subset is reported but all current required FULL checks continue to execute

#### Scenario: Incorrect dependency assumption
- **WHEN** an observed regression or an unmapped change reveals that a needed test was excluded
- **THEN** the affected rule is disabled or broadened to FULL before further selective activation

### Requirement: Security of path processing
The selector SHALL treat PR data as untrusted input and SHALL NOT interpolate changed filenames into executable shell command strings. It SHALL validate path normalization, supported operations and group identifiers before execution.

#### Scenario: Unusual or malicious filename
- **WHEN** a diff includes spaces, quotes, non-ASCII characters or shell metacharacters
- **THEN** the selector treats the path as data and either maps it correctly or chooses FULL without executing it as code
