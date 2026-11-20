# GitHub operations

Use this as the shared command reference for Project and Issue/PR operations. Policy and ordering remain in [`.ai/workflow.yaml`](workflow.yaml), [`decompose`](../.agents/skills/decompose/SKILL.md), and [`execute-task`](../.agents/skills/execute-task/SKILL.md). At the start of an operation, discover the target repository/Project, relevant IDs, names, options, endpoint support, and CLI JSON fields. Reuse those discoveries for subsequent steps in the same operation while the target and baseline remain consistent and there are no signs of drift. Re-read after each write to verify its result. If a concurrent update, changed target, API/CLI error, or read-back mismatch indicates drift, stop and refresh the affected baseline before another write. A later operation starts with a fresh baseline. Do not copy values from examples into another operation.

## Runtime capability and errors

Record the local CLI version and check the exact command/field when capability matters:

```sh
gh --version
gh project item-list --help
gh project field-list --help
gh pr view NUMBER --repo OWNER/REPO --json FIELD
```

`gh ... --json unsupportedField` returns an `Unknown JSON field` error and lists the fields supported by that installed command. Use that list to select a supported field; for data the CLI does not expose, query the documented REST or GraphQL endpoint with `gh api`. Do not keep a permanent list of fields that older CLI releases lacked. Without a shell, inspect the connected GitHub tool's supported operations and returned fields; if it cannot expose a required value, hand off that exact gap rather than guessing.

For HTTP/API errors, retain the status and response message without tokens or raw credential-bearing headers. A `401` indicates authentication failure. A `403` is an authorization/rate-limit response; use `gh auth status` for the authenticated account and classic scopes, then check the endpoint's documented repository/organization permissions and any organization SSO requirement. A missing classic OAuth scope is a token-scope problem; a user lacking repository/organization access or a fine-grained token lacking endpoint permission is a resource-permission problem. Check these separately because the response may not distinguish them. Fine-grained token permissions may not appear in `gh auth status`. A `404` can mean an absent resource/relationship or an inaccessible resource; it is not proof that an endpoint is unsupported. A `422` generally indicates invalid input or a failed precondition. Do not refresh credentials or broaden permissions automatically. If the available evidence cannot distinguish a missing permission from a missing resource, report that uncertainty and stop the dependent write.

## Project fields and items

Read the live Project schema and item membership before using an ID or option. CLI JSON has two distinct shapes:

```sh
gh project view PROJECT_NUMBER --owner OWNER --format json \
  | jq '{id, fields, items}'
gh project field-list PROJECT_NUMBER --owner OWNER --format json --limit 200 \
  | jq '.fields[] | {id, name, type, options: [.options[]? | {id, name}]}'
gh project item-list PROJECT_NUMBER --owner OWNER --format json --limit 200 \
  | jq --arg repository "https://github.com/OWNER/REPO" --argjson number ISSUE_NUMBER \
      '.items[] | select(.repository == $repository and .content.number == $number) | {id, repository, title, status, priority, workstream, content: {number: .content.number, type: .content.type}}'
```

`project view` returns `fields` and `items` count objects, for example `{ "fields": { "totalCount": 22 }, "items": { "totalCount": 85 } }`; `field-list` returns a `.fields` array, and `item-list` returns an `.items` array. The exact item properties depend on the present Project data. Use `--limit` high enough to cover the collection; these commands page through results up to that limit. Do not assume a returned item is the requested repository Issue until its canonical URL/number agrees.

For a focused selection, filter the full returned list by canonical issue number and repository, then retain its item `id`. Use the discovered field ID and option ID for `gh project item-edit`; read the item again independently with `item-list` and compare the requested field. If the installed CLI cannot express an operation, use the live ProjectV2 GraphQL schema and discovered node IDs/options. Do not infer an option ID from its name or reuse one from another Project.

```sh
gh project item-edit --project-id PROJECT_NODE_ID --id ITEM_ID \
  --field-id FIELD_ID --single-select-option-id OPTION_ID
# Independently re-read with `gh project item-list ... --format json` and compare.
```

