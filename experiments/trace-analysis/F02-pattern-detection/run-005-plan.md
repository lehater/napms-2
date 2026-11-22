# F02 run-005 — distinguish wrapper and recorded result differences

Purpose: follow up 13 groups / 38 excess exact-input observations in [run-004](run-004.md). Treat only the recorded output of an identical named tool and input. Current upstream [plugin parse](https://github.com/langfuse/codex-observability-plugin/blob/main/plugins/tracing/src/parse.ts) and [trace emission](https://github.com/langfuse/codex-observability-plugin/blob/main/plugins/tracing/src/trace.ts) show call-ID association and output conversion to text; installed historical version and output shape not independently established. Match only a strict candidate Codex shell wrapper; unrecognized shapes remain unknown. No general shell parser.

Existing worktree/session, 3 minutes; same privately owner-confirmed local endpoint and existing config as run-004. Compare base_url to owner's private approved value allowing trailing slash only before GET. One read-only scoped #126 GET; no retry, installation, file changes, or commit/push. Raw I/O stays inside CLI-to-jq pipe, never in model context or published output. No shell tracing, no raw errors printed. Run the command below in one shell invocation. The jq filter includes a synthetic positive/negative/unknown normalization control. Stop after response; do not expand scope. 

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
  def norm:
    if type != "string" then null else
      (capture("\\AChunk ID: [A-Za-z0-9_-]+\\nWall time: [0-9]+(?:\\.[0-9]+)? seconds\\nProcess exited with code (?<exit>-?[0-9]+)\\n(?:Original token count: [0-9]+\\n)?(?:Output|Final output):\\n(?<body>[\\s\\S]*)\\z") // null)
    end;
  def present: . != null and . != "" and . != {} and . != [];
  def classify($a;$b):
    ($a.output|norm) as $x | ($b.output|norm) as $y |
    if ($a.output|present|not) or ($b.output|present|not) then "missing"
    elif $a.output==$b.output then "raw_equal"
    elif $x==null or $y==null then "unknown_format"
    elif $x==$y then "wrapper_only_difference"
    elif $x.exit!=$y.exit then "exit_changed"
    else "recorded_body_changed" end;
  def control:
    ("Chunk ID: a\nWall time: 0.1 seconds\nProcess exited with code 0\nOriginal token count: 1\nOutput:\nhello\n") as $a |
    ("Chunk ID: b\nWall time: 0.2 seconds\nProcess exited with code 0\nFinal output:\nhello\n") as $b |
    (classify({output:$a};{output:$b})=="wrapper_only_difference" and
     classify({output:$a};{output:($b+"world")})=="recorded_body_changed" and
     classify({output:$a};{output:($b|sub("code 0";"code 1"))})=="exit_changed" and
     classify({output:$a};{output:"plain text"})=="unknown_format");
  if (control|not) then {result:"control failed"}
  elif .status!=200 or (.body.data|type)!="array" then {result:"unexpected envelope"}
  else . as $r | .body.data as $d |
    ([$d[]|select(.type=="TOOL" and .metadata.repository=="lehater/napms-2" and
      (.metadata.issueId|tostring)=="126" and
      .metadata.runId=="b4263d71cb3a4d50965d29dd35b8d249" and
      .metadata.sourceSha=="5c5a0fb765fe87305c11553facbdb4a20bd6596c")]|length) as $exact |
    {status:200,rows:($d|length),unique_rows:($d|map(.id)|unique|length),
     exact_rows:$exact,more_pages:(($r.body.meta.cursor // "")!=""),
     control:"PASS"} as $coverage |
    if $coverage.rows!=232 or $coverage.unique_rows!=232 or $exact!=232 or $coverage.more_pages
    then $coverage + {result:"coverage mismatch; not evaluated"}
    else
      ($d|sort_by(.startTime,.id)|to_entries|map(.value+{ord:(.key+1)})) as $ordered |
      ($ordered|map(select((.name|present) and (.input|present)))) as $eligible |
      ($eligible|group_by([.name,.input])|map(select(length>1))) as $groups |
      ([$groups[]|sort_by(.ord)|. as $g|range(1;length) as $i|
        {previous:$g[$i-1].ord,current:$g[$i].ord,
         class:classify($g[$i-1];$g[$i]),
         same_session:(if ($g[$i-1].sessionId|present) and ($g[$i].sessionId|present)
           then $g[$i-1].sessionId==$g[$i].sessionId else null end)}]) as $pairs |
      if ($eligible|length)!=232 or ($groups|length)!=13 or ($pairs|length)!=38
      then $coverage + {result:"candidate cohort changed; not evaluated",eligible:($eligible|length),groups:($groups|length),pairs:($pairs|length)}
      else $coverage + {eligible:232,repeated_groups:13,pairs:38,
        classes:($pairs|group_by(.class)|map({class:.[0].class,count:length})),
        session_counts:($pairs|group_by(.same_session)|map({same_session:.[0].same_session,count:length})),
        evidence:$pairs}
      end
    end
  end' 2>/dev/null
```

Return safe JSON including evidence ordinals and classes, exit code and elapsed. No literal names, commands, output, session IDs or paths. Class wrapper_only_difference means both recognized recorded body and exit are exactly equal after removing known wrapper lines only; it is not proof full original output was equal or that the operation was redundant. Truncation and context remain unknown. Different recognized body/exit is recorded evidence of change, not evidence of necessity. Unknown format remains unknown; do not improvise other parsers. This exploratory prefilter is not Graphectory RV/SC. Coordinator decides whether candidate-specific interpretation is justified; no product/Harness change.