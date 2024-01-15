#!/bin/sh

echo "Removing node_modules... \\n"
find . -name '*node_modules' -type d -prune -exec rm -rf '{}' +

echo "Installing dependencies... \\n"
export GITHUB_TOKEN=$(gh auth token)
npm ci

echo "Running tests... \\n"
npx runme run configureNPM setup build test:ci
