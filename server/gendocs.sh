#!/bin/bash
set -euo pipefail

generate_anchor() {
    echo "$1" | tr '/' '-'
}

echo "# Lemma Package Documentation"
echo ""
echo "Generated documentation for all packages in the Lemma project."
echo ""
echo "## Table of Contents"

PACKAGES=$(find . -type f -name "*.go" ! -name "*_test.go" -exec dirname {} \; | sort -u | grep -v "/\.")

for PKG in $PACKAGES; do
    PKG_PATH=${PKG#./}
    [ -z "$PKG_PATH" ] && continue
    ANCHOR=$(generate_anchor "$PKG_PATH")
    echo "- [$PKG_PATH](#$ANCHOR)"
done

echo ""

for PKG in $PACKAGES; do
    PKG_PATH=${PKG#./}
    [ -z "$PKG_PATH" ] && continue
    echo "## $PKG_PATH"
    echo ""
    echo '```go'
    go doc -all "./$PKG_PATH" | cat
    echo '```'
    echo ""
done