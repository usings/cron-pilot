import { defineRelations } from 'drizzle-orm'
import * as schema from './schema'

export const relations = defineRelations(schema, (r) => ({
  taskDefinitions: {
    executions: r.many.taskExecutions({
      from: r.taskDefinitions.id,
      to: r.taskExecutions.taskId,
    }),
    metrics: r.one.taskMetrics({
      from: r.taskDefinitions.id,
      to: r.taskMetrics.taskId,
    }),
  },

  taskExecutions: {
    task: r.one.taskDefinitions({
      from: r.taskExecutions.taskId,
      to: r.taskDefinitions.id,
      optional: false,
    }),
  },

  taskMetrics: {
    task: r.one.taskDefinitions({
      from: r.taskMetrics.taskId,
      to: r.taskDefinitions.id,
      optional: false,
    }),
  },
}))
