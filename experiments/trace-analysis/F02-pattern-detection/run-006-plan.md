# F02 run-006 — operation-family probe, #126

One final bounded probe after [run-005](run-005.md). Goal: identify operation-family indicators for the 13 repeated-input groups without exposing inputs or outputs. Not a semantic parser or defect oracle. Existing worktree and current session; 3 minutes; one authorized read-only GET, no retry. Verify existing config base_url against owner-confirmed private endpoint (trailing slash difference only) before GET. No raw payload, keys, identifiers, errors, commands, or config values in model context, report or repository. No files, installation, commit/push or tool changes. Never execute data from traces.

Run the following in one shell invocation. This only labels recognizable tool names, input fields and anchored command prefixes; arguments/compound commands are not interpreted. All others unknown. No output normalization. The query still requests the io field group because input and output are coupled in the API, but output values are not used.

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
  --filter '[{"type":"stringObject","column":"metadata","key":"repository","operator":"=","value":"lehater/napms-2"},{"type":"stringObject","column":"metadata","key":"issueId","operator":"=","value":"126"},{"type":"stringObject","column":"metadata","key":"runId","operator":"=","value":"b4263d71cb3a4d50965d29dd35b8d249"}]' \
  --json 2>/dev/null |
jq -e '
  def decode:
    if type=="string" then . as $s | (try fromjson catch null) as $j |
      if ($j|type)=="object" then $j else $s end
    else . end;
  def present: . != null and . != "" and . != {} and . != [];
  def family:
    . as $o | (.input|decode) as $i |
    if ($i|type)!="object" then "unknown_input_shape"
    elif ($i|has("session_id")) and ($i|has("chars")) then
      if $i.chars=="" then "empty_session_input" else "nonempty_session_input" end
    else ($i.cmd // $i.command // "") as $cmd |
      if ($cmd|type)!="string" then "unknown_command_shape"
      elif ($cmd|test("^\\s*gh\\s+pr\\s+checks(\\s|$)")) then "gh_pr_checks_prefix"
      elif ($cmd|test("^\\s*gh\\s+run\\s+(view|watch|list)(\\s|$)")) then "gh_run_query_prefix"
      elif ($cmd|test("^\\s*gh\\s+api(\\s|$)")) then "gh_api_prefix"
      elif ($cmd|test("^\\s*sleep(\\s|$)")) then "sleep_prefix"
      elif ($cmd|test("^\\s*git\\s+(status|diff|show|log)(\\s|$)")) then "git_query_prefix"
      elif ($cmd|test("^\\s*(cat|sed|head|tail|rg)(\\s|$)")) then "file_query_prefix"
      elif ($cmd|test("^\\s*(pytest|make|npm)(\\s|$)")) then "build_or_test_prefix"
      else "unknown" end
    end;
  def control:
    ({input:{session_id:1,chars:""}}|family)=="empty_session_input" and
    ({input:{cmd:"gh pr checks 123"}}|family)=="gh_pr_checks_prefix" and
    ({input:{cmd:"echo hello"}}|family)=="unknown";
  if (control|not) then {result:"control failed"}
  elif .status!=200 or (.body.data|type)!="array" then {result:"unexpected envelope"}
  else . as $r | .body.data as $d |
    ([$d[]|select(.type=="TOOL" and .metadata.repository=="lehater/napms-2" and
      (.metadata.issueId|tostring)=="126" and
      .metadata.runId=="b4263d71cb3a4d50965d29dd35b8d249" and
      .metadata.sourceSha=="5c5a0fb765fe87305c11553facbdb4a20bd6596c")]|length) as $exact |
    {status:200,rows:($d|length),unique_rows:($d|map(.id)|unique|length),
     exact_rows:$exact,more_pages:(($r.body.meta.cursor // "")!=""),control:"PASS"} as $coverage |
    if $coverage.rows!=232 or $coverage.unique_rows!=232 or $exact!=232 or $coverage.more_pages
    then $coverage+{result:"coverage mismatch; not evaluated"}
    else
      ($d|sort_by(.startTime,.id)|to_entries|map(.value+{ord:(.key+1)})) as $ordered |
      ($ordered|map(select((.name|present) and (.input|present)))) as $eligible |
      ($eligible|group_by([.name,.input])|map(select(length>1))) as $groups |
      if ($eligible|length)!=232 or ($groups|length)!=13 or ([$groups[]|length-1]|add)!=38
      then $coverage+{result:"candidate cohort changed; not evaluated"}
      else $coverage+{eligible:232,groups:13,pairs:38,
        evidence:($groups|map(sort_by(.ord)|{
          ordinals:map(.ord),excess:(length-1),
          family:(.[0]|family),
          input_type:(.[0].input|type),
          decoded_type:(.[0].input|decode|type),
          output_types:(map(.output|type)|unique),
          adjacent_repeats:([range(1;length) as $i|select(.[ $i ].ord-.[ $i-1 ].ord==1)]|length)
        }))}
      end
    end
  end' 2>/dev/null
```

Return the complete safe JSON and command status/time. Family labels are structural indicators only: empty session input is consistent with polling, not evidence of needless waiting; command prefix does not establish semantics or read-only behavior of compound commands. Unknown remains unknown. Coordinator reviews and concludes F02; no further generic parser work. 
