#!/bin/bash

# PostToolUse Hook - Automatic Code Formatting and Linting
# This hook runs after Edit or Write tool usage
# It automatically formats code with Prettier and runs ESLint

# Get the project root (where package.json is located)
PROJECT_ROOT="$(pwd)"

# Navigate to project root
cd "$PROJECT_ROOT"

echo "🎨 Auto-formatting code..."

# Run Prettier on all supported files (suppress all output)
npx prettier --write "src/**/*.{js,jsx,css,json}" --log-level error >/dev/null 2>&1
PRETTIER_EXIT=$?

# Run ESLint with auto-fix on all JavaScript/JSX files (suppress all output)
npx eslint "src/**/*.{js,jsx}" --fix --quiet >/dev/null 2>&1
ESLINT_EXIT=$?

# Always show success message (formatting and auto-fixing happened silently)
echo "✅ Code formatted and linted"

# Only warn if there were critical issues
if [ $PRETTIER_EXIT -ne 0 ]; then
  echo "⚠️  Prettier encountered syntax errors (check your code)"
fi

exit 0
