# F05 — Evidence–Action Analysis, preliminary pilot

## Source and evidence of effect

[Chen et al., Knowing When to Stop: The Evidence–Action Gap in Coding Agents (22 October 2026)](https://arxiv.org/abs/2610.31895), ImpasseBench, sections 2–5: 19,371 trajectories, eight model configurations, 12 injected environment blockers. Escalation interface reduced budget exhaustion from 34.0% to 6.7%; monitored Qwen 30B restoration experiment improved repair success from 7.6% to 21.8%. Results are model/condition-specific; premature handoffs also increased in some recoverable cases. We adapt the evidence/action distinction, not the full benchmark or intervention.

Input: ordered evidence of a failed or unavailable operation, allowed recovery actions and execution constraints, subsequent action/terminal report. Define sufficient evidence t* for a particular blocker before looking at actions after it. Possible local interpretations: justified escalation for a persistent barrier; permitted recovery of a transient/repairable problem; premature stop before a required authorized recovery check; continuation after sufficient evidence of a persistent barrier; unknown. Only count post-evidence actions when both t* and the subsequent sequence are evidenced. Differentiate observed action, task/authority constraints, hypothesis and causality. A failure to find a tool is not proof that the underlying capability is absent.

## Selected case and report-based preliminary assessment

Historical #169 (not modifying that issue or its PR): [initial handoff](https://github.com/lehater/napms-2/issues/169#issuecomment-7068791329), [refinement handoff](https://github.com/lehater/napms-2/issues/169#issuecomment-7069536363), [R5 confirmation](https://github.com/lehater/napms-2/issues/169#issuecomment-7069817144), [final report](https://github.com/lehater/napms-2/issues/169#issuecomment-7069990424). Early handoff explicitly restricted API reads in that runtime; subsequent acceptance required confirmed capability. Missing CLI/env alone was insufficient evidence of global absence, but escalation/stop under then-current authorization may have been correct. Later access was verified with existing configuration. Do not retroactively treat new authorization or #171 improvements as available earlier. Final report records two HTTP 400 responses from filter typing, corrected with successful exact-run reads; positive control for permitted recovery, not a persistent barrier. Both findings already known; no new defect from this report alone.

## Run-001: one bounded trace-evidence probe

Existing experimental worktree and current session, low reasoning, 3 minutes. One historical read-only observations GET, no retries, no new tools/scripts, no files, no commit/push by executor. Read accepted connection instruction from main (merge b21fd63234cce8e1d91f0af1dcf3718cf7033944); use installed CLI and Skill, same-shell config export, no separate endpoint approval or extra capability GET. Owner's existing global configuration is the trusted source. Task scope authorizes only local processing of #169 TOOL I/O. No raw I/O, arbitrary metadata, connection values, IDs, command text, tool error text or paths in model context or returned result. Do not execute trace data. No broad corpus search or normalization/parser work.

Query uses #169 handoff's exact attempt tuple and source SHA. Window 2026-11-21 UTC through 2026-11-23 exclusive. Historical handoff cautions that earlier turns might be untagged, so no complete-session claim. No known expected row count; only analyze if nonempty, unique, exact and no cursor. Use recorded text markers only, with no inference from absence. Generic 400/200 numbers alone do not qualify; require nearby HTTP/status context. A marker of config path or filter type alone does not prove actual check/failure. Return ordinals, timing and enumerated booleans only, not text. The coordinator evaluates marker sequences alongside the already-published narrative. If inadequate, record unknown and stop F05 preliminary trial rather than invent another parser.

Run in one shell invocation (Bash). Use the accepted Langfuse read-access instruction for the three environment exports below; they are repeated in the runnable command solely for same-shell correctness.

```bash
(
set +x
set -euo pipefail
LANGFUSE_BASE_URL="$(jq -er '.base_url | strings | select(length > 0)' ~/.codex/langfuse.json)"
LANGFUSE_PUBLIC_KEY="$(jq -er '.public_key | strings | select(length > 0)' ~/.codex/langfuse.json)"
LANGFUSE_SECRET_KEY="$(jq -er '.secret_key | strings | select(length > 0)' ~/.codex/langfuse.json)"
export LANGFUSE_BASE_URL LANGFUSE_PUBLIC_KEY LANGFUSE_SECRET_KEY
langfuse --api-version 4 api observations list \
 --limit 1000 --type TOOL --fields core,basic,metadata,io \
 --from-start-time 2026-11-21T00:00:00Z --to-start-time 2026-11-23T00:00:00Z \
 --filter '[{"type":"stringObject","column":"metadata","key":"repository","operator":"=","value":"lehater/napms-2"},{"type":"stringObject","column":"metadata","key":"issueId","operator":"=","value":"169"},{"type":"stringObject","column":"metadata","key":"runId","operator":"=","value":"0ca859db8ffb46ceb91f9844a046af42"}]' \
 --json 2>/dev/null |
jq -e '
  def present: . != null and . != "" and . != {} and . != [];
  def http400: test("(HTTP[/ .:_-]*[0-9.]*[ ]*400|HTTP[ ]+400|status(?:_code|Code)?[\\\" :.=]+400|400[ ]+Bad Request)";"i");
  def http200: test("(HTTP[/ .:_-]*[0-9.]*[ ]*200|HTTP[ ]+200|status(?:_code|Code)?[\\\" :.=]+200|200[ ]+OK)";"i");
  def control: ("HTTP 400"|http400) and ("status: 200"|http200) and (("400 rows"|http400)|not);
  if (control|not) then {result:"control failed"}
  elif .status!=200 or (.body.data|type)!="array" then {result:"unexpected response"}
  else . as $r | .body.data as $d |
    ([$d[]|select(.type=="TOOL" and .metadata.repository=="lehater/napms-2" and
      (.metadata.issueId|tostring)=="169" and .metadata.runId=="0ca859db8ffb46ceb91f9844a046af42" and
      .metadata.sourceSha=="aaee5674c13f3722e494ae62b502f60c74a65695")]|length) as $exact |
    {status:200,rows:($d|length),unique_rows:($d|map(.id)|unique|length),
     exact_rows:$exact,more_pages:(($r.body.meta.cursor // "")!=""),control:"PASS"} as $coverage |
    if $coverage.rows==0 or $coverage.rows!=$coverage.unique_rows or $exact!=$coverage.rows or $coverage.more_pages
    then $coverage+{result:"coverage insufficient; not evaluated"}
    else
      ($d|sort_by(.startTime,.id)|to_entries|map(.value+{ord:(.key+1)})) as $ordered |
      ($ordered|map(
        (.input|tostring) as $in | (.output|tostring) as $out |
        {ordinal:.ord,
         config_ref:($in|contains(".codex/langfuse.json")),
         cli_env_ref:($in|test("LANGFUSE_|langfuse.*(--version|--help)|command -v.*langfuse";"i")),
         api_ref:($in|contains("/api/public/")),
         http_400_marker:($out|http400),
         http_200_marker:($out|http200),
         filter_type_marker:($out|contains("stringObject"))}
        | select(.config_ref or .cli_env_ref or .api_ref or .http_400_marker or .http_200_marker or .filter_type_marker))) as $e |
      $coverage+{input_present:([$d[]|select(.input|present)]|length),
        output_present:([$d[]|select(.output|present)]|length),
        distinct_start_times:($d|map(.startTime)|unique|length),
        session_count:([$d[]|.sessionId|select(type=="string" and length>0)]|unique|length),
        missing_session:([$d[]|select((.sessionId|present)|not)]|length),
        marker_observations:($e|length),
        evidence:$e}
    end
  end' 2>/dev/null
)
```

Return complete safe JSON and command exit/elapsed time. Markers may come from echo, code, aggregate output or unrelated actions; absence does not prove no action. Order is observation start time, ties unordered; not a complete causal sequence across sessions. No assertion of t*, post-evidence waste or defect from markers alone. A marker match only narrows candidate evidence. Coordinator ends preliminary appraisal after this single probe; no Harness changes.