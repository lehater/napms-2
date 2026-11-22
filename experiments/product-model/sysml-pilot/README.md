# SysML v2 conceptual-model pilot

This experiment checks whether SysML v2 can express a small conceptual model of preparing, admitting, registering, and deciding an NAPMS `AccessRequest`. It focuses on domain objects and compositional functions; it intentionally excludes React, FastAPI, SQLite, and HTTP details. Existing material elsewhere under `experiments/product-model/` is outside this pilot and was left untouched.

The model is based on the current [Access Requests specification](../../../openspec/specs/access-requests/spec.md), [Access Decisions specification](../../../openspec/specs/access-decisions/spec.md), and implementation in `src/napms/use_cases.py`. The specification distinguishes source-only admission from permission: an accepted request starts PENDING; a later decision can be ALLOWED or DENIED; DENIED never creates a PolicyRule.

## Toolchain recorded for this run

- NAPMS commit: `780a0aa96fa1b730788f9bbd1a902020dcf9eadf`
- Validator: `validate-sysml 1.0.0`, repository commit `63abbd9fbc7851dc437d01b2dc07836b919770b8`
- OMG SysML v2 Pilot Implementation: release `2026-07`, artifact `jupyter-sysml-kernel 0.61.0` (pinned by the installed validator's `pom.xml`)
- Java: OpenJDK `21.0.13.1` (2026-11-17)
- Maven: Apache Maven `3.9.12`
- OMG language specification: SysML `2.0`

## Files

- `model.sysml` — conceptual model
- `negative/` — each file has one deliberate defect
- `report.md` — T01–T11 results and limitations
- `evidence/validator-results.txt` — exact validator diagnostics and exit codes

## Reproduce

Run from the repository root with the installed validator and Java 21+:

```sh
validate-sysml experiments/product-model/sysml-pilot/model.sysml
validate-sysml experiments/product-model/sysml-pilot/negative/syntax-error.sysml
validate-sysml experiments/product-model/sysml-pilot/negative/unresolved-reference.sysml
validate-sysml experiments/product-model/sysml-pilot/negative/type-mismatch.sysml
```

The valid model exits 0. Syntax and unresolved-reference cases exit 1. The type mismatch is reported as a warning and exits 0 by this Pilot Implementation; this is recorded as a validator limitation rather than treated as a hard failure.

Static validation checks syntax and selected model consistency only. It does not execute the business process or prove that registration cannot occur after failed admission.

## Sources

- [OMG SysML v2.0 specification](https://www.omg.org/spec/SysML/2.0/)
- [OMG SysML v2 release and model library](https://github.com/Systems-Modeling/SysML-v2-Release)
- [SysML v2 Pilot Implementation releases](https://github.com/Systems-Modeling/SysML-v2-Pilot-Implementation/releases)
- [DeciSym SysML v2 skill](https://github.com/DeciSym/sysmlv2-skill)
- [DeciSym validator](https://github.com/DeciSym/sysmlv2-validator)
