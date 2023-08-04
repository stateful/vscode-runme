import { z } from 'zod'

import { DEFAULT_PROMPT_ENV } from './constants'

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
  'runme.dev/uuid': z.string().uuid().optional(),
  background: boolify(false),
  interactive: boolify(true),
  closeTerminalOnSuccess: boolify(true),
  promptEnv: boolify(true),
  excludeFromRunAll: boolify(false),
  terminalRows: z.preprocess((subject) => {
    if (typeof subject === 'string' && subject) {
      const numeric = Number(subject)
      if (Number.isFinite(numeric)) {
        return numeric
      }
    }

    return undefined
  }, z.number().int().positive().optional()),
  name: z.preprocess(
    (value) => (typeof value === 'string' ? cleanAnnotation(value, ',') : value),
    z.string().default(''),
  ),
  mimeType: z
    .string()
    .refine((subject) => {
      const [type, subtype, ...rest] = subject.split('/')
      if (!type || !subtype || rest.length) {
        return false
      }
      return true
    }, 'mime type specification invalid format')
    .default('text/plain'),
  interpreter: z.string().optional().default(''),
  cwd: z.string().nonempty().optional(),
  category: z.preprocess(
    (value) => (typeof value === 'string' ? cleanAnnotation(value, ',') : value),
    z.string().default(''),
  ),
}

export const SafeCellAnnotationsSchema = z.object({
  ...AnnotationSchema,
  background: falseyBoolean(false),
  interactive: falseyBoolean(true),
  closeTerminalOnSuccess: falseyBoolean(true),
  promptEnv: falseyBoolean(DEFAULT_PROMPT_ENV),
})

export const CellAnnotationsSchema = z.object({
  ...AnnotationSchema,
})
