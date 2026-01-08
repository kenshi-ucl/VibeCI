#!/bin/sh

# VibeCI Test Runner Script
# Runs tests in a reproducible environment and outputs structured JSON

set -e

REPO_PATH=${1:-/app/repo}
OUTPUT_PATH=${2:-/app/artifacts/test-output.json}

echo "=== VibeCI Test Runner ==="
echo "Repository: $REPO_PATH"
echo "Output: $OUTPUT_PATH"
echo ""

cd "$REPO_PATH"

# Check for package.json
if [ ! -f "package.json" ]; then
    echo '{"passed": false, "error": "No package.json found"}' > "$OUTPUT_PATH"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install --silent 2>&1 || true

# Run tests with JSON output
echo "Running tests..."
npm test -- --json --outputFile="$OUTPUT_PATH" 2>&1 || true

# Check if output was created
if [ -f "$OUTPUT_PATH" ]; then
    echo ""
    echo "=== Test Results ==="
    cat "$OUTPUT_PATH"
else
    # Create a basic result if Jest didn't output JSON
    npm test 2>&1 > /tmp/test-output.txt || true
    
    # Parse basic results
    PASSED=$(grep -c "PASS" /tmp/test-output.txt 2>/dev/null || echo "0")
    FAILED=$(grep -c "FAIL" /tmp/test-output.txt 2>/dev/null || echo "0")
    
    cat > "$OUTPUT_PATH" << EOF
{
    "passed": $( [ "$FAILED" = "0" ] && echo "true" || echo "false" ),
    "totalTests": $(( PASSED + FAILED )),
    "passedTests": $PASSED,
    "failedTests": $FAILED,
    "output": "$(cat /tmp/test-output.txt | head -100 | sed 's/"/\\"/g' | tr '\n' ' ')"
}
EOF
fi

echo ""
echo "=== Test Runner Complete ==="
