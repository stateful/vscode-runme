#!/bin/bash

# package.json overrides
npm pkg set name="$EXTENSION_NAME"
npm pkg set displayName="Stateful Platform"
npm pkg set description="DevOps workflows for teams"
npm pkg set contributes.configuration[0].properties[runme.app.baseDomain].default="us-central1.stateful.com"
npm pkg set contributes.configuration[0].properties[runme.app.platformAuth].default=false --json
npm pkg set contributes.configuration[0].properties[runme.app.enableShare].default=true --json
npm pkg set contributes.configuration[0].properties[runme.server.lifecycleIdentity].default=1 --json
npm pkg delete galleryBanner

cp -f "assets/$EXTENSION_NAME-icon.gif" "assets/icon.gif"
cp -f "assets/$EXTENSION_NAME-logo-open-dark.svg" "assets/logo-open-dark.svg"
cp -f "assets/$EXTENSION_NAME-logo-open-light.svg" "assets/logo-open-light.svg"
cp -f "assets/$EXTENSION_NAME-logo-sidebar.svg" "assets/logo-sidebar.svg"
