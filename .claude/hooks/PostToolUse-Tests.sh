#!/bin/bash

# PostToolUse Hook - Automatic Test Enforcement
# This hook runs after Edit or Write tool usage
# It automatically runs tests to ensure code changes don't break functionality

# Get the project root (where package.json is located)
PROJECT_ROOT="$(pwd)"

# Navigate to project root
cd "$PROJECT_ROOT"

# Get the file that was modified (if available from environment)
MODIFIED_FILE="${TOOL_INPUT_file_path:-}"

# Determine if we should run tests based on the modified file
SHOULD_RUN_TESTS=false

if [ -n "$MODIFIED_FILE" ]; then
  # Run tests if:
  # 1. A .js or .jsx file was modified
  # 2. A test file was modified
  # 3. A component, hook, or utility file was modified
  if [[ "$MODIFIED_FILE" =~ \.(js|jsx)$ ]] || \
     [[ "$MODIFIED_FILE" =~ \.test\.(js|jsx)$ ]] || \
     [[ "$MODIFIED_FILE" =~ src/(components|hooks|utils|contexts|lib)/ ]]; then
    SHOULD_RUN_TESTS=true
  fi
else
  # If we can't determine the file, run tests anyway to be safe
  SHOULD_RUN_TESTS=true
fi

# Exit early if we don't need to run tests
if [ "$SHOULD_RUN_TESTS" = false ]; then
  exit 0
fi

echo "🧪 Running tests..."

# Run tests once (no watch mode)
# Capture output for parsing
TEST_OUTPUT=$(npm test -- --run 2>&1)
TEST_EXIT_CODE=$?

# Parse the output for results
if [ $TEST_EXIT_CODE -eq 0 ]; then
  # Tests passed - extract test count
  TEST_COUNT=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passed)' | head -1)
  if [ -n "$TEST_COUNT" ]; then
    echo "✅ All tests passed ($TEST_COUNT tests)"
  else
    echo "✅ All tests passed"
  fi
else
  # Tests failed - show failure summary
  echo "❌ Tests failed!"
  echo ""

  # Show failed test files if available
  FAILED_FILES=$(echo "$TEST_OUTPUT" | grep "FAIL" | head -5)
  if [ -n "$FAILED_FILES" ]; then
    echo "$FAILED_FILES"
    echo ""
  fi

  # Show test summary line
  SUMMARY=$(echo "$TEST_OUTPUT" | grep -E "Test Files.*failed" | head -1)
  if [ -n "$SUMMARY" ]; then
    echo "$SUMMARY"
    echo ""
  fi

  echo "💡 Run 'npm test' to see full test output"
fi

# Always exit 0 to not block the workflow
# Users can fix test failures in subsequent edits
exit 0
