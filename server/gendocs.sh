#!/bin/bash

set -euo pipefail

# Function to generate anchor from package path
generate_anchor() {
    echo "$1" | tr '/' '-'
}

# Create documentation file
echo "# Lemma Package Documentation

Generated documentation for all packages in the Lemma project.

## Table of Contents
" > documentation.md

# Find all directories containing .go files (excluding test files)
# Sort them for consistent output
PACKAGES=$(find . -type f -name "*.go" ! -name "*_test.go" -exec dirname {} \; | sort -u | grep -v "/\.")

# Generate table of contents
for PKG in $PACKAGES; do
    # Strip leading ./
    PKG_PATH=${PKG#./}
    # Skip if empty
    [ -z "$PKG_PATH" ] && continue
    
    ANCHOR=$(generate_anchor "$PKG_PATH")
    echo "- [$PKG_PATH](#$ANCHOR)" >> documentation.md
done

echo "" >> documentation.md

# Generate documentation for each package
for PKG in $PACKAGES; do
    # Strip leading ./
    PKG_PATH=${PKG#./}
    # Skip if empty
    [ -z "$PKG_PATH" ] && continue
    
    echo "## $PKG_PATH" >> documentation.md
    echo "" >> documentation.md
    echo '```go' >> documentation.md
    go doc -all "./$PKG_PATH" >> documentation.md
    echo '```' >> documentation.md
    echo "" >> documentation.md
done

echo "Documentation generated in documentation.md"