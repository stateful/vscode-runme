import { expect, test, suite } from 'vitest'
import type { SafeParseError } from 'zod'

import {
  AnnotationSchema,
  SafeCellAnnotationsSchema,
  CellAnnotationsSchema,
} from '../../src/schema'

suite('AnnotationSchema', () => {
  suite('mimeType', () => {
    test('should fail for an invalid mime-type', () => {
      ;['invalid', 'text/', 'invalid/mime/type'].forEach((mimeType) => {
        const parseResult = AnnotationSchema.mimeType.safeParse(mimeType)
        expect(parseResult.success).toBeFalsy()
        expect(!parseResult.success && parseResult.error.flatten().formErrors).toStrictEqual([
          'mime type specification invalid format',
        ])
      })
    })

    test('should accept a valid mime-type', () => {
      ;['text/plain', 'text/x-json', 'application/xml', 'image/png'].forEach((mimeType) => {
        const parseResult = AnnotationSchema.mimeType.safeParse(mimeType)
        expect(parseResult.success).toBeTruthy()
        expect(parseResult.success && parseResult.data).toStrictEqual(mimeType)
      })
    })
  })

  suite('name', () => {
    test('it should add a default name when empty', () => {
      const parseResult = AnnotationSchema.name.safeParse(undefined)
      expect(parseResult.success).toBeTruthy()
      if (parseResult.success) {
        expect(parseResult.data).toBe('')
      }
    })

    test('it should fail for null value', () => {
      const parseResult = AnnotationSchema.name.safeParse(null)
      expect(parseResult.success).toBeFalsy()
      expect(!parseResult.success && parseResult.error.flatten().formErrors).toStrictEqual([
        'Expected string, received null',
      ])
    })

    test('it should accept an empty string', () => {
      const parseResult = AnnotationSchema.name.safeParse('')
      expect(parseResult.success).toBeTruthy()
    })

    test('it should clean the annotation separator for true values', () => {
      ;['true,', 'true    ,', 'true   '].forEach((el) => {
        const parseResult = AnnotationSchema.name.safeParse(el)
        expect(parseResult.success).toBeTruthy()
      })
    })

    test('it should clean the annotation separator for false values', () => {
      ;['false,', 'false    ,', 'false   '].forEach((el) => {
        const parseResult = AnnotationSchema.name.safeParse(el)
        expect(parseResult.success).toBeTruthy()
      })
    })

    test('it should clean the annotation separator for string values', () => {
      ;[
        {
          value: 'annotation',
          expectedValue: 'annotation',
        },
        {
          value: 'annotation,',
          expectedValue: 'annotation',
        },
        {
          value: 'annotation      ,',
          expectedValue: 'annotation',
        },
        {
          value: 'annotation      ',
          expectedValue: 'annotation',
        },
      ].forEach(({ value, expectedValue }) => {
        const parseResult = AnnotationSchema.name.safeParse(value)
        expect(parseResult.success).toBeTruthy()
        if (parseResult.success) {
          expect(parseResult.data).toStrictEqual(expectedValue)
        }
      })
    })
  })

  suite('SafeCellAnnotationsSchema', () => {
    test('Should add safe defaults for invalid values', () => {
      const expectedOutput = {
        background: false,
        interactive: true,
        closeTerminalOnSuccess: true,
      }
      const parseResult = SafeCellAnnotationsSchema.safeParse({
        background: 'invalid',
        interactive: 'invalid',
        closeTerminalOnSuccess: 'invalid',
      })

      expect(parseResult.success).toBeTruthy()
      if (parseResult.success) {
        for (const [key, value] of Object.entries(expectedOutput)) {
          expect(parseResult.data[key]).toStrictEqual(value)
        }
      }
    })

    test('Should generate safe default values', () => {
      const parseResult = SafeCellAnnotationsSchema.safeParse({})
      expect(parseResult.success).toBeTruthy()
      if (parseResult.success) {
        const { background, closeTerminalOnSuccess, interactive, mimeType, name } = parseResult.data
        expect(background).toBeFalsy()
        expect(closeTerminalOnSuccess).toBeTruthy()
        expect(interactive).toBeTruthy()
        expect(mimeType).toStrictEqual('text/plain')
        expect(name).toBe('')
      }
    })
  })

  suite('CellAnnotationsSchema', () => {
    test('Should fail for invalid values', () => {
      const input = {
        background: 'invalid',
        interactive: 'invalid',
        closeTerminalOnSuccess: 'invalid',
      }
      const parseResult = CellAnnotationsSchema.safeParse(input) as SafeParseError<any>
      expect(parseResult.success).toBeFalsy()
      const { fieldErrors } = parseResult.error.flatten()
      expect(fieldErrors).toEqual({ background: ['expected a boolean value'] })
    })

    test('Should generate safe default values', () => {
      const parseResult = SafeCellAnnotationsSchema.safeParse({})
      expect(parseResult.success).toBeTruthy()
      if (parseResult.success) {
        const { background, closeTerminalOnSuccess, interactive, mimeType, name } = parseResult.data
        expect(background).toBeFalsy()
        expect(closeTerminalOnSuccess).toBeTruthy()
        expect(interactive).toBeTruthy()
        expect(mimeType).toStrictEqual('text/plain')
        expect(name).toBe('')
      }
    })
  })
})
