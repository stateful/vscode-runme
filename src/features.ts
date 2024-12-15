import { BehaviorSubject } from 'rxjs'
import { satisfies } from 'semver'

import {
  EnabledForExtensions,
  ExtensionName,
  Feature,
  FeatureContext,
  FeatureName,
  FeatureObserver,
  Features,
  FeatureState,
} from './types'

export const FEATURES_CONTEXT_STATE_KEY = 'features'

function loadFromPackageJson(packageJSON: any): Features {
  const features = (packageJSON?.runme?.features || {}) as Features
  return features
}

function loadState(
  packageJSON: any,
  context?: FeatureContext,
  overrides: Map<string, boolean> = new Map(),
): FeatureObserver {
  const initialFeatures = loadFromPackageJson(packageJSON)
  const state = new BehaviorSubject<FeatureState>({
    features: initialFeatures,
    context,
  })
  updateState(state, context, overrides)
  return state
}

function checkEnabled(enabled?: boolean, contextEnabled?: boolean): boolean {
  if (contextEnabled !== undefined) {
    return contextEnabled === true
  }

  return enabled === true
}

function checkOS(os?: string, contextOS?: string): boolean {
  return !os || os === 'All' || contextOS === os
}

function checkVersion(requiredVersion?: string, actualVersion?: string): boolean {
  if (!requiredVersion) {
    return true
  }

  if (!actualVersion) {
    return true
  }

  return satisfies(actualVersion, requiredVersion)
}

function checkAuth(required?: boolean, isAuthenticated?: boolean): boolean {
  if (!required) {
    return true
  }

  if (!isAuthenticated) {
    return false
  }

  return true
}

function checkExtensionId(
  enabledForExtensions?: EnabledForExtensions,
  extensionId?: ExtensionName,
): boolean {
  if (!enabledForExtensions) {
    return true
  }

  if (!extensionId) {
    return false
  }

  return enabledForExtensions[extensionId] === true
}

function isActive(
  featureName: FeatureName,
  feature: Feature,
  context?: FeatureContext,
  overrides: Map<string, boolean> = new Map(),
): boolean {
  const {
    os,
    vsCodeVersion,
    runmeVersion,
    extensionVersion,
    githubAuthRequired,
    statefulAuthRequired,
    enabledForExtensions,
  } = feature.conditions

  if (!checkEnabled(feature.enabled, overrides.get(featureName))) {
    console.log(`Feature "${featureName}" is inactive due to checkEnabled.`)
    return false
  }

  if (!checkOS(os, context?.os)) {
    console.log(
      `Feature "${featureName}" is inactive due to checkOS. Expected OS: ${os}, actual OS: ${context?.os}`,
    )
    return false
  }

  if (!checkVersion(vsCodeVersion, context?.vsCodeVersion)) {
    console.log(
      `Feature "${featureName}" is inactive due to checkVersion (vsCodeVersion). Expected: ${vsCodeVersion}, actual: ${context?.vsCodeVersion}`,
    )
    return false
  }

  if (!checkVersion(runmeVersion, context?.runmeVersion)) {
    console.log(
      `Feature "${featureName}" is inactive due to checkVersion (runmeVersion). Expected: ${runmeVersion}, actual: ${context?.runmeVersion}`,
    )
    return false
  }

  if (!checkVersion(extensionVersion, context?.extensionVersion)) {
    console.log(
      `Feature "${featureName}" is inactive due to checkVersion (extensionVersion). Expected: ${extensionVersion}, actual: ${context?.extensionVersion}`,
    )
    return false
  }

  if (!checkAuth(githubAuthRequired, context?.githubAuth)) {
    console.log(
      `Feature "${featureName}" is inactive due to checkAuth (githubAuth). Required: ${githubAuthRequired}, actual: ${context?.githubAuth}`,
    )
    return false
  }

  if (!checkAuth(statefulAuthRequired, context?.statefulAuth)) {
    console.log(
      `Feature "${featureName}" is inactive due to checkAuth (statefulAuth). Required: ${statefulAuthRequired}, actual: ${context?.statefulAuth}`,
    )
    return false
  }

  if (!checkExtensionId(enabledForExtensions, context?.extensionId)) {
    console.log(
      `Feature "${featureName}" is inactive due to checkExtensionId. Expected: ${JSON.stringify(enabledForExtensions)}, actual: ${context?.extensionId}`,
    )
    return false
  }

  console.log(`Feature "${featureName} is active`)
  return true
}

function updateState(
  featureState$: FeatureObserver,
  context?: FeatureContext,
  overrides: Map<string, boolean> = new Map(),
) {
  const currentState = featureState$.getValue()

  const updatedFeatures = Object.entries(currentState.features).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: {
        ...value,
        on: isActive(key as FeatureName, value, context, overrides),
      },
    }),
    {} as Features,
  )

  featureState$.next({ features: updatedFeatures, context })
  return featureState$
}

function updateContext<K extends keyof FeatureContext>(
  featureState$: FeatureObserver | undefined,
  key: K,
  value: FeatureContext[K],
  overrides: Map<string, boolean>,
) {
  if (!featureState$) {
    return
  }
  const currentState = featureState$.getValue()
  const newContext = { ...(currentState.context || {}), [key]: value }

  if (newContext[key] !== currentState?.context?.[key]) {
    updateState(featureState$, newContext, overrides)
  }
}

function getSnapshot(featureState$: FeatureObserver | undefined): string {
  if (!featureState$) {
    return ''
  }

  return JSON.stringify(featureState$.getValue())
}

function loadSnapshot(snapshot: string): FeatureObserver {
  const { features, context } = JSON.parse(snapshot)
  const featureState$ = new BehaviorSubject<FeatureState>({
    features,
    context,
  })

  featureState$.next({ features, context: featureState$.getValue().context })
  return featureState$
}

function isOn(featureName: FeatureName, featureState$?: FeatureObserver): boolean {
  if (!featureState$) {
    return false
  }

  const feature = featureState$.getValue().features[featureName]
  return feature?.on ?? false
}

export default {
  loadState,
  updateState,
  updateContext,
  getSnapshot,
  loadSnapshot,
  isOn,
}
