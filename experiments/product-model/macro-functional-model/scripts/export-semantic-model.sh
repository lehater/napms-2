#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
REPO=$(git -C "$HERE" rev-parse --show-toplevel)
MODEL=${1:-"$HERE/model.sysml"}
PACKAGE=${2:-NapmsMacroFunctionalModel}
OUTPUT=${3:-"$HERE/model.json"}
SUPPORT_MODEL=${4:-}
VALIDATOR_HOME=${SYSML_VALIDATOR_HOME:-}
if [ -z "$VALIDATOR_HOME" ]; then
    echo "Set SYSML_VALIDATOR_HOME to the sysmlv2-validator checkout." >&2
    exit 2
fi
LIBRARY="$VALIDATOR_HOME/target/sysml-download/sysml/sysml.library"
if [ ! -d "$LIBRARY" ]; then
    echo "SysML library not found at $LIBRARY; bootstrap the validator first." >&2
    exit 2
fi
OUTPUT=$(mkdir -p "$(dirname -- "$OUTPUT")" && cd "$(dirname -- "$OUTPUT")" && pwd)/$(basename -- "$OUTPUT")
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
if [ -n "$SUPPORT_MODEL" ]; then
    cat "$SUPPORT_MODEL" "$MODEL" > "$TMP/combined.sysml"
else
    cp "$MODEL" "$TMP/combined.sysml"
fi
mvn -q -f "$VALIDATOR_HOME/pom.xml" dependency:build-classpath -Dmdep.outputFile="$TMP/classpath"
javac -cp "$(cat "$TMP/classpath")" -d "$TMP" "$HERE/scripts/ExportSysML.java"
java -Dsysml.library="$LIBRARY" -cp "$TMP:$(cat "$TMP/classpath")" ExportSysML \
    "$TMP/combined.sysml" "$LIBRARY" "$PACKAGE" "$OUTPUT"
echo "Wrote $OUTPUT"
