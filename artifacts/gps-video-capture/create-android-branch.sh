#!/usr/bin/env bash
# Run this once from the repo root to push the current android config
# to a dedicated "android" branch on GitHub.
set -e
CURRENT=$(git rev-parse --abbrev-ref HEAD)
git checkout -b android 2>/dev/null || git checkout android
git push -u origin android
git checkout "$CURRENT"
echo "✓ 'android' branch pushed to origin."
