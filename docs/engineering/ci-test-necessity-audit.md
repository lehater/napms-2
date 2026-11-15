# NAPMS 2.0 — audit of mandatory test necessity and overlap

Date: 2026-11-15. Source revision: `main@563f9f6071d9e39b369602b8048cbcc796e57f64`.
Evidence: [Verify #43701598162](https://github.com/lehater/napms-2/actions/runs/43701598162), [#43700172485](https://github.com/lehater/napms-2/actions/runs/43700172485), [#43641721970](https://github.com/lehater/napms-2/actions/runs/43641721970).

## Scope and decision semantics

- Python: **126 test functions** across 19 test modules; last historical FULL: **277 collected pytest cases plus 4 subtests** due to parameterization. Each function-row below includes its variants. Historical logs do not expose the complete pytest node-ID list.
- Browser: **29 Playwright test declarations** across 5 files. Additional **2 Node proxy unit cases** in `web/dev/local-demo.test.ts`, retained.
- `KEEP` — unique contract with an observable failure mode; remains in FULL.
- `CONDITIONAL (enabled)` — safely bypassed on unrelated PRs, but included when relevant or scope is unknown.
- `CONDITIONAL (planned)` — candidate for impact-based routing; **still runs in every normal FULL** until a path-to-contract matrix is validated.
- `REMOVE` — no distinct blocking contract or an exactly repeated assertion. A shared business process alone does not prove redundant coverage.

## Proven cuts in the first implementation

| Check | Decision | Coverage / reason |
|---|---|---|
| Ruff extended, Ruff formatting, Pyright in automatic CI | REMOVE from `Verify` | All were advisory (`continue-on-error`), not required gates; recent Pyright log: 37 existing errors. They remain available in local `make check-full`. |
| `openspec list --json` | REMOVE | The blocking step remains `openspec validate --all --strict`. |
| Repeated tracked-file and bundled-token scan in `web/e2e/business-processes.spec.ts` worker fixture | REMOVE one copy | Same type of static scan retained in `web/e2e/requests.spec.ts`; BusinessProcess backend log secrecy remains tested. |
| 7 OpenCode role contract test functions | CONDITIONAL (enabled) | Contract reads `opencode.jsonc`, independent of ordinary product changes. Included on contract edits, unknown/unsafe change scope, and manual FULL. |
| `compileall` | KEEP (review later) | Ruff and pytest may overlap syntax coverage, but CPython compilation of unimported files has not been proven redundant. |
| Coverage reporting | KEEP (review later) | Informational rather than gate, but useful for impact-selection safety analysis. |
| `semantic-contract` and navigation Playwright | KEEP both | Static architecture constraint vs actual browser/navigation behavior. |

**Explicit limitation:** No complete Python or Playwright test function has yet been proven logically redundant for deletion. This iteration removes demonstrably unnecessary *steps* and one repeated setup scan, while making the separate OpenCode suite conditional.

## Similar scenarios across layers — distinct responsibilities

| Scenario | Low-level contract | Higher-level contract |
|---|---|---|
| Request → Decision → PolicyRule | Python acceptance, transaction and authorization tests | Browser creation, navigation, persistence and user-facing decisions |
| Empty database / no mocks | Reset/bootstrap tests | UI renders actual empty API data rather than synthetic fallback |
| Current-policy JSON and CSV | API projections and snapshot consistency | Download buttons, filenames, and user-visible file content |
| Launcher, secrets and permissions | CLI/HTTP security and roles | Vite proxy behavior and actor switching in browser |

## Complete Python test function register

Rows classify each named function **and its parametrized cases**; case-level equivalence cannot be inferred from a shared business noun.

### [`tests/test_acceptance.py`](../../tests/test_acceptance.py) — Decision and policy acceptance, CSV/JSON export and states

| Function | Decision | Basis |
|---|---|---|
| `test_ac01_ready_and_csv` | KEEP | Independent contract (retained). |
| `test_ac02_missing_address` | KEEP | Independent contract (retained). |
| `test_ac03_denied` | KEEP | Independent contract (retained). |
| `test_ac04_repeated_allow_and_later_deny` | KEEP | Independent contract (retained). |
| `test_ac05_source_only` | KEEP | Independent contract (retained). |
| `test_ac06_export_scope` | KEEP | Independent contract (retained). |
| `test_ac07_current_ip_identity` | KEEP | Independent contract (retained). |
| `test_ac08_inactive_not_reactivated` | KEEP | Independent contract (retained). |

### [`tests/test_application_catalog.py`](../../tests/test_application_catalog.py) — Catalog, ownership, self-interaction and grants

| Function | Decision | Basis |
|---|---|---|
| `test_application_component_interaction_catalog_and_need_options` | KEEP | Independent contract (retained). |
| `test_application_catalog_allows_self_interaction_and_rejects_invalid_cross_application_links` | KEEP | Independent contract (retained). |
| `test_catalog_grants_are_separate_from_shared_read` | KEEP | Independent contract (retained). |

### [`tests/test_business_processes.py`](../../tests/test_business_processes.py) — BusinessProcess persistence, API, grants and migration

| Function | Decision | Basis |
|---|---|---|
| `test_create_list_get_restart` | KEEP | Independent contract (retained). |
| `test_invalid_input_has_no_writes` | KEEP | Independent contract (retained). |
| `test_invalid_query` | KEEP | Independent contract (retained). |
| `test_paging_and_nulls` | KEEP | Independent contract (retained). |
| `test_authorization_no_disclosure_or_writes` | KEEP | Independent contract (retained). |
| `test_independent_effective_grants` | KEEP | Independent contract (retained). |
| `test_application_nonblank_validation` | KEEP | Independent contract (retained). |
| `test_historical_v1_upgrade` | KEEP | Independent contract (retained). |
| `test_migration_failure_rolls_back_all_columns_and_version` | KEEP | Independent contract (retained). |

### [`tests/test_connectivity_needs.py`](../../tests/test_connectivity_needs.py) — Need identity, concurrency, authorization and migration

| Function | Decision | Basis |
|---|---|---|
| `test_need_persistence_reuse_and_concurrency` | KEEP | Independent contract (retained). |
| `test_protected_need_endpoints` | KEEP | Independent contract (retained). |
| `test_strict_http_and_independent_grants` | KEEP | Independent contract (retained). |
| `test_conflicting_revisions_fail_closed` | KEEP | Independent contract (retained). |
| `test_v2_duplicate_migration_is_atomic` | KEEP | Independent contract (retained). |
| `test_v2_upgrade_preserves_rows_and_unique_constraint` | KEEP | Independent contract (retained). |
| `test_options_paging_revision_identity_and_application_validation` | KEEP | Independent contract (retained). |
| `test_unrelated_integrity_failure_is_not_duplicate` | KEEP | Independent contract (retained). |

### [`tests/test_current_policy.py`](../../tests/test_current_policy.py) — Current-policy read/export, paging, grants, consistent snapshot

| Function | Decision | Basis |
|---|---|---|
| `test_authorized_rules_filter_before_paging_and_current_export` | KEEP | Independent contract (retained). |
| `test_json_csv_parity_incomplete_and_empty` | KEEP | Independent contract (retained). |
| `test_each_resource_grant_is_independent` | KEEP | Independent contract (retained). |
| `test_new_routes_strict_queries` | KEEP | Independent contract (retained). |
| `test_authentication_and_independent_roles` | KEEP | Independent contract (retained). |
| `test_snapshot_pins_all_rules_grants_addresses_and_labels` | KEEP | Independent contract (retained). |
| `test_current_export_includes_rules_beyond_the_first_collection_page` | KEEP | Independent contract (retained). |
| `test_new_policy_operations_share_exact_grant_window_boundaries` | KEEP | Independent contract (retained). |

### [`tests/test_deployment_catalog.py`](../../tests/test_deployment_catalog.py) — Deployments, resources and source/destination relations

| Function | Decision | Basis |
|---|---|---|
| `test_deployment_and_read_only_resource_catalog` | KEEP | Independent contract (retained). |
| `test_new_deployments_compose_request_and_invalid_relations_fail` | KEEP | Independent contract (retained). |

### [`tests/test_dev_reset.py`](../../tests/test_dev_reset.py) — Reset CLI, empty schema and explicit credentials initialization

| Function | Decision | Basis |
|---|---|---|
| `test_reset_demo_keeps_only_schema_and_private_credentials` | CONDITIONAL (planned) | Run for reset, bootstrap, schema or dev lifecycle changes; routing pending. |
| `test_explicit_auth_bootstrap_does_not_create_domain_data` | CONDITIONAL (planned) | Run for reset, bootstrap, schema or dev lifecycle changes; routing pending. |
| `test_resource_grants_require_explicit_command_and_existing_database_resource` | CONDITIONAL (planned) | Run for reset, bootstrap, schema or dev lifecycle changes; routing pending. |
| `test_cli_reset_requires_explicit_yes_and_does_not_modify_db` | CONDITIONAL (planned) | Run for reset, bootstrap, schema or dev lifecycle changes; routing pending. |
| `test_reset_refuses_unrecognized_sqlite_database` | CONDITIONAL (planned) | Run for reset, bootstrap, schema or dev lifecycle changes; routing pending. |
| `test_reset_rejects_symlink_and_preserves_original_database` | CONDITIONAL (planned) | Run for reset, bootstrap, schema or dev lifecycle changes; routing pending. |
| `test_reset_requires_stopped_services` | CONDITIONAL (planned) | Run for reset, bootstrap, schema or dev lifecycle changes; routing pending. |

### [`tests/test_harness.py`](../../tests/test_harness.py) — Launcher process, failure and port lifecycle

| Function | Decision | Basis |
|---|---|---|
| `test_harness_requires_explicit_profile` | CONDITIONAL (planned) | Run for Harness and local launcher changes; routing pending. |
| `test_harness_busy_port_does_not_initialize` | CONDITIONAL (planned) | Run for Harness and local launcher changes; routing pending. |
| `test_harness_requires_explicit_auth_and_leaves_sqlite_empty` | CONDITIONAL (planned) | Run for Harness and local launcher changes; routing pending. |
| `test_harness_missing_npm_is_actionable` | CONDITIONAL (planned) | Run for Harness and local launcher changes; routing pending. |
| `test_child_failure_stops_other_service` | CONDITIONAL (planned) | Run for Harness and local launcher changes; routing pending. |

### [`tests/test_interaction_pair_uniqueness.py`](../../tests/test_interaction_pair_uniqueness.py) — Version 7 migration and provenance integrity

| Function | Decision | Basis |
|---|---|---|
| `test_v7_duplicate_pair_consolidation_preserves_need_and_policy_provenance` | KEEP | Independent contract (retained). |
| `test_v7_unsafe_overlapping_merge_rolls_back_without_data_loss` | KEEP | Independent contract (retained). |

### [`tests/test_interaction_revisions.py`](../../tests/test_interaction_revisions.py) — Revision immutability, typed clauses and legacy migrations

| Function | Decision | Basis |
|---|---|---|
| `test_owned_clauses_and_revision_publish_preserve_old_rules` | KEEP | Independent contract (retained). |
| `test_duplicate_and_partial_clause_commands_leave_no_records` | KEEP | Independent contract (retained). |
| `test_same_purpose_requires_new_revision_and_legacy_exact_duplicates_blocked` | KEEP | Independent contract (retained). |
| `test_overlapping_clauses_are_rejected` | KEEP | Independent contract (retained). |
| `test_legacy_single_clause_and_migration_contract` | KEEP | Independent contract (retained). |

### [`tests/test_listing.py`](../../tests/test_listing.py) — Request listing, authorization, paging and consistent snapshot

| Function | Decision | Basis |
|---|---|---|
| `test_visibility_before_paging_and_historical_owner` | KEEP | Independent contract (retained). |
| `test_decider_falls_back_to_own_requests` | KEEP | Independent contract (retained). |
| `test_strict_queries` | KEEP | Independent contract (retained). |
| `test_missing_or_invalid_credential` | KEEP | Independent contract (retained). |
| `test_ties_decisions_and_restart` | KEEP | Independent contract (retained). |
| `test_list_pins_grants_and_decisions_in_one_snapshot` | KEEP | Independent contract (retained). |

### [`tests/test_opencode_role_catalog.py`](../../tests/test_opencode_role_catalog.py) — Local OpenCode agent role permissions and provider routing

| Function | Decision | Basis |
|---|---|---|
| `test_expected_agents_and_default` | CONDITIONAL (enabled) | Only `opencode.jsonc`/role-test changes, unknown-scope changes, or manual FULL. |
| `test_local_model_has_an_explicit_provider` | CONDITIONAL (enabled) | Only `opencode.jsonc`/role-test changes, unknown-scope changes, or manual FULL. |
| `test_global_deny_first_and_no_unrestricted_writer` | CONDITIONAL (enabled) | Only `opencode.jsonc`/role-test changes, unknown-scope changes, or manual FULL. |
| `test_orchestrator_only_delegates_to_catalog_roles` | CONDITIONAL (enabled) | Only `opencode.jsonc`/role-test changes, unknown-scope changes, or manual FULL. |
| `test_worker_requires_explicit_edit_approval` | CONDITIONAL (enabled) | Only `opencode.jsonc`/role-test changes, unknown-scope changes, or manual FULL. |
| `test_reviewer_and_planners_are_read_only` | CONDITIONAL (enabled) | Only `opencode.jsonc`/role-test changes, unknown-scope changes, or manual FULL. |
| `test_validator_shell_allowlist` | CONDITIONAL (enabled) | Only `opencode.jsonc`/role-test changes, unknown-scope changes, or manual FULL. |

### [`tests/test_request_composition.py`](../../tests/test_request_composition.py) — Options filtering and request creation atomicity/security

| Function | Decision | Basis |
|---|---|---|
| `test_options_shapes_paging_and_address_independence` | KEEP | Independent contract (retained). |
| `test_strict_options_query` | KEEP | Independent contract (retained). |
| `test_business_gates_before_existence` | KEEP | Independent contract (retained). |
| `test_hidden_pair_and_stale_revision` | KEEP | Independent contract (retained). |
| `test_auth_path_and_request_error_parity` | KEEP | Independent contract (retained). |
| `test_dto_historical_and_source_only_no_get` | KEEP | Independent contract (retained). |
| `test_submission_neutral_precedence_and_atomic_failure` | KEEP | Independent contract (retained). |
| `test_conflicting_interaction_group_is_not_selectable_or_submittable` | KEEP | Independent contract (retained). |
| `test_read_snapshot_and_seed_upgrade` | KEEP | Independent contract (retained). |
| `test_filter_before_paging_and_compatible_deployments` | KEEP | Independent contract (retained). |
| `test_other_need_same_subject_and_unrelated_revision` | KEEP | Independent contract (retained). |
| `test_expired_disclosure_seed_is_not_renewed` | KEEP | Independent contract (retained). |
| `test_incompatible_saved_references_have_no_partial_writes` | KEEP | Independent contract (retained). |

### [`tests/test_resource_catalog.py`](../../tests/test_resource_catalog.py) — Resource/Endpoint stable identity, write control and policy export

| Function | Decision | Basis |
|---|---|---|
| `test_resource_creation_is_atomic_and_requires_catalog_create` | KEEP | Independent contract (retained). |
| `test_endpoint_address_is_canonical_and_endpoint_identity_is_stable` | KEEP | Independent contract (retained). |
| `test_invalid_and_unauthorized_endpoint_updates_leave_state_unchanged` | KEEP | Independent contract (retained). |
| `test_new_destination_endpoint_changes_export_without_changing_rule_identity` | KEEP | Independent contract (retained). |
| `test_new_resource_does_not_grant_request_authority_even_in_shared_read` | KEEP | Independent contract (retained). |

### [`tests/test_runtime.py`](../../tests/test_runtime.py) — Documented CLI startup and real process restart

| Function | Decision | Basis |
|---|---|---|
| `test_documented_local_workflow_and_process_restart` | CONDITIONAL (planned) | Run for server/CLI/startup changes; routing pending. |

### [`tests/test_security.py`](../../tests/test_security.py) — Authn/authz, input validation, secrets and safe bind

| Function | Decision | Basis |
|---|---|---|
| `test_openapi_docs_and_no_secrets` | KEEP | Independent contract (retained). |
| `test_401_all_protected_operations` | KEEP | Independent contract (retained). |
| `test_independent_authority_and_forgeries` | KEEP | Independent contract (retained). |
| `test_local_demo_shared_read_preserves_mutation_authority` | KEEP | Independent contract (retained). |
| `test_unsupported_query` | KEEP | Independent contract (retained). |
| `test_malformed_and_absent_references` | KEEP | Independent contract (retained). |
| `test_semantics_before_persistence` | KEEP | Independent contract (retained). |
| `test_seed_repeat_and_restart` | KEEP | Independent contract (retained). |
| `test_fresh_seed_has_no_permission` | KEEP | Independent contract (retained). |
| `test_launcher_refuses_unsafe_host` | KEEP | Independent contract (retained). |
| `test_credentials_must_be_private` | KEEP | Independent contract (retained). |
| `test_no_secrets_in_git` | KEEP | Independent contract (retained). |

### [`tests/test_semantic_labels.py`](../../tests/test_semantic_labels.py) — Migration v3/v4, typed ports and confidential labels

| Function | Decision | Basis |
|---|---|---|
| `test_v3_upgrade_preserves_history_and_credentials` | KEEP | Independent contract (retained). |
| `test_v3_migration_rolls_back_ddl_and_version` | KEEP | Independent contract (retained). |
| `test_v4_actor_names_migration_is_additive_repeatable_and_atomic` | KEEP | Independent contract (retained). |
| `test_actor_names_migration_rolls_back_table_and_version` | KEEP | Independent contract (retained). |
| `test_names_validate_and_component_names_are_application_scoped` | KEEP | Independent contract (retained). |
| `test_typed_traffic` | KEEP | Independent contract (retained). |
| `test_invalid_typed_traffic` | KEEP | Independent contract (retained). |
| `test_semantic_labels_missing_names_and_confidentiality` | KEEP | Independent contract (retained). |
| `test_seed_preserves_operator_component_names_and_name_collisions` | KEEP | Independent contract (retained). |
| `test_historical_request_read_survives_each_disclosure_revocation_without_names` | KEEP | Independent contract (retained). |
| `test_requester_name_uses_metadata_and_missing_name_fallback` | KEEP | Independent contract (retained). |
| `test_policy_rule_display_projection_is_authorized_and_exact` | KEEP | Independent contract (retained). |
| `test_name_metadata_requires_an_existing_owner` | KEEP | Independent contract (retained). |

### [`tests/test_source_ports.py`](../../tests/test_source_ports.py) — Port interval semantics and compatibility migration v5

| Function | Decision | Basis |
|---|---|---|
| `test_source_ports_any_and_explicit_end_to_end` | KEEP | Independent contract (retained). |
| `test_invalid_port_intervals_do_not_persist` | KEEP | Independent contract (retained). |
| `test_old_post_without_source_fields_means_any` | KEEP | Independent contract (retained). |
| `test_v5_source_port_migration_is_additive_and_repeatable` | KEEP | Independent contract (retained). |

### [`tests/test_transactions.py`](../../tests/test_transactions.py) — Constraint immutability, rollback, concurrency, grants and snapshot

| Function | Decision | Basis |
|---|---|---|
| `test_pure_domain_invariants` | KEEP | Independent contract (retained). |
| `test_database_constraints_and_immutability` | KEEP | Independent contract (retained). |
| `test_unknown_schema_fails_safely` | KEEP | Independent contract (retained). |
| `test_atomic_allowance_rollback` | KEEP | Independent contract (retained). |
| `test_concurrent_allowed_canonical_rule` | KEEP | Independent contract (retained). |
| `test_grant_boundaries` | KEEP | Independent contract (retained). |
| `test_timezone_grant_comparison` | KEEP | Independent contract (retained). |
| `test_export_pinned_snapshot_during_concurrent_writes` | KEEP | Independent contract (retained). |

## Complete Playwright test declaration register

The 9 primary end-to-end/security cases remain KEEP. The rest are **planned conditional** only; all 29 still run in current CI.

### [`web/e2e/business-processes.spec.ts`](../../web/e2e/business-processes.spec.ts) — REAL BusinessProcess UI and retry

| Playwright declaration | Decision | Basis |
|---|---|---|
| REAL Process persists through refresh and actual backend restart | KEEP | Distinct cross-layer smoke/security invariant. |
| REAL Process authorization, failed POST and actual API outage have safe retry states | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |

### [`web/e2e/catalog-journey.spec.ts`](../../web/e2e/catalog-journey.spec.ts) — Catalog-to-policy actual browser journey

| Playwright declaration | Decision | Basis |
|---|---|---|
| REAL catalogs create an active policy from a new application profile | KEEP | Distinct cross-layer smoke/security invariant. |

### [`web/e2e/empty-database.spec.ts`](../../web/e2e/empty-database.spec.ts) — Synthetic data regression

| Playwright declaration | Decision | Basis |
|---|---|---|
| empty schema-only SQLite renders only real API data, without synthetic fallback | KEEP | Distinct cross-layer smoke/security invariant. |

### [`web/e2e/requests.spec.ts`](../../web/e2e/requests.spec.ts) — Manual-auth browser access request journey

| Playwright declaration | Decision | Basis |
|---|---|---|
| requester creates, lists and opens persisted request | KEEP | Distinct cross-layer smoke/security invariant. |
| real ALLOWED and DENIED persist across credential switches and browser reloads | KEEP | Distinct cross-layer smoke/security invariant. |
| server rejects mismatched mode, isolates unrelated actor, and reloads a concurrent decision | KEEP | Distinct cross-layer smoke/security invariant. |
| validation, 404, 401 and offline errors have safe correction/retry paths | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| supported Vite configuration rejects non-loopback CLI bind | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| normal development never enables actor substitution | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| a late 401 from a cleared credential cannot revoke the new manual session | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |

### [`web/e2e-harness/local-demo.spec.ts`](../../web/e2e-harness/local-demo.spec.ts) — Local-demo browser, actor, proxy and policy integration

| Playwright declaration | Decision | Basis |
|---|---|---|
| one-command actor switching preserves independent grants and actual persistence | KEEP | Distinct cross-layer smoke/security invariant. |
| proxy rejects CSRF, unknown actors and private static file access; backend still supplies 401/403 | KEEP | Distinct cross-layer smoke/security invariant. |
| production and preview reject activation | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| late real reads discard obsolete actor responses with shared visibility | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| real collection pagination survives detail tabs, breadcrumbs and reload | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| REAL shared Rule reads, missing address retention and INACTIVE files | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| late Rule reads and downloads discard stale actor results | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| composition resets, empty/error discovery and uncertain POST remain safe | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| composition delayed options and POST do not restore old context or navigate after actor switch | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| confirmation summary contains the selected backend facts and resets with Revision | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| REAL navigation is bounded, resizable and without synthetic routes | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| Endpoint draft stays with its Resource during an in-app route change | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| REAL Resources create a stable Endpoint and feed a new destination through policy export | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| current shared policy INACTIVE and INCOMPLETE states use actual backend files | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| late Rule collection and current-policy downloads discard stale actor results | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| new policy proxy routes preserve method, origin and actor boundaries | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| Rule collection paging and actor reset preserve readable current-policy scope | CONDITIONAL (planned) | Relevant UI/endpoint/proxy changes; dependency map needed before exclusion. |
| local-demo requester creates a self-interaction and requester/exporter see its active rule | KEEP | Distinct cross-layer smoke/security invariant. |

## Standalone Node proxy tests

- `request guard permits exact same-origin context and rejects origin/CSRF/rebinding attempts` — **KEEP**, checks proxy trust boundary without launching a browser.
- `private credential file is validated before use and cannot be inside web` — **KEEP**, file permissions and symlink denial.

## Fail-closed routing contract

1. In PRs with known, safely classified source/test/web changes, `application` may ignore `tests/test_opencode_role_catalog.py`.
2. If its test file changes, those 7 tests run. `opencode.jsonc`, CI/dependency/unknown changes trigger FULL fallback. Manual dispatch also runs full pytest.
3. No required check name changes; `application`, `web`, `validate`, `semantic-contract` remain blocking contexts, respecting the existing branch ruleset.
4. Planned conditional groups (reset, runtime, launcher, most browser cases) remain included until a verified change-path→contract→test matrix prevents false-negative skips.
5. Before broader selection, demonstrate backend-only, web-only and unknown/CI PR behavior; preserve a safe full-suite command and use an explicit fail-closed aggregate gate when changing required-check structure.

