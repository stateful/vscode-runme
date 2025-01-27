import { suite, test, expect } from 'vitest'

import { RingBuffer } from '../src/ringBuffer'

suite('RingBuffer', () => {
  test('should push items', () => {
    const buffer = new RingBuffer<string>(5)

    buffer.push('Line 1')
    buffer.push('Line 2')
    buffer.push('Line 3')
    buffer.push('Line 4')
    buffer.push('Line 5')

    expect(buffer).toHaveLength(5)
    expect(buffer.getAll()).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5'])
  })

  test('should overwrite oldest item on push over capacity', () => {
    const buffer = new RingBuffer<string>(5)

    buffer.push('Line 1')
    buffer.push('Line 2')
    buffer.push('Line 3')
    buffer.push('Line 4')
    buffer.push('Line 5')
    buffer.push('Line 6') // overwrites "Line 1"

    expect(buffer).toHaveLength(5)
    expect(buffer.getAll()).toEqual(['Line 2', 'Line 3', 'Line 4', 'Line 5', 'Line 6'])
  })
})
