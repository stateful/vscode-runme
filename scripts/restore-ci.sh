#!/bin/sh

echo "Restore package-lock.json"
mv .package-lock.json package-lock.json

echo "Removing node_modules"
find . -name '*node_modules' -type d -prune -exec rm -rf '{}' +
