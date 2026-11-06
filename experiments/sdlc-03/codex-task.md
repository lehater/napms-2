You are executing the *bounded* SDLC-03 Codex benchmark task for NAPMS 2.0 (Issue #9).

Source of truth: the current Git checkout. Follow AGENTS.md.

Read experiments/sdlc-03/contract.md and experiments/sdlc-03/check_public.py.
Implement ONLY experiments/sdlc-03/policy_csv.py to satisfy *all* requirements in contract.md, not only the public checks.

Constraints:
- Never edit src/, tests/, .github/, openspec/, contract.md, check_public.py, or AGENTS.md.
- No new dependencies, network calls, services, or changes outside the fixture.
- Do not push or commit. Do not run package installs.
- Aim for the smallest clear Python standard-library implementation, with explicit validation and no secret-bearing diagnostic output.

After implementation run exactly:
python -m unittest discover -s experiments/sdlc-03 -p 'check_public.py' -v

Final reply: identify the file changed, tests run and result, and any unmet or uncertain requirement. Report evidence, not self-assessed scores.