# Independent audit preparation

Protocol read before arm inspection. Arm code and output remain uninspected during baseline preparation.

Pinned source: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/434b7f91364665f2f733b310ec54809bf8f37937/command.md
SHA256: d246b026f4f29b5823a9cc857f9edf3d2507002e055e32040cadeaf3b38e0234
Downloaded with curl -fL to vercel-command.md. Initial sandbox network attempt exit 7; escalated retry exit 0. Entire source reviewed. Source contains review rules/output format; no executable shell instructions, external payloads, credential requests or conflicting mutations. Applied as review guidance, interpreted in context: native links/buttons supply keyboard handlers; scroll containers are not automatically page overflow; presentational preferences are not automatically accessibility regressions.

Baseline preparation commands/results:
- git worktree add -b experiment/ui-baseline-20261109 /tmp/napms-ui-baseline 642a6f8f5d7e903641068887bd5a32ae6ea466d3: initial sandbox read-only .git failure; authorized retry exit 0.
- npm ci (web): sandbox esbuild spawnSync EPERM exit 1; authorized retry exit 0, added 96 packages, audited 103, 0 vulnerabilities. npm warns esbuild install script not yet covered by allowScripts.
- npm run dev -- --host 127.0.0.1 --port 5176: Vite 7.3.7 ready, session 32340.
- LD_LIBRARY_PATH=/tmp/napms-browser-libs/usr/lib/x86_64-linux-gnu node evidence/audit/capture.mjs baseline 5176: exit 0. Script preserved alongside measurements. Browser viewport/deviceScaleFactor=1; fresh page per state; networkidle; full-page screenshots. Native browser zoom default 100%; existing Sidebar unchanged.

Nine screenshots and raw geometry/24-key Tab sequences in baseline/. All document scrollWidth values equal viewport width. Nested scroll candidates retained verbatim, not automatically classified as defects. Object tabs keyboard reachable with visible 2px outlines: Tab 14–16 desktop, 13–15 narrow. Baseline lacks skip link; confirm comparative arms only after edit-ready signal.

Limitations: auditor is a separate delegated agent in the same task/tree, not an external human or isolated evaluation service. Parent task disclosed A/B assignment and skill sources, so complete blinding is impossible. Labels can be withheld from merit discussion but reviewer already knows experiment treatment. No agent token/cost telemetry or independent model/effort attestation is available; installed Codex CLI version does not prove delegated runtime version.
