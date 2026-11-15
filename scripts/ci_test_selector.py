#!/usr/bin/env python3
"""Read-only fail-closed test impact plan. This module never executes or skips tests."""

import argparse
import hashlib
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / "ci/test-impact-map.json"


@dataclass(frozen=True)
class Change:
    status: str
    paths: tuple[str, ...]


def safe_path(value):
    if (not value or value.startswith("/") or "\\" in value
        or any(part in {"", ".", ".."} for part in value.split("/"))
        or any(ord(c) < 32 or ord(c) == 127 for c in value)):
        raise ValueError("unsafe repository path")
    return value


def parse_diff(raw):
    """Read git diff --name-status -z; two names for rename/copy statuses."""
    if not raw or not raw.endswith(b"\0"):
        raise ValueError("missing or unterminated diff")
    fields = raw[:-1].split(b"\0")
    entries, i = [], 0
    while i < len(fields):
        status = fields[i].decode("ascii")
        i += 1
        if not re.fullmatch(r"[ACDMRTUX](?:[0-9]{1,3})?", status):
            raise ValueError("unknown status")
        count = 2 if status[0] in "RC" else 1
        if i + count > len(fields):
            raise ValueError("incomplete file record")
        names = tuple(safe_path(x.decode("utf-8")) for x in fields[i:i + count])
        entries.append(Change(status, names))
        i += count
    if not entries:
        raise ValueError("empty change list")
    return tuple(entries)


def docs_path(path):
    if path == "README.md":
        return True
    if path.startswith("docs/"):
        return path.endswith(".md")
    if path.startswith(("openspec/changes/", "openspec/specs/")):
        return path.endswith(".md") or path.endswith("/.openspec.yaml")
    return False


def index_map(mapping):
    if mapping.get("schema_version") != 1:
        raise ValueError("unsupported mapping version")
    groups, rules, always = (mapping.get(x) for x in ("groups", "rules", "always"))
    if not isinstance(groups, dict) or not groups or not isinstance(rules, list) or not isinstance(always, list):
        raise ValueError("malformed groups, rules, or always set")
    for key, value in groups.items():
        if not isinstance(key, str) or not isinstance(value, dict):
            raise ValueError("malformed group")
        if value.get("kind") not in ("job", "command", "pytest", "playwright", "node"):
            raise ValueError("unsupported group type")
        targets = value.get("targets")
        if not isinstance(targets, list) or any(not isinstance(t, str) or not t for t in targets):
            raise ValueError("invalid targets")
        if value["kind"] in ("pytest", "playwright", "node") and not targets:
            raise ValueError("test group without targets")
    if any(not isinstance(x, str) or x not in groups for x in always):
        raise ValueError("unknown mandatory group")
    by_path = {}
    for item in rules:
        if not isinstance(item, dict):
            raise ValueError("invalid mapping rule")
        paths, contracts, required = (item.get(x) for x in ("paths", "contracts", "groups"))
        if (not isinstance(paths, list) or not paths
            or not isinstance(contracts, list) or not contracts
            or not isinstance(required, list) or not required
            or any(not isinstance(c, str) or not c for c in contracts)
            or any(not isinstance(g, str) or g not in groups for g in required)):
            raise ValueError("invalid mapping references")
        for path in paths:
            if not isinstance(path, str):
                raise ValueError("invalid path type")
            safe_path(path)
            if path in by_path or docs_path(path):
                raise ValueError("duplicate or ambiguous mapping path")
            by_path[path] = item
    return groups, by_path


def describe(groups, group_ids, reasons):
    return [
        {"id": name, "kind": groups[name]["kind"],
         "targets": groups[name]["targets"],
         "reasons": sorted(set(reasons.get(name, ["No mapped changed contract"])))}
        for name in sorted(group_ids)
    ]


