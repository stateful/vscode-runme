import { vi } from 'vitest'

export const TelemetryReporter = {
  sendTelemetryEvent: vi.fn(),
  sendTelemetryErrorEvent: vi.fn()
}

export class TelemetryViewProvider {
  constructor() {
  }
}
