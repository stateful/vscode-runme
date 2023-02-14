import { z } from 'zod'

const falseyBoolean = z.preprocess((subject) => {
    if (typeof subject === 'string' && subject.toLowerCase() === 'false') {
        return false
    }
    return Boolean(subject)
}, z.boolean())

export const AnnotationSchema = {
    'runme.dev/uuid': z.string().uuid().optional(),
    background: z.boolean({ invalid_type_error: 'expected a boolean value' }).default(false),
    interactive: z.boolean({ invalid_type_error: 'expected a boolean value' }).default(true),
    closeTerminalOnSuccess: z.boolean({ invalid_type_error: 'expected a boolean value' }).default(true),
    name: z.string(),
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