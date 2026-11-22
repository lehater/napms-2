# F02 supporting pilot — exact repeated tool inputs (exploratory)

This is a new narrow prefilter, not the published Graphectory RV/SC detector; those two patterns remain paused and unevaluated. Goal: find exact tool-input repetitions without shell semantic parsing. A repeated invocation is a candidate, not proof of waste. Coordinator analyzes aggregates and decides whether deeper evidence is worthwhile.

## Scope and execution
Existing experiment worktree and current Codex session, 3 minutes. Fetch latest branch, use this document via git show FETCH_HEAD if needed. One read-only CLI GET, no retry. Owner launching this task authorizes bounded historical #151 TOOL I/O processing locally only; raw request/response payloads must never enter model context, logs, chat, or repository. No network except this authorized Langfuse endpoint and Git fetch. No new scripts, installations, or file edits. Return only sanitized aggregates. Existing official skill already read. Compare with run-005 expected 35 distinct exactly attributed TOOL observations. Reuse the known config and same-shell export; verify host is authorized local deployment; stop if not. Do not enable shell tracing.

Run in one shell invocation:
```bash
set +x
set -euo pipefail
LANGFUSE_BASE_URL="$(jq -er '.base_url' ~/.codex/langfuse.json)"
LANGFUSE_PUBLIC_KEY="$(jq -er '.public_key' ~/.codex/langfuse.json)"
LANGFUSE_SECRET_KEY="$(jq -er '.secret_key' ~/.codex/langfuse.json)"
export LANGFUSE_BASE_URL LANGFUSE_PUBLIC_KEY LANGFUSE_SECRET_KEY

langfuse --api-version 4 api observations list \
  --limit 1000 --type TOOL --fields core,basic,metadata,io \
  --from-start-time 2026-11-18T00:00:00Z \
  --to-start-time 2026-11-22T00:00:00Z \
  --filter '[{"type":"stringObject","column":"metadata","key":"repository","operator":"=","value":"lehater/napms-2"},{"type":"stringObject","column":"metadata","key":"issueId","operator":"=","value":"151"},{"type":"stringObject","column":"metadata","key":"runId","operator":"=","value":"618fdd192d6240c29f3d90329a4a6545"}]' \
  --json 2>/dev/null |
jq -e '
  def present: . != null and . != "" and . != {} and . != [];
  if .status != 200 or (.body.data|type) != "array" then
    {result:"unexpected envelope"}
  else
    . as $r | .body.data as $d |
    ([$d[]|select(.type=="TOOL" and .metadata.repository=="lehater/napms-2" and
      (.metadata.issueId|tostring)=="151" and
      .metadata.runId=="618fdd192d6240c29f3d90329a4a6545" and
      .metadata.sourceSha=="2fdd3c9a7b32db891fdd3216ee1d55f85e8d06c4")]|length) as $exact |
    {status:200,rows:($d|length),unique_rows:($d|map(.id)|unique|length),
     exact_rows:$exact,more_pages:(($r.body.meta.cursor // "")!="")} as $coverage |
    if $coverage.rows!=35 or $coverage.unique_rows!=35 or $exact!=35 or $coverage.more_pages
    then $coverage + {result:"coverage mismatch; not evaluated"}
    else
      ($d|sort_by(.startTime,.id)|to_entries|map(.value+{ord:(.key+1)})) as $ordered |
      ($ordered|map(select((.name|present) and (.input|present)))) as $eligible |
      ($eligible|group_by([.name,.input])|map(select(length>1))) as $groups |
      $coverage + {
        eligible:($eligible|length),
        unknown_input_or_name:(35-($eligible|length)),
        distinct_start_times:($d|map(.startTime)|unique|length),
        repeated_groups:($groups|length),
        repeated_excess:([$groups[]|length-1]|add // 0),
        candidates:($groups|map(sort_by(.ord)|. as $g|
          {ordinals:map(.ord),
           pairs:[range(1;length) as $i |
             {previous:$g[$i-1].ord,current:$g[$i].ord,
              intervening_tools:($g[$i].ord-$g[$i-1].ord-1),
              output_equal:(if ($g[$i-1].output|present) and ($g[$i].output|present)
              then ($g[$i-1].output==$g[$i].output) else null end)}]}))
      }
    end
  end' 2>/dev/null
```

Equality is exact JSON-value equality of name and input (strings are not parsed/normalized). Output completeness/truncation unknown; equality is only equality of recorded values. Ordinals refer to the sorted TOOL subset; if start times tied, tie order is arbitrary, not established chronological order. Intervening count is TOOL observations only, not all model events; no assumption of same execution stream beyond the same attributed attempt. Cross-session repeats may be legitimate. No command names, raw text, IDs, hashes, or arbitrary data are emitted. Unknown inputs excluded, not classified as nonrepeats. A zero candidate count applies only to eligible observations. No claim of RV/SC, redundant reads, or causal defects. Return safe JSON, command exit status and elapsed time. On any error return generic blocker, never print unfiltered response or stderr. Do not commit/push.
