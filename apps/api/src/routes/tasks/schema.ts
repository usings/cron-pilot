import { createInsertSchema, createUpdateSchema } from 'drizzle-zod'
import { isEmpty } from 'radashi'
import { z } from 'zod'
import { parseCronExpression } from '#api/libs/cron'
import { taskDefinitions } from '#api/libs/db/schema'

const taskEnvsSchema = z.record(z.string(), z.string())

const taskInsertSchema = createInsertSchema(taskDefinitions, {
  envs: taskEnvsSchema.optional(),
})

const taskUpdateSchema = createUpdateSchema(taskDefinitions, {
  envs: taskEnvsSchema.optional(),
})

const isValidCron = (cron: string) => {
  try {
    parseCronExpression(cron)
    return true
  } catch {
    return false
  }
}

const cronSchema = z.string().refine(isValidCron, { message: 'invalid cron expression' })
const optionalCronSchema = z
  .string()
  .optional()
  .refine(
    (cron) => {
      if (!cron) return true
      return isValidCron(cron)
    },
    { message: 'invalid cron expression' },
  )

const baseCreateSchema = taskInsertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

const baseUpdateSchema = taskUpdateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const createSchema = baseCreateSchema.extend({
  cron: cronSchema,
  command: z.string().min(1, 'command must not be empty'),
  description: z.string().optional(),
  icon: z.string().optional(),
})

export const updateSchema = baseUpdateSchema.extend({
  cron: optionalCronSchema,
  command: z.string().min(1, 'command must not be empty'),
  description: z.string().optional(),
  icon: z.string().optional(),
})

const normalizeOptionalInput = (value: unknown) => (isEmpty(value) ? undefined : value)

const optionalPositiveInt = z.preprocess(normalizeOptionalInput, z.coerce.number().int().positive())
const limitSchema = z.preprocess(normalizeOptionalInput, z.coerce.number().int().min(1).max(100))

export const taskListQuerySchema = z.object({
  name: z.string().optional(),
  cursor: optionalPositiveInt.optional(),
  limit: limitSchema.default(10),
})

export const taskIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const executionsQuerySchema = z.object({
  page: optionalPositiveInt.default(1),
  limit: limitSchema.default(20),
})
