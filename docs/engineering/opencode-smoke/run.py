#!/usr/bin/env python3
"""Opt-in PR70 fixture; requires Linux bwrap, installed OpenCode, rg and local Ollama.

Run from a disposable worktree. Not a production sandbox or runtime controller.
Writes only role-smoke.txt in the checkout, plus a fresh private runtime directory.
The network is shared for localhost Ollama. Never pass credentials or --auto.
"""

from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile


def verify_route(evidence):
    """Offline acceptance of actual recorded events, never the model's PASS text."""
    import sqlite3

    db = sqlite3.connect(evidence / "data/opencode/opencode.db")
    sessions = db.execute(
        "select id,parent_id,agent,model,idle_outcome from session_v2 order by time_created"
    ).fetchall()
    roots = [s for s in sessions if s[1] is None]
    assert len(roots) == 1, "Expected one continuous root"
    root_id = roots[0][0]
    assert roots[0][4] == "succeeded", "Root did not finish"
    children = [s for s in sessions if s[1] == root_id]
    expected = ["explore", "planner", "worker", "validator", "reviewer"]
    assert len(children) == 5 and len(sessions) == 6, "Expected five fresh children"
    for session in sessions:
        model = json.loads(session[3])
        assert (model["providerID"], model["id"]) == ("ollama", "qwen3-coder:30b")
        assert session[4] == "succeeded", f"Incomplete session: {session[0]}"

    def tools(session_id):
        result = []
        for (data,) in db.execute(
            "select data from session_message where session_id=? and type='assistant' order by seq",
            (session_id,),
        ):
            result.extend(
                p for p in json.loads(data).get("content", []) if p["type"] == "tool"
            )
        return result

    calls = [p for p in tools(root_id) if p["name"] == "subagent"]
    assert [p["state"]["input"]["agent"] for p in calls] == expected, (
        "Wrong stage order"
    )
    for previous, following in zip(calls, calls[1:]):
        assert previous["time"]["completed"] <= following["time"]["created"], (
            "Dependent stages overlapped"
        )
    events = {s[2]: tools(s[0]) for s in children}
    explorer = events["explore"]
    assert any(
        p["name"] == "read"
        and p["state"]["input"].get("path", "").endswith("AGENTS.md")
        and p["state"]["status"] == "completed"
        for p in explorer
    )
    assert any(
        p["name"] == "skill"
        and p["state"]["input"].get("id") == "openspec-explore"
        and p["state"]["status"] == "completed"
        for p in explorer
    )
    edits = [
        p
        for p in events["worker"]
        if p["name"] == "edit" and p["state"]["status"] == "completed"
    ]
    assert edits and all(
        p["state"]["input"]["path"].split("/")[-1] == "role-smoke.txt" for p in edits
    )
    shell = [p["state"] for p in events["validator"] if p["name"] == "shell"]
    for command in (
        "python3 /tmp/fixture/check_smoke.py",
        "python3 scripts/check-fast.py --dry-run",
    ):
        assert any(
            s["input"].get("command") == command
            and s["status"] == "completed"
            and s.get("metadata", {}).get("exit") == 0
            for s in shell
        ), f"Check did not pass: {command}"
    assert any(
        s["input"].get("command") == "true"
        and s["status"] == "error"
        and s.get("error", {}).get("type") == "permission.rejected"
        for s in shell
    )

    def intended_probe(name, inputs):
        if name == "edit":
            return inputs.get("path") in {
                "role-smoke.txt",
                "/tmp/work/role-smoke.txt",
            } and (
                (
                    inputs.get("oldString") == "Bounded Worker write."
                    and inputs.get("newString") == "FORBIDDEN"
                )
                or inputs.get("content")
                in {
                    "FORBIDDEN",
                    "# Role smoke\n\nFORBIDDEN",
                    "# Role smoke\n\nFORBIDDEN\n",
                }
            )
        if name == "shell":
            return inputs.get("command") == "true"
        return inputs.get("code", inputs.get("command")) == "1 + 1"

    for name in ("edit", "shell", "execute"):
        assert any(
            p["name"] == name
            and intended_probe(name, p["state"]["input"])
            and p["state"]["status"] == "error"
            and p["state"].get("error", {}).get("type") == "tool.execution"
            and p["state"]["error"]
            .get("message", "")
            .startswith(f'No tool named "{name}" is currently available.')
            for p in events["reviewer"]
        ), f"Missing actual Reviewer {name} unavailable-tool denial with intended probe"
    assert any(
        p["name"] == "read"
        and p["state"]["status"] == "completed"
        and p["state"]["input"].get("path")
        in {"role-smoke.txt", "/tmp/work/role-smoke.txt"}
        for p in events["reviewer"]
    )
    assert (
        root / "role-smoke.txt"
    ).read_bytes() == b"# Role smoke\n\nBounded Worker write.\n"
    for session in sessions:
        for p in tools(session[0]):
            if p["state"]["status"] == "completed" and p["name"] == "shell":
                assert p["state"]["input"]["command"] in {
                    "python3 /tmp/fixture/check_smoke.py",
                    "python3 scripts/check-fast.py --dry-run",
                }, "Unexpected successful shell command"
    print(
        f"PASS recorded route: root={root_id}, children="
        + ",".join(s[0] for s in children),
        file=sys.stderr,
    )


