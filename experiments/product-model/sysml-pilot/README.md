# SysML v2 conceptual-model pilot

This experiment checks whether SysML v2 can express a small conceptual model of preparing, admitting, registering, and deciding an NAPMS `AccessRequest`. It focuses on domain objects and compositional functions; it intentionally excludes React, FastAPI, SQLite, and HTTP details. Existing material elsewhere under `experiments/product-model/` is outside this pilot and was left untouched.

The model is based on the current [Access Requests specification](../../../openspec/specs/access-requests/spec.md), [Access Decisions specification](../../../openspec/specs/access-decisions/spec.md), and implementation in `src/napms/use_cases.py`. The specification distinguishes source-only admission from permission: an accepted request starts PENDING; a later decision can be ALLOWED or DENIED; DENIED never creates a PolicyRule.

## Toolchain

- Initial run NAPMS commit: `780a0aa96fa1b730788f9bbd1a902020dcf9eadf`
- Follow-up source NAPMS commit: `b21fd63234cce8e1d91f0af1dcf3718cf7033944`
- Validator: `validate-sysml 1.0.0`, repository commit `63abbd9fbc7851dc437d01b2dc07836b919770b8`
- OMG SysML v2 Pilot Implementation: release `2026-07`, artifact `jupyter-sysml-kernel 0.61.0` (pinned by the installed validator's `pom.xml`)
- Matching SysML-v2-Release tag commit: `29a3d2acdd49600cff872e7a55962a40400f3335`
- Java: OpenJDK `21.0.13.1` (2026-11-17)
- Maven: Apache Maven `3.9.12`
- OMG language specification: SysML `2.0`

## Files

- `model.sysml` — conceptual model
- `negative/` — each file has one deliberate defect
- `report.md` — initial and follow-up T01–T11 results and limitations
- `evidence/validator-results.txt` — preserved diagnostics from the initial run
- `evidence/followup-validator-results.txt` — new diagnostics from the follow-up run

## Reproduce

Run from the repository root with the installed validator and Java 21+:

```sh
validate-sysml experiments/product-model/sysml-pilot/model.sysml
validate-sysml experiments/product-model/sysml-pilot/negative/syntax-error.sysml
validate-sysml experiments/product-model/sysml-pilot/negative/unresolved-reference.sysml
validate-sysml experiments/product-model/sysml-pilot/negative/type-mismatch.sysml
```

The valid model exits 0. Syntax and unresolved-reference cases exit 1. The type mismatch is reported as a warning and exits 0 by this Pilot Implementation; the warning is reported separately from errors.

Static validation checks syntax and selected model consistency only. It does not execute the business process or prove that registration cannot occur after failed admission.

## Sources

- [OMG SysML v2.0 specification](https://www.omg.org/spec/SysML/2.0/)
- [OMG SysML v2 release and model library](https://github.com/Systems-Modeling/SysML-v2-Release)
- [SysML-v2-Release examples at tag 2026-07](https://github.com/Systems-Modeling/SysML-v2-Release/tree/2026-07/sysml/src/examples/Simple%20Tests)
- [`ActionTest.sysml`](https://github.com/Systems-Modeling/SysML-v2-Release/blob/2026-07/sysml/src/examples/Simple%20Tests/ActionTest.sysml) — action composition and `bind`
- [`DecisionTest.sysml`](https://github.com/Systems-Modeling/SysML-v2-Release/blob/2026-07/sysml/src/examples/Simple%20Tests/DecisionTest.sysml) — `decide`, conditional successions, and `else`
- [`StateTest.sysml`](https://github.com/Systems-Modeling/SysML-v2-Release/blob/2026-07/sysml/src/examples/Simple%20Tests/StateTest.sysml) — state definitions and transitions
- [`ConstraintTest.sysml`](https://github.com/Systems-Modeling/SysML-v2-Release/blob/2026-07/sysml/src/examples/Simple%20Tests/ConstraintTest.sysml) — `assert constraint` usage and bindings
- [SysML v2 Pilot Implementation releases](https://github.com/Systems-Modeling/SysML-v2-Pilot-Implementation/releases)
- [DeciSym SysML v2 skill](https://github.com/DeciSym/sysmlv2-skill)
- [DeciSym validator](https://github.com/DeciSym/sysmlv2-validator)
