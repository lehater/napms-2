#!/usr/bin/env python3
"""Extract action definitions and typed parameters from the SysML semantic JSON."""
import json
import pathlib
import sys

source = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "model.json")
target = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "functional-projection.md")
package_name = sys.argv[3] if len(sys.argv) > 3 else "NapmsMacroFunctionalModel"
data = json.loads(source.read_text())
payloads = [entry.get("payload", {}) for entry in data]
by_id = {entry["identity"]["@id"]: entry.get("payload", {}) for entry in data if "identity" in entry}

def references(value):
    if isinstance(value, dict):
        value = [value]
    if not isinstance(value, list):
        return []
    return [item["@id"] for item in value if isinstance(item, dict) and "@id" in item]

def name(ref):
    item = by_id.get(ref, {})
    return item.get("name") or item.get("declaredName") or f"unresolved:{ref}"

package_id = next((entry["identity"]["@id"] for entry in data
                   if entry.get("payload", {}).get("@type") == "Package"
                   and entry["payload"].get("name") == package_name), None)
actions = [p for p in payloads if p.get("@type") == "ActionDefinition"
           and p.get("isLibraryElement") is not True
           and package_id in references(p.get("owningNamespace"))]
lines = ["# Extracted SysML action definitions", "", f"Source: `{source}`", "",
         "This is a mechanical projection of exported semantic JSON, not a substitute for model review.", ""]
for action in sorted(actions, key=lambda item: item.get("name", "")):
    lines += [f"## {action.get('name', '(unnamed)')}", ""]
    for direction in ("input", "output"):
        parameters = []
        for ref in references(action.get(direction)):
            feature = by_id.get(ref, {})
            types = ", ".join(name(type_ref) for type_ref in references(feature.get("type"))) or "(untyped)"
            parameters.append(f"`{name(ref)} : {types}`")
        lines.append(f"- {direction.title()}: " + (", ".join(parameters) if parameters else "none"))
    lines.append("")
target.write_text("\n".join(lines))
print(f"Wrote {target} ({len(actions)} action definitions)")