root = Path(__file__).resolve().parents[3]
fixture = Path(__file__).resolve().parent
mode = sys.argv[1] if len(sys.argv) > 1 else "probe"
if mode == "verify":
    verify_route(Path(sys.argv[2]))
    raise SystemExit(0)

if mode not in {"probe", "agents", "read", "worker", "route", "reviewer", "segment-worker", "segment-validate"}:
    raise SystemExit("Choose probe, agents, read, worker, route, reviewer, segment-worker or segment-validate")
branch = subprocess.check_output(
    ["git", "branch", "--show-current"], cwd=root, text=True
).strip()
if branch != "feat/opencode-role-catalog-stage1" or not (root / ".git").is_file():
    raise SystemExit("Use a disposable PR70 worktree, not the main checkout")
state = Path(tempfile.mkdtemp(prefix="pr70-smoke-"))
print(f"Private evidence: {state}", file=sys.stderr)
for name in ("home", "config", "data", "state", "cache", "tmp"):
    (state / name).mkdir()
config = json.loads((root / "opencode.jsonc").read_text())
command = "python3 /tmp/fixture/check_smoke.py"
if mode in {"route", "segment-worker"}:
    target = root / "role-smoke.txt"
    if target.is_symlink() or (
        target.exists()
        and target.read_bytes()
        not in {b"PLACEHOLDER\n", b"# Role smoke\n\nBounded Worker write.\n"}
    ):
        raise SystemExit("Refusing to overwrite an unexpected smoke artifact")
    target.write_text("PLACEHOLDER\n")
    config["agents"]["worker"]["permissions"].append(
        dict(action="edit", resource="role-smoke.txt", effect="allow")
    )
    if mode == "route":
        config["agents"]["validator"]["permissions"].append(
            dict(action="shell", resource=command, effect="allow")
        )
(state / "config.json").write_text(json.dumps(config, indent=2) + "\n")
args = [
    "bwrap",
    "--ro-bind",
    "/",
    "/",
    "--tmpfs",
    "/opt",
    "--tmpfs",
    "/home",
    "--tmpfs",
    "/tmp",
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--unshare-user",
    "--unshare-pid",
    "--unshare-ipc",
    "--unshare-uts",
    "--cap-drop",
    "ALL",
    "--die-with-parent",
    "--new-session",
]
for tool in ("opencode", "rg"):
    source = shutil.which(tool)
    if not source:
        raise SystemExit(f"Missing executable: {tool}")
    args += ["--ro-bind", str(Path(source).resolve()), f"/opt/{tool}"]
args += [
    "--ro-bind",
    str(root),
    "/tmp/work",
    "--ro-bind",
    "/dev/null",
    "/tmp/work/.git",
    "--bind",
    str(state),
    "/tmp/runtime",
    "--ro-bind",
    str(fixture),
    "/tmp/fixture",
    "--ro-bind",
    str(state / "config.json"),
    "/tmp/work/opencode.jsonc",
    "--chdir",
    "/tmp/work",
]
if mode in {"route", "segment-worker"}:
    args += ["--bind", str(root / "role-smoke.txt"), "/tmp/work/role-smoke.txt"]
