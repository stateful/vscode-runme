#!/bin/bash

# package.json stateful overwrites
npm pkg set name="$EXTENSION_NAME"
npm pkg set displayName="Stateful Notebooks for DevOps"
npm pkg set description="DevOps Notebooks built on Runme, connected for collaboration."
npm pkg set homepage="https://stateful.com"
npm pkg set contributes.configuration[0].properties[runme.app.baseDomain].default="platform.stateful.com"
npm pkg set contributes.configuration[0].properties[runme.app.platformAuth].default=true --json
npm pkg set contributes.configuration[0].properties[runme.features.share].default=true --json
npm pkg set contributes.configuration[0].properties[runme.features.escalate].default=true --json
npm pkg set contributes.configuration[0].properties[runme.server.lifecycleIdentity].default=1 --json
npm pkg set contributes.configuration[0].properties[runme.app.notebookAutoSave].default="yes"
npm pkg set contributes.configuration[0].properties[runme.app.panel.runme.cloud].default="\"\"" --json
npm pkg set contributes.views.runme[0].name="Platform"
npm pkg set contributes.viewsContainers.activitybar[0].title="Stateful"
npm pkg delete galleryBanner

cp -f "assets/$EXTENSION_NAME-icon.gif" "assets/icon.gif"
cp -f "assets/$EXTENSION_NAME-logo-open-dark.svg" "assets/logo-open-dark.svg"
cp -f "assets/$EXTENSION_NAME-logo-open-light.svg" "assets/logo-open-light.svg"
cp -f "assets/$EXTENSION_NAME-logo-sidebar.svg" "assets/logo-sidebar.svg"

cp -f "README-$EXTENSION_NAME.md" "README.md"
