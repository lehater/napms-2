# Disposable OpenCode pilot

This directory is an opt-in smoke fixture, not the repository's normal OpenCode configuration or an adopted SDLC role catalog. OpenCode does not auto-discover `pilot/opencode.jsonc`; the command below selects it for one run and redirects HOME/XDG data, config, state, cache, and temporary files to a temporary directory. The fixture uses the already-installed local `ollama/qwen3-coder:30b` model and does not load the persistent OpenCode auth store.

From the repository root, create the temporary directories first:

```sh
pilot_state="$(mktemp -d)"
mkdir -p "$pilot_state"/{home,config,data,state,cache,tmp}
env -i \
  PATH="$PATH" \
  HOME="$pilot_state/home" \
  XDG_CONFIG_HOME="$pilot_state/config" \
  XDG_DATA_HOME="$pilot_state/data" \
  XDG_STATE_HOME="$pilot_state/state" \
  XDG_CACHE_HOME="$pilot_state/cache" \
  TMPDIR="$pilot_state/tmp" \
  OPENCODE_CONFIG="$PWD/pilot/opencode.jsonc" \
  opencode --standalone run --agent orchestrator --model ollama/qwen3-coder:30b \
  "Run the bounded pilot through explore, planner, worker, validator, and reviewer in that order. The Worker may edit pilot/output.md only. Validator must run the configured checks; Reviewer must independently review and attempt its edit probe."
```

Do not add `--auto`. The Validator has a two-command shell allowlist; any other shell command requests approval. Worker can edit only `pilot/output.md`. Reviewer has `edit`, `shell`, and Code Mode denied. `pilot/check_output.py` checks the complete three-line contract; `pilot/test_check_output.py` covers both the valid file and a nonblank-line-2 negative case. The fixture defines an explicit `worker` subagent ID so delegation uses the same name as the role contract rather than relying on an implicit alias for General.
