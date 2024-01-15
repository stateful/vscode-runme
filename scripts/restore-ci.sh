#!/bin/sh

echo "Restore package-lock.json \\n"
mv .package-lock.json package-lock.json

echo "Removing node_modules \\n"
find . -name '*node_modules' -type d -prune -exec rm -rf '{}' +