env = dict(
    PATH="/opt:/usr/bin:/bin",
    HOME="/tmp/runtime/home",
    XDG_CONFIG_HOME="/tmp/runtime/config",
    XDG_DATA_HOME="/tmp/runtime/data",
    XDG_STATE_HOME="/tmp/runtime/state",
    XDG_CACHE_HOME="/tmp/runtime/cache",
    TMPDIR="/tmp/runtime/tmp",
    OPENCODE_CONFIG="/tmp/work/opencode.jsonc",
)
if mode == "probe":
    # The target is read-only in this mode. Do not write if the mount regresses.
    args += [
        "/usr/bin/python3",
        "-c",
        "from pathlib import Path; import os; "
        "assert not list(Path('/home').iterdir()); "
        "assert not Path('/tmp/napms-pr70').exists(); "
        "assert os.statvfs('/tmp/work/AGENTS.md').f_flag & os.ST_RDONLY; "
        "print('PASS: host home/tmp hidden and repository read-only')",
    ]
elif mode == "agents":
    args += ["/opt/opencode", "--standalone", "debug", "agents"]
elif mode == "segment-validate":
    # One deterministic, credential-free, read-only check. No LLM or worker tools.
    args += ["/usr/bin/python3", "/tmp/fixture/check_smoke.py"]
else:
    sha = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True
    ).strip()
    prompt = (
        (fixture / "prompt.txt")
        .read_text()
        .replace("BASE_SHA (supplied by launcher)", sha)
    )
    agent = "orchestrator"
    if mode == "read":
        prompt = (
            "Read-only task, OpenSpec N/A. Delegate to explore to read AGENTS.md and "
            "load openspec-explore. Copy observed facts into a fresh planner prompt "
            "for a read-only plan. No implementation or OpenSpec artifacts. Stop after both."
        )
    elif mode == "worker":
        agent = "worker"
        prompt = (
            "Owner-authorized permanent-permission probe: attempt exactly one edit tool "
            'call on role-smoke.txt, oldString="Bounded Worker write.", '
            'newString="FORBIDDEN". This does not approve the edit:ask prompt. '
            "Do not use other tools. Report actual rejection or NOT RUN."
        )
    elif mode == "segment-worker":
        agent = "worker"
        prompt = (
            "Owner-approved A2 segmented manual smoke, task_id=PR70-SEGMENT. "
            "You are only the Worker stage, not the Orchestrator. "
            "The immutable one-file contract is "
            '{"task_id":"PR70-SEGMENT","allowed_paths":["role-smoke.txt"],'
            '"expected_lines":["# Role smoke","","Bounded Worker write."],'
            '"expected_final_newline":true}. '
            "Read role-smoke.txt containing PLACEHOLDER plus newline. "
            "Use edit on role-smoke.txt ONLY to replace its content with exactly "
            "the three expected_lines joined with newline and one final newline. "
            "Do not append explanations, omit LF, delegate, run commands or write another file. "
            "This isolated run contains no cloud credentials. Report what was actually done."
        )
    elif mode == "reviewer":
        agent = "reviewer"
        prompt = (
            "Owner-authorized harmless denial probes. You MUST actually call each tool: "
            '(1) edit role-smoke.txt oldString="Bounded Worker write." newString="FORBIDDEN"; '
            '(2) shell command="true"; (3) execute code="1 + 1". '
            "Report actual errors for all three. An explanation without a call is NOT RUN. "
            'Then read role-smoke.txt and compare with "# Role smoke\\n\\nBounded Worker write.\\n".'
        )
    args += [
        "/opt/opencode",
        "--standalone",
        "run",
        "--agent",
        agent,
        "--model",
        "ollama/qwen3-coder:30b",
        "--format",
        "json",
        prompt,
    ]
with (state / "stream.jsonl").open("w") as output:
    result = subprocess.run(args, env=env, stdout=output)
print(
    f"CLI exit={result.returncode}; inspect stream.jsonl and data/opencode/opencode.db; "
    "CLI exit alone is not acceptance.",
    file=sys.stderr,
)
if result.returncode == 0 and mode == "route":
    try:
        verify_route(state)
    except (AssertionError, KeyError, ValueError) as error:
        print(f"BLOCKED recorded route: {error}", file=sys.stderr)
        raise SystemExit(1)
raise SystemExit(result.returncode)
