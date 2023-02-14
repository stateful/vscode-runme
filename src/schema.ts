import { z } from 'zod'

const CELL_RANDOM_NAME = `Cell #${Math.random().toString().slice(2)}`

const falseyBoolean = z.preprocess((subject) => {
    if (typeof subject === 'string' && subject.toLowerCase() === 'false') {
        return false
    }
    return Boolean(subject)
}, z.boolean())

const boolify = (defaultValue: boolean, invalidTypeError: string = 'expected a boolean value') =>
    z.preprocess((subject) => {
        if (!subject) {
            return defaultValue
        }
        if (typeof subject === 'string' && subject.toLowerCase() === 'false') {
            return false
        }
        if (typeof subject === 'string' && subject.toLowerCase() === 'true') {
            return true
        }
        return subject
    }, z.boolean({ invalid_type_error: invalidTypeError }))

export const AnnotationSchema = {
    'runme.dev/uuid': z.string().uuid().optional(),
    background: boolify(false),
    interactive: boolify(true),
    closeTerminalOnSuccess: boolify(true),
    name: z.string().default(CELL_RANDOM_NAME),
    mimeType: z
        .string()
        .refine((subject) => {
            const [type, subtype] = subject.split('/')
            if (!type || !subtype) {
                return false
            }
            return true
        }, 'mime type specification invalid format')
        .default('text/plain')
}

export const SafeCellAnnotationsSchema = z.object({
    ...AnnotationSchema,
    background: falseyBoolean.default(false),
    interactive: falseyBoolean.default(true),
    closeTerminalOnSuccess: falseyBoolean.default(true),
})

export const CellAnnotationsSchema = z.object({
    ...AnnotationSchema
})