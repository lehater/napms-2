# F17 — Skill utilization, preliminary method

Sources: [SkillsBench 1.1](https://www.skillsbench.ai/blogs/skillsbench-1-1), invocation measured separately from paired outcome evaluation (46–99% across 18 configurations); [SWE-Skills-Bench](https://arxiv.org/abs/2603.15401), preliminary preprint, 39/49 skills with zero pass-rate improvement; [OpenAI skill eval guidance](https://developers.openai.com/blog/eval-skills). Adopt invocation evidence screening only; no claim of replication, utilization rate, or local skill lift.

Separate applicability, runtime availability/discovery, invocation, conformance, effect. The applicable skill for #126 is [execute-task at its recorded base](https://github.com/lehater/napms-2/blob/5c5a0fb765fe87305c11553facbdb4a20bd6596c/.agents/skills/execute-task/SKILL.md), verified by coordinator using GitHub. Its presence in source does not prove historical runtime discovery. A read of the skill is evidence of exposure, not proof of compliance. Absence of markers is unknown (prior context, implicit/native loading, incomplete trace, paths and formatting may differ). F16/run-005 reports reading an installed skill, but that is a separate owner-relayed statement, not a ground-truth trace control.

## Run-001

One exact-attempt query reusing the successful [F02/run-004 plan](../F02-pattern-detection/run-004-plan.md), identical cohort, expected 232 TOOL observations. Owner launch authorizes this narrow local-only read/projection of #126 TOOL I/O; raw trace, raw errors, arbitrary metadata, credentials, host, commands, paths, and session/trace/observation IDs must not appear in output. Read-only, no retries, no new files or tools, no edits or commits by executor. Previous worktree/current session, low reasoning, 3 minutes. Use canonical .ai/langfuse-read-access.md from origin/main; no additional capability GET. Local synthetic control and jq compile check before query. Keep CLI and jq exit codes separate. The command below has not been executed by coordinator against local runtime. If local preflight fails, return its safe status without attempting GET. No generic parser.

```bash
(
set +x
set -euo pipefail
projection=$(cat <<'JQ'
def present: . != null and . != "" and . != {} and . != [];
def pathref: tostring | contains("execute-task/SKILL.md");
def contentref: tostring | (contains("name: execute-task") and contains("Execute a prepared NAPMS GitHub Issue"));
def control: ("cat .agents/skills/execute-task/SKILL.md"|pathref) and
  (("cat other/SKILL.md"|pathref)|not) and
  ("name: execute-task\ndescription: Execute a prepared NAPMS GitHub Issue"|contentref);
if (control|not) then {result:"control failed"}
elif .status != 200 or (.body.data|type) != "array" then {result:"unexpected envelope"}
else
  . as $r | .body.data as $d |
  ([$d[]|select(.type=="TOOL" and .metadata.repository=="lehater/napms-2" and
    (.metadata.issueId|tostring)=="126" and
    .metadata.runId=="b4263d71cb3a4d50965d29dd35b8d249" and
    .metadata.sourceSha=="5c5a0fb765fe87305c11553facbdb4a20bd6596c")]|length) as $exact |
  {status:200,rows:($d|length),unique_rows:($d|map(.id)|unique|length),exact_rows:$exact,
    more_pages:(($r.body.meta.cursor // "")!=""),control:"PASS"} as $c |
  if $c.rows!=232 or $c.unique_rows!=232 or $exact!=232 or $c.more_pages
  then $c+{result:"coverage mismatch; not evaluated"}
  else
    ($d|sort_by(.startTime,.id)|to_entries|map(.value+{ord:(.key+1)})) as $ordered |
    ($ordered|map({ordinal:.ord,path_in_input:(.input|pathref),
      skill_text_in_output:(.output|contentref)})
      | map(select(.path_in_input or .skill_text_in_output))) as $hits |
    $c+{inputs_present:([$d[]|select(.input|present)]|length),
      outputs_present:([$d[]|select(.output|present)]|length),
      markers:$hits}
  end
end
JQ
)
if ! jq -n -e "$projection | .result == \"unexpected envelope\"" >/dev/null 2>&1; then
  printf '%s\n' '{"result":"local projection preflight failed; no request made"}'
  exit 1
fi
LANGFUSE_BASE_URL="$(jq -er '.base_url | strings | select(length > 0)' ~/.codex/langfuse.json 2>/dev/null)" || { echo '{"result":"base_url configuration read failed"}'; exit 1; }
LANGFUSE_PUBLIC_KEY="$(jq -er '.public_key | strings | select(length > 0)' ~/.codex/langfuse.json 2>/dev/null)" || { echo '{"result":"public_key configuration read failed"}'; exit 1; }
LANGFUSE_SECRET_KEY="$(jq -er '.secret_key | strings | select(length > 0)' ~/.codex/langfuse.json 2>/dev/null)" || { echo '{"result":"secret_key configuration read failed"}'; exit 1; }
export LANGFUSE_BASE_URL LANGFUSE_PUBLIC_KEY LANGFUSE_SECRET_KEY
set +e
langfuse --api-version 4 api observations list \
  --limit 1000 --type TOOL --fields core,basic,metadata,io \
  --from-start-time 2026-11-18T00:00:00Z \
  --to-start-time 2026-11-22T00:00:00Z \
  --filter '[{"type":"stringObject","column":"metadata","key":"repository","operator":"=","value":"lehater/napms-2"},{"type":"stringObject","column":"metadata","key":"issueId","operator":"=","value":"126"},{"type":"stringObject","column":"metadata","key":"runId","operator":"=","value":"b4263d71cb3a4d50965d29dd35b8d249"}]' \
  --json 2>/dev/null | jq -e "$projection" 2>/dev/null
st=("${PIPESTATUS[@]}")
printf '{"cli_exit":%d,"jq_exit":%d}\n' "${st[0]}" "${st[1]}"
if (( st[0] != 0 || st[1] != 0 )); then exit 1; fi
)
```

Return only the safe projected JSON, separate stage exit codes and elapsed time. Marker ordinals identify TOOL observations, ties arbitrary. A path hit could represent lookup, listing, editing, or echo rather than read. Content signature could be quoted text; both in same observation strengthen the candidate but still need semantic evidence to establish an actual read. Zero hits does not establish missed invocation; no skill-effect conclusion. Stop after this probe and coordinator review.