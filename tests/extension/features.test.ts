import { describe, it, expect, beforeEach } from 'vitest'

import {
  updateFeatureState,
  getFeatureSnapshot,
  loadFeaturesState,
  isFeatureActive,
  loadFeatureSnapshot,
  FeatureContext,
  FeatureState,
  FeatureObserver,
} from '../../src/features'

const packageJSON = {
  runme: {
    features: [
      {
        name: 'Escalate',
        enabled: true,
        conditions: {
          os: 'All',
          vsCodeVersion: '>=1.0.0',
          runmeVersion: '>=1.0.0',
          extensionVersion: '>=1.0.0',
          githubAuthRequired: undefined,
          statefulAuthRequired: true,
          allowedExtensions: ['stateful.platform'],
        },
      },
      {
        name: 'Feature B',
        enabled: true,
        conditions: {
          os: 'win32',
          vsCodeVersion: '>=1.0.0',
          runmeVersion: '>=1.0.0',
          extensionVersion: '>=1.0.0',
          githubAuthRequired: true,
          statefulAuthRequired: false,
          allowedExtensions: ['stateful.runme', 'stateful.platform'],
        },
      },
    ],
  },
}

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
      extensionId: 'stateful.runme',
    }

    updateFeatureState(featureState$, initialContext)

    const currentFeatures = (featureState$.getValue() as FeatureState).features

    expect(currentFeatures[0].activated).toBe(false)
    expect(currentFeatures[1].activated).toBe(true)
  })

  it('should take a snapshot of the current state', () => {
    const initialContext: FeatureContext = {
      os: 'win32',
      vsCodeVersion: '1.59.0',
      extensionVersion: '1.0.0',
      runmeVersion: '1.3.0',
      githubAuth: true,
      statefulAuth: true,
      extensionId: 'stateful.runme',
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
      extensionId: 'stateful.runme',
    }

    updateFeatureState(featureState$, initialContext)
    const snapshot = getFeatureSnapshot(featureState$)

    featureState$.next({
      context: initialContext,
      features: [
        {
          name: 'Escalate',
          enabled: true,
          conditions: {
            os: 'All',
            vsCodeVersion: '>=1.58.0',
            runmeVersion: '>=1.2.0',
            githubAuth: undefined,
            statefulAuth: true,
          },
        },
        {
          name: 'Feature B',
          enabled: true,
          conditions: {
            os: 'win32',
            vsCodeVersion: '>=1.60.0',
            githubAuth: true,
            statefulAuth: false,
          },
        },
      ],
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
      extensionId: 'stateful.runme',
    }
    updateFeatureState(featureState$, newContext)

    const currentFeatures = (featureState$.getValue() as FeatureState).features
    expect(currentFeatures[0].activated).toBe(false)
    expect(currentFeatures[1].activated).toBe(false)
  })

  it('should correctly identify if a feature is enabled by name', () => {
    const ctx: FeatureContext = {
      os: 'linux',
      vsCodeVersion: '1.59.0',
      extensionVersion: '1.0.0',
      runmeVersion: '1.3.0',
      githubAuth: true,
      statefulAuth: true,
      extensionId: 'stateful.platform',
    }
    updateFeatureState(featureState$, ctx)

    expect(isFeatureActive(featureState$, 'Escalate')).toBe(true)
    expect(isFeatureActive(featureState$, 'Feature B')).toBe(false)
    expect(isFeatureActive(featureState$, 'Nonexistent Feature')).toBe(false)
  })

  it('should correctly identify if a feature is enabled by extensionId', () => {
    const ctx: FeatureContext = {
      os: 'win32',
      vsCodeVersion: '1.59.0',
      extensionVersion: '1.0.0',
      runmeVersion: '1.3.0',
      githubAuth: true,
      statefulAuth: true,
      extensionId: 'stateful.runme',
    }
    updateFeatureState(featureState$, ctx)

    expect(isFeatureActive(featureState$, 'Escalate')).toBe(false)
    expect(isFeatureActive(featureState$, 'Feature B')).toBe(true)
  })
})
