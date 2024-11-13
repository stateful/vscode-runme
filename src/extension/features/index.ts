export * from './addTrustedDomains'
export * from './autoOpenTerminal'

import features, { FEATURES_CONTEXT_STATE_KEY } from '../../features'
import { FeatureName } from '../../types'
import ContextState from '../contextState'

export function isOnInContextState(featureName: FeatureName): boolean {
  const snapshot = ContextState.getKey<string>(FEATURES_CONTEXT_STATE_KEY)
  if (!snapshot) {
    return false
  }

  const featureState$ = features.loadSnapshot(snapshot)

  return features.isOn(featureName, featureState$)
}

export function getFeaturesContext() {
  const snapshot = ContextState.getKey<string>(FEATURES_CONTEXT_STATE_KEY)
  if (!snapshot) {
    return
  }

  const featureState$ = features.loadSnapshot(snapshot)

  return featureState$.getValue().context
}

export default {
  isOnInContextState,
}