def select(changes, mapping, sha="unknown", mapping_sha="unknown", target_exists=lambda p: True):
    """Return deterministic selection; uncertainty implies FULL, never empty success."""
    reasons, impacted, why = set(), set(), {}
    try:
        groups, by_path = index_map(mapping)
        required = set(mapping["always"])
        for group in required:
            why.setdefault(group, []).append("Always-required invariant")
        if not changes:
            reasons.add("No change records")
        for change in changes:
            if change.status not in ("M", "A") or len(change.paths) != 1:
                reasons.add("Unknown, deleted or renamed input: " + change.status)
                continue
            path = safe_path(change.paths[0])
            if docs_path(path):
                impacted.add("documentation-and-specification")
                continue
            rule = by_path.get(path)
            if rule is None:
                reasons.add("Unmapped file: " + path)
                continue
            impacted.update(rule["contracts"])
            for group in rule["groups"]:
                required.add(group)
                why.setdefault(group, []).append("Changed: " + path)
        if not reasons:
            for name in required:
                if groups[name]["kind"] in ("pytest", "playwright", "node"):
                    for target in groups[name]["targets"]:
                        if not target_exists(target):
                            reasons.add("Missing test target: " + name + " / " + target)
    except (ValueError, TypeError, KeyError, AttributeError) as exc:
        groups = mapping.get("groups") if isinstance(mapping.get("groups"), dict) else {}
        required = set()
        reasons.add("Invalid mapping: " + type(exc).__name__)
    mode = "SELECTED"
    if reasons:
        mode = "FULL"
        required = set(groups)
        impacted.add("all-contracts")
        for name in required:
            why.setdefault(name, []).append("Fail-closed FULL fallback")
    return {
        "schema_version": 1, "policy": "SHADOW_ONLY", "candidate_sha": sha,
        "mapping_sha256": mapping_sha, "mode": mode, "full_reasons": sorted(reasons),
        "changes": [{"status": x.status, "paths": list(x.paths)} for x in changes],
        "contracts": sorted(impacted),
        "selected_groups": describe(groups, required, why),
        "excluded_groups": describe(groups, set(groups) - required, {}),
    }


def fail_plan(reason, sha):
    return {
        "schema_version": 1, "policy": "SHADOW_ONLY", "candidate_sha": sha,
        "mapping_sha256": "unavailable", "mode": "FULL", "full_reasons": [reason],
        "changes": [], "contracts": ["all-contracts"],
        "selected_groups": [{"id": "ALL", "kind": "fallback", "targets": [], "reasons": [reason]}],
        "excluded_groups": [],
    }


def markdown(plan):
    quote = chr(96)
    esc = lambda value: str(value).replace("|", r"\|").replace("\n", " ").replace("<", "&lt;")
    lines = [
        "### Test Impact Analysis: SHADOW only",
        "",
        "Proposed plan: " + quote + plan["mode"] + quote + ". Actual CI checks are unchanged.",
        "",
        "Candidate: " + quote + esc(plan["candidate_sha"]) + quote,
        "",
        "| Planned group | Reason |", "|---|---|",
    ]
    for item in plan["selected_groups"]:
        lines.append("| " + quote + esc(item["id"]) + quote + " | " + "; ".join(esc(x) for x in item["reasons"]) + " |")
    lines.append("")
    lines.append("Proposed exclusions: " + (
        ", ".join(quote + esc(x["id"]) + quote for x in plan["excluded_groups"]) or "none"))
    if plan["full_reasons"]:
        lines.append("FULL fallback: " + "; ".join(esc(x) for x in plan["full_reasons"]))
    lines.extend(["", "No tests are actually skipped by this selector.", ""])
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base", required=True)
    ap.add_argument("--head", required=True)
    ap.add_argument("--mapping", type=Path, default=MAP)
    ap.add_argument("--json-output", type=Path)
    ap.add_argument("--summary-file", type=Path)
    args = ap.parse_args()
    try:
        sha = subprocess.check_output(
            ["git", "rev-parse", "--verify", args.head + "^{commit}"],
            cwd=ROOT, stderr=subprocess.PIPE, text=True,
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        sha = "unavailable"
    try:
        raw = args.mapping.read_bytes()
        mapping = json.loads(raw)
        if not isinstance(mapping, dict):
            raise ValueError("mapping must be an object")
        change_data = subprocess.check_output(
            ["git", "diff", "--name-status", "--find-renames", "-z",
             args.base, args.head, "--"], cwd=ROOT, stderr=subprocess.PIPE,
        )
        plan = select(parse_diff(change_data), mapping, sha=sha,
                      mapping_sha=hashlib.sha256(raw).hexdigest(),
                      target_exists=lambda p: (ROOT / p).exists())
    except (OSError, ValueError, UnicodeError, subprocess.CalledProcessError) as exc:
        plan = fail_plan("Untrusted selector input: " + type(exc).__name__, sha)
    encoded = json.dumps(plan, indent=2, sort_keys=True, ensure_ascii=True) + "\n"
    print(encoded)
    if args.json_output:
        args.json_output.write_text(encoded, encoding="utf-8")
    if args.summary_file:
        with args.summary_file.open("a", encoding="utf-8") as output:
            output.write(markdown(plan))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
