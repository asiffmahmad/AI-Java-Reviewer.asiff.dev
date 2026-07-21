#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting build process for AI Java Reviewer..."

# -----------------------------------------------------------------------------
# VERSION BUMPING
# 
#codeReview/package.json
# The extension's version is officially stored in package.json at the top.
# However, you DO NOT need to manually edit package.json! 
# 
# You can pass a version argument directly to this script:
#   ./build.sh patch   (e.g., bumps 1.2.3 -> 1.2.4)
#   ./build.sh minor   (e.g., bumps 1.2.3 -> 1.3.0)
#   ./build.sh 2.0.0   (explicitly sets version to 2.0.0)
#
# The script will automatically open package.json, update the version, 
# and then package the new artifact.
# -----------------------------------------------------------------------------
if [ ! -z "$1" ]; then
  echo "⬆️  Bumping version to $1..."
  npm version $1 --no-git-tag-version
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Compiling TypeScript..."
npm run compile

echo "🧪 Running unit tests..."
npm run test

echo "📦 Packaging VSIX..."
# Create the releases folder if it doesn't exist
mkdir -p releases
# Package the VSIX and save it directly into the releases folder
npx @vscode/vsce package --out releases/

echo "✅ Build completed successfully! The VSIX artifact is saved in the 'releases/' folder."