This command form follows the [GitHub CLI `gh project item-edit` manual](https://cli.github.com/manual/gh_project_item-edit); the local `gh project item-edit --help` is the capability check for the installed version.

## Issue type and custom Issue Fields

Issue Type and custom Issue Fields are repository/owner Issue metadata, separate from similarly named Project fields. Check the repository Issue API and field definitions/values rather than the Project item. Current REST forms:

```sh
gh api repos/OWNER/REPO/issues/NUMBER \
  --jq '{number, type: .type.name, sub_issues_summary, issue_dependencies_summary}'
gh api user/issue-fields --paginate \
  --jq '.[] | {id, name, data_type, options: [.options[]? | {id, name}]}'
gh api repos/OWNER/REPO/issues/NUMBER/issue-field-values --paginate \
  --jq '.[] | {issue_field_id, issue_field_name, data_type, value, single_select_option, multi_select_options}'
```

For an authorized Issue Field change, first read the complete current values and discover the field ID and valid option name. Prepare the exact payload, then use `POST /repos/{owner}/{repo}/issues/{issue_number}/issue-field-values` to add/update supplied values. `PUT` replaces the complete value set; include all intended existing values if using it. Read the complete values endpoint again and compare. Issue type can be set on Issue create; check the currently documented endpoint/API before trying to change an existing Issue's type. Do not conflate this metadata with Project `Type`, `Reasoning`, or `Effort` fields.

```sh
# issue-fields.json uses an issue_field_values array; each entry has a discovered
# numeric field_id and a value matching that field's documented data type.
gh api repos/OWNER/REPO/issues/NUMBER/issue-field-values \
  -X POST --input issue-fields.json
gh api repos/OWNER/REPO/issues/NUMBER/issue-field-values --paginate
```

## Pagination

For REST list endpoints, `gh api --paginate` follows the response's `Link` header. Reduce each page before collecting it; `jq -s 'add'` combines the page arrays:

```sh
gh api repos/OWNER/REPO/issues/NUMBER/dependencies/blocked_by --paginate \
  --jq 'map({number, state, state_reason})' | jq -s 'add'
```

For GraphQL connections, request `pageInfo { hasNextPage endCursor }`, pass `endCursor` as the next `after` value, and continue until `hasNextPage` is false. `gh api graphql --paginate` requires an `$endCursor: String` query variable and a connection with `pageInfo`; verify that shape before relying on it. An initial page or `totalCount` alone is not a complete relationship/read-back check.

## Native parent, sub-issues, and blockers

These relationships are native data; Markdown references do not create them. Read the parent endpoint (a 404 can mean no parent), the full sub-issue collection, and the full `blocked_by` collection. Example read forms:

```sh
gh api repos/OWNER/REPO/issues/CHILD/parent --jq '{number, html_url}'
gh api repos/OWNER/REPO/issues/PARENT/sub_issues --paginate \
  --jq 'map({number, html_url})' | jq -s 'add'
gh api repos/OWNER/REPO/issues/ISSUE/dependencies/blocked_by --paginate \
  --jq 'map({number, state, state_reason})' | jq -s 'add'
```

For an approved relationship change, resolve canonical Issue numbers to the IDs required by the documented endpoint, read both sides/current complete relationship lists first, and use the documented native `POST`/`DELETE` endpoint. These command forms take IDs discovered from canonical Issues:

```sh
# Add a sub-issue; optional replace_parent=true must be explicitly intended.
gh api repos/OWNER/REPO/issues/PARENT/sub_issues -X POST \
  -F sub_issue_id=SUB_ISSUE_DATABASE_ID
# Remove that child (the endpoint is singular and takes the ID in the body).
gh api repos/OWNER/REPO/issues/PARENT/sub_issue -X DELETE \
  -F sub_issue_id=SUB_ISSUE_DATABASE_ID
# Add/remove a blocker using the blocked issue's database ID.
gh api repos/OWNER/REPO/issues/BLOCKED_ISSUE/dependencies/blocked_by -X POST \
  -F issue_id=BLOCKER_DATABASE_ID
# DELETE takes the blocker ID as a path parameter, not a request body.
gh api repos/OWNER/REPO/issues/BLOCKED_ISSUE/dependencies/blocked_by/BLOCKER_DATABASE_ID \
  -X DELETE
```

Independently read the full parent, child, and blocker lists after the write; compare canonical IDs and dependency completion state/reason. Do not retry a timed-out write until read-back establishes whether it applied. A successful HTTP response by itself is not evidence of the final relationship state. The endpoint and request shapes above follow GitHub's [sub-issues endpoints](https://docs.github.com/en/rest/issues/sub-issues) and [issue dependency endpoints](https://docs.github.com/en/rest/issues/issue-dependencies).

## Pull request fields

Use the installed CLI's supported JSON fields for a compact read and inspect a precise GraphQL/REST field when required:

```sh
gh pr view NUMBER --repo OWNER/REPO --json number,headRefOid,baseRefName,isDraft,state
gh api graphql --paginate -f query='query($owner:String!, $repo:String!, $number:Int!, $endCursor:String) { repository(owner:$owner,name:$repo) { pullRequest(number:$number) { number headRefOid closingIssuesReferences(first:100, after:$endCursor) { nodes { number } pageInfo { hasNextPage endCursor } } } } }' \
  -F owner=OWNER -F repo=REPO -F number=NUMBER
```

The CLI field list is version-specific; ask `gh pr view --json unsupportedField` for the actual available fields. If a required field is absent, inspect the live GraphQL schema/API response and paginate connections. For CI evidence, compare the PR head SHA with the selected workflow run's `head_sha`; PR state, mergeability, checks, and closing references are separate data.

## Verification evidence captured for this reference

Checked read-only on **2026-11-20** with **GitHub CLI 2.46.0** against `lehater/napms-2`, Project #6, Issue #144, and PR #138. `gh project view` returned `.fields.totalCount` and `.items.totalCount`; `field-list` exposed fields as `.fields[]` with option objects, and `item-list` exposed `.items[]` including item IDs and current Status/Priority/Workstream. REST reads returned Issue Type as `.type.name`; the Issue Field values route returned field IDs/names/types/values, and the owner field-definition route returned definitions/options. Parent, sub-issues, and blocked-by reads succeeded (empty relationships for #144); GraphQL returned `parent`, `subIssues.nodes/pageInfo`, `blockedBy.nodes/pageInfo`; the PR query returned `headRefOid` and `closingIssuesReferences`. `gh pr view`'s local JSON field error listed supported fields, including `headRefOid`; its list is runtime output, not a repository-wide compatibility promise. No relationship, field value, Project field, or PR value was written for this verification.

The read forms were checked on that date/runtime against accessible resources. The write request shapes above were separately checked against GitHub's official [Issue Field value endpoints](https://docs.github.com/en/rest/issues/issue-field-values), [sub-issues endpoints](https://docs.github.com/en/rest/issues/sub-issues), [issue dependency endpoints](https://docs.github.com/en/rest/issues/issue-dependencies), and [GitHub CLI `gh api` manual](https://cli.github.com/manual/gh_api). In particular, removing a blocker uses `DELETE .../dependencies/blocked_by/{issue_id}` with the blocking Issue database ID in the path. No relationship or field write was issued for this documentation check. Check again when the runtime, endpoint, repository, or permission context differs. GitHub's [Issue Field definitions](https://docs.github.com/en/rest/users/issue-fields) and each endpoint's permission table remain authoritative.
