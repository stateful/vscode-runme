import { expect, test, suite } from 'vitest'

import { AnnotationSchema, SafeCellAnnotationsSchema, CellAnnotationsSchema } from '../../src/schema'

const CELL_REGEX = new RegExp('(Cell #)[0-9]+')

suite('AnnotationSchema', () => {
    suite('mimeType', () => {
        test('should fail for an invalid mime-type', () => {
            ['invalid', 'text/', 'invalid/mime/type'].forEach((mimeType) => {
                const parseResult = AnnotationSchema.mimeType.safeParse(mimeType)
                expect(parseResult.success).toBeFalsy()
                expect(!parseResult.success && parseResult.error.flatten().formErrors).toStrictEqual([
                    'mime type specification invalid format'
                ])
            })

        })

        test('should accept a valid mime-type', () => {
            ['text/plain', 'text/x-json', 'application/xml', 'image/png'].forEach((mimeType) => {
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
            expect(parseResult.success && CELL_REGEX.test(parseResult.data)).toBeTruthy()
        })

        test('it should fail for null value', () => {
            const parseResult = AnnotationSchema.name.safeParse(null)
            expect(parseResult.success).toBeFalsy()
            expect(!parseResult.success && parseResult.error.flatten().formErrors).toStrictEqual([
                'Expected string, received null'
            ])
        })

        test('it should accept an empty string', () => {
            const parseResult = AnnotationSchema.name.safeParse('')
            expect(parseResult.success).toBeTruthy()
        })
    })

    suite('SafeCellAnnotationsSchema', () => {
        test('Should add safe defaults for invalid values', () => {
            const expectedOutput = {
                background: false,
                interactive: false,
                closeTerminalOnSuccess: true
            }
            const parseResult = SafeCellAnnotationsSchema.safeParse(
                {
                    background: 'invalid',
                    interactive: 'invalid',
                    closeTerminalOnSuccess: 'invalid'
                }
            )

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
                expect(interactive).toBeFalsy()
                expect(mimeType).toStrictEqual('text/plain')
                expect(CELL_REGEX.test(name)).toBeTruthy()
            }
        })
    })

    suite('CellAnnotationsSchema', () => {
        test('Should fail for invalid values', () => {
            const input = {
                background: 'invalid',
                interactive: 'invalid',
                closeTerminalOnSuccess: 'invalid'
            }
            const parseResult = CellAnnotationsSchema.safeParse(input)

            expect(parseResult.success).toBeFalsy()
            if (!parseResult.success) {
                const { fieldErrors } = parseResult.error.flatten()
                for (const key in input) {
                    expect(fieldErrors[key]).toStrictEqual(['expected a boolean value'])
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
                expect(interactive).toBeFalsy()
                expect(mimeType).toStrictEqual('text/plain')
                expect(CELL_REGEX.test(name)).toBeTruthy()
            }
        })
    })
})