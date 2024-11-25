import { z } from 'zod'

import { ResolveProgramRequest_Mode } from './extension/grpc/runner/v1'

const cleanAnnotation = (value: string, character: string): string => {
  return value
    .trim()
    .replaceAll(/[ ]{2,}/g, '')
    .replaceAll(character, '')
}

const falseyBoolean = (defaultValue: boolean) =>
  z.preprocess((subject) => {
    if (typeof subject === 'string') {
      subject = cleanAnnotation(subject, ',')
    }
    if (typeof subject === 'boolean') {
      return subject
    }
    if (typeof subject === 'string' && subject.toLowerCase() === 'false') {
      return false
    }
    if (typeof subject === 'string' && subject.toLowerCase() === 'true') {
      return true
    }
    return defaultValue
  }, z.boolean())

const boolify = (defaultValue: boolean, invalidTypeError: string = 'expected a boolean value') =>
  z.preprocess(
    (subject) => {
      if (!subject) {
        return defaultValue
      }
      if (typeof subject === 'string') {
        subject = cleanAnnotation(subject, ',')
      }
      if (typeof subject === 'string' && subject.toLowerCase() === 'false') {
        return false
      }
      if (typeof subject === 'string' && subject.toLowerCase() === 'true') {
        return true
      }
      return subject
    },
    z.boolean({ invalid_type_error: invalidTypeError }),
  )

export const AnnotationSchema = {
  'runme.dev/id': z.string().optional(),
  'runme.dev/name': z.string().optional(),
  'runme.dev/nameGenerated': boolify(true).optional(),
  id: z.string().optional(),
  background: boolify(false),
  interactive: boolify(true),
  closeTerminalOnSuccess: boolify(true),
  promptEnv: z.preprocess((subject) => {
    if (typeof subject === 'string') {
      subject = cleanAnnotation(subject, ',')
    }
    if (typeof subject === 'boolean' && !subject) {
      return ResolveProgramRequest_Mode.SKIP_ALL
    }
    if (typeof subject === 'boolean' && subject) {
      return ResolveProgramRequest_Mode.UNSPECIFIED
    }
    if (typeof subject === 'string' && ['false', 'no'].includes(subject.toLowerCase())) {
      return ResolveProgramRequest_Mode.SKIP_ALL
    }
    if (typeof subject === 'string' && ['true', 'yes'].includes(subject.toLowerCase())) {
      return ResolveProgramRequest_Mode.PROMPT_ALL
    }
    if (typeof subject === 'string' && ['', 'auto'].includes(subject.toLowerCase())) {
      return ResolveProgramRequest_Mode.UNSPECIFIED
    }
    if (typeof subject === 'string' && subject) {
      const numeric = Number(subject)
      if (Number.isFinite(numeric)) {
        return numeric
      }
    }
  }, z.nativeEnum(ResolveProgramRequest_Mode).default(ResolveProgramRequest_Mode.UNSPECIFIED)),
  excludeFromRunAll: boolify(false),
  terminalRows: z.preprocess((subject) => {
    if (typeof subject === 'string' && subject) {
      const numeric = Number(subject)
      if (Number.isFinite(numeric)) {
        return numeric
      }
    }
    if (typeof subject === 'number' && Number.isFinite(subject)) {
      return subject
    }

    return undefined
  }, z.number().int().positive().optional()),
  name: z.preprocess(
    (value) => (typeof value === 'string' ? cleanAnnotation(value, ',') : value),
    z.string().default(''),
  ),
  mimeType: z
    .string()
    .optional()
    .refine((subject) => {
      if (subject) {
        const [type, subtype, ...rest] = subject.split('/')
        if (!type || !subtype || rest.length) {
          return false
        }
      }
      return true
    }, 'mime type specification invalid format'),
  interpreter: z.string().optional().default(''),
  cwd: z.string().optional().default(''),
  category: z.string().default(''),
}

export const SafeCellAnnotationsSchema = z.object({
  ...AnnotationSchema,
  background: falseyBoolean(false),
  interactive: falseyBoolean(true),
  closeTerminalOnSuccess: falseyBoolean(true),
})

export const SafeNotebookAnnotationsSchema = z.object({
  id: z.string(),
  version: z.string(),
})

export const CellAnnotationsSchema = z.object({
  ...AnnotationSchema,
})

// export const StrictCellAnnotationsSchema = z.object({
//   ...AnnotationSchema,
//   name: z.preprocess(
//     (value) => (typeof value === 'string' ? cleanAnnotation(value, ',') : value),
//     z
//       .string()
//       .regex(
//         new RegExp('^[A-Z_][A-Z0-9_]{1}[A-Z0-9_]*[A-Z][A-Z0-9_]*$'),
//         "The name is invalid; cell output won't export as environment variable",
//       )
//       .default(''),
//   ),
// })
