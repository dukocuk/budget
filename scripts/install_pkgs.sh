#!/bin/bash

# Budget App - Session Start Package Installation
# Ensures npm packages are installed at session start
# Robust version with proper error handling for startup hooks

# Function to check if npm is available
check_npm() {
  if ! command -v npm &> /dev/null; then
    echo "⚠️  npm not found in PATH, skipping package check"
    return 1
  fi
  return 0
}

# Function to check if we're in the right directory
check_project_root() {
  if [ ! -f "package.json" ]; then
    echo "⚠️  Not in project root (no package.json), skipping package check"
    return 1
  fi
  return 0
}

# Main execution with error handling
{
  echo "🔧 Checking npm packages..."

  # Verify npm is available
  if ! check_npm; then
    exit 0  # Silent exit if npm not available
  fi

  # Verify we're in project root
  if ! check_project_root; then
    exit 0  # Silent exit if not in project root
  fi

  # Check if node_modules exists
  if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm packages (first time setup)..."
    if npm install 2>&1 | grep -q "error"; then
      echo "⚠️  npm install encountered issues, but continuing..."
    else
      echo "✅ Packages installed successfully!"
    fi
  else
    echo "✅ Packages already installed"
  fi

  # Verify critical packages (non-blocking check)
  if [ ! -d "node_modules/react" ]; then
    echo "⚠️  Critical packages missing, attempting reinstall..."
    if npm install 2>&1 | grep -q "error"; then
      echo "⚠️  Reinstall had issues, but continuing..."
    else
      echo "✅ Packages reinstalled successfully!"
    fi
  fi

  echo "🚀 Environment ready!"
} || {
  # Catch-all error handler - never fail the hook
  echo "⚠️  Package check completed with warnings (non-critical)"
  exit 0
}
