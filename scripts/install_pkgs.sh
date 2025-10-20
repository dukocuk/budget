#!/bin/bash

# Budget App - Session Start Package Installation
# Ensures npm packages are installed at session start

set -e  # Exit on error

echo "🔧 Checking npm packages..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm packages (first time setup)..."
  npm install
  echo "✅ Packages installed successfully!"
else
  echo "✅ Packages already installed, skipping..."
fi

# Verify critical packages
if [ ! -d "node_modules/react" ]; then
  echo "⚠️  Critical packages missing, reinstalling..."
  npm install
  echo "✅ Packages reinstalled successfully!"
fi

echo "🚀 Environment ready!"
