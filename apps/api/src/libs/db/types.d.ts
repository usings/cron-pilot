import type { InferSelectModel } from 'drizzle-orm'
import type * as schema from './schema'

export type TaskDefinition = InferSelectModel<typeof schema.taskDefinitions>
export type TaskExecution = InferSelectModel<typeof schema.taskExecutions>
export type TaskMetric = InferSelectModel<typeof schema.taskMetrics>
