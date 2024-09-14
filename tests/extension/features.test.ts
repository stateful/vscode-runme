import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  updateFeatureState,
  getFeatureSnapshot,
  loadFeaturesState,
  isFeatureActive,
  loadFeatureSnapshot,
  FeatureContext,
  FeatureState,
  FeatureObserver,
  FeatureName,
  ExtensionName,
} from '../../src/features'

const packageJSON = {
  runme: {
    features: {
      Escalate: {
        enabled: true,
        conditions: {
          os: 'All',
          vsCodeVersion: '>=1.0.0',
          runmeVersion: '>=1.0.0',
          extensionVersion: '>=1.0.0',
          githubAuthRequired: undefined,
          statefulAuthRequired: true,
          enabledForExtensions: {
            'stateful.platform': true,
            'stateful.runme': false,
          },
        },
      },
      Gist: {
        enabled: true,
        conditions: {
          os: 'win32',
          vsCodeVersion: '>=1.0.0',
          runmeVersion: '>=1.0.0',
          extensionVersion: '>=1.0.0',
          githubAuthRequired: true,
          statefulAuthRequired: false,
          enabledForExtensions: {
            'stateful.platform': true,
            'stateful.runme': true,
          },
        },
      },
    },
  },
}

vi.mock('vscode')
vi.mock('../../src/extension/contextState')

describe('Feature Store', () => {
  let featureState$: FeatureObserver

  beforeEach(() => {
    featureState$ = loadFeaturesState(packageJSON, {
      os: 'linux',
    })
  })

  it('should evaluate and enable features correctly based on context', () => {
    const initialContext: FeatureContext = {
      os: 'win32',
      vsCodeVersion: '1.59.0',
      extensionVersion: '1.0.0',
      runmeVersion: '1.3.0',
      githubAuth: true,
      statefulAuth: true,
      extensionId: ExtensionName.StatefulRunme,
    }

    updateFeatureState(featureState$, initialContext)

    const currentFeatures = (featureState$.getValue() as FeatureState).features

    expect(currentFeatures.Escalate?.activated).toBe(false)
    expect(currentFeatures.Gist?.activated).toBe(true)
  })

  it('should take a snapshot of the current state', () => {
    const initialContext: FeatureContext = {
      os: 'win32',
      vsCodeVersion: '1.59.0',
      extensionVersion: '1.0.0',
      runmeVersion: '1.3.0',
      githubAuth: true,
      statefulAuth: true,
      extensionId: ExtensionName.StatefulRunme,
    }

    updateFeatureState(featureState$, initialContext)
    const snapshot = getFeatureSnapshot(featureState$)

    expect(snapshot).toBe(JSON.stringify(featureState$.getValue()))
  })

  it('should load a snapshot and restore feature state', () => {
    const initialContext: FeatureContext = {
      os: 'win32',
      vsCodeVersion: '1.59.0',
      extensionVersion: '1.0.0',
      runmeVersion: '1.3.0',
      githubAuth: true,
      statefulAuth: true,
      extensionId: ExtensionName.StatefulRunme,
    }

    updateFeatureState(featureState$, initialContext)
    const snapshot = getFeatureSnapshot(featureState$)

    featureState$.next({
      context: initialContext,
      features: {
        Escalate: {
          enabled: true,
          activated: false,
          conditions: {
            os: 'All',
            vsCodeVersion: '>=1.58.0',
            runmeVersion: '>=1.2.0',
            githubAuthRequired: undefined,
            statefulAuthRequired: true,
          },
        },
        Gist: {
          enabled: true,
          activated: false,
          conditions: {
            os: 'win32',
            vsCodeVersion: '>=1.60.0',
            githubAuthRequired: true,
            statefulAuthRequired: false,
          },
        },
      },
    })

    const featureStateCopy$ = loadFeatureSnapshot(snapshot)

    const restoredFeatures = featureStateCopy$.getValue()
    expect(restoredFeatures).toEqual(JSON.parse(snapshot))
  })

  it('should disable a feature if context does not meet conditions', () => {
    const newContext: FeatureContext = {
      os: 'win32',
      vsCodeVersion: '0.0.1',
      extensionVersion: '0.0.1',
      runmeVersion: '0.0.1',
      githubAuth: false,
      statefulAuth: false,
      extensionId: ExtensionName.StatefulRunme,
    }
    updateFeatureState(featureState$, newContext)

    const currentFeatures = (featureState$.getValue() as FeatureState).features
    expect(currentFeatures.Escalate?.activated).toBe(false)
    expect(currentFeatures.Gist?.activated).toBe(false)
  })

  it('should correctly identify if a feature is enabled by name', () => {
    const ctx: FeatureContext = {
      os: 'linux',
      vsCodeVersion: '1.59.0',
      extensionVersion: '1.0.0',
      runmeVersion: '1.3.0',
      githubAuth: true,
      statefulAuth: true,
      extensionId: ExtensionName.StatefulPlatform,
    }
    updateFeatureState(featureState$, ctx)

    expect(isFeatureActive(FeatureName.Escalate, featureState$)).toBe(true)
    expect(isFeatureActive(FeatureName.Gist, featureState$)).toBe(false)
  })

  it('should correctly identify if a feature is enabled by extensionId', () => {
    const ctx: FeatureContext = {
      os: 'win32',
      vsCodeVersion: '1.59.0',
      extensionVersion: '1.0.0',
      runmeVersion: '1.3.0',
      githubAuth: true,
      statefulAuth: true,
      extensionId: ExtensionName.StatefulRunme,
    }
    updateFeatureState(featureState$, ctx)

    expect(isFeatureActive(FeatureName.Escalate, featureState$)).toBe(false)
    expect(isFeatureActive(FeatureName.Gist, featureState$)).toBe(true)
  })
})
