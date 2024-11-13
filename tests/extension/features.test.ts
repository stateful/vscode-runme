import { describe, it, expect, beforeEach, vi } from 'vitest'

import features from '../../src/features'
import {
  ExtensionName,
  FeatureContext,
  FeatureName,
  FeatureObserver,
  FeatureState,
} from '../../src/types'

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
    featureState$ = features.loadState(packageJSON, {
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

    features.updateState(featureState$, initialContext)

    const currentFeatures = (featureState$.getValue() as FeatureState).features

    expect(currentFeatures.Escalate?.on).toBe(false)
    expect(currentFeatures.Gist?.on).toBe(true)
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

    features.updateState(featureState$, initialContext)
    const snapshot = features.getSnapshot(featureState$)

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

    features.updateState(featureState$, initialContext)
    const snapshot = features.getSnapshot(featureState$)

    featureState$.next({
      context: initialContext,
      features: {
        Escalate: {
          enabled: true,
          on: false,
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
          on: false,
          conditions: {
            os: 'win32',
            vsCodeVersion: '>=1.60.0',
            githubAuthRequired: true,
            statefulAuthRequired: false,
          },
        },
      },
    })

    const featureStateCopy$ = features.loadSnapshot(snapshot)

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
    features.updateState(featureState$, newContext)

    const currentFeatures = (featureState$.getValue() as FeatureState).features
    expect(currentFeatures.Escalate?.on).toBe(false)
    expect(currentFeatures.Gist?.on).toBe(false)
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
    features.updateState(featureState$, ctx)

    expect(features.isOn(FeatureName.Escalate, featureState$)).toBe(true)
    expect(features.isOn(FeatureName.Gist, featureState$)).toBe(false)
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
    features.updateState(featureState$, ctx)

    expect(features.isOn(FeatureName.Escalate, featureState$)).toBe(false)
    expect(features.isOn(FeatureName.Gist, featureState$)).toBe(true)
  })
})

describe('Hosted Playground', () => {
  let featureState$: FeatureObserver

  beforeEach(() => {
    featureState$ = features.loadState(packageJSON, {
      os: 'linux',
    })
  })

  it('should always be default disabled in Runme', () => {
    const initialContext: FeatureContext = {
      extensionId: ExtensionName.StatefulRunme,
    }

    features.updateState(featureState$, initialContext)

    expect(features.isOn(FeatureName.HostedPlayground, featureState$)).toBe(false)
  })

  it('should always be default disabled in Stateful', () => {
    const initialContext: FeatureContext = {
      extensionId: ExtensionName.StatefulPlatform,
    }

    features.updateState(featureState$, initialContext)

    expect(features.isOn(FeatureName.HostedPlayground, featureState$)).toBe(false)
  })
})
