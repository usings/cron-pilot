import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const taskDefinitions = sqliteTable('task_definitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  cron: text('cron').notNull(),
  icon: text('icon'),
  command: text('command').notNull(),
  envs: text('envs', { mode: 'json' }).$type<Record<string, string>>(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
})

export const taskExecutions = sqliteTable(
  'task_executions',
  {
    id: text('id').primaryKey(),
    taskId: integer('task_id')
      .notNull()
      .references(() => taskDefinitions.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'stalled'] }).notNull(),
    exitCode: integer('exit_code'),
    stdout: text('stdout'),
    stderr: text('stderr'),
    startedAt: integer('started_at', { mode: 'timestamp' }),
    finishedAt: integer('finished_at', { mode: 'timestamp' }),
    durationMs: integer('duration_ms'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('idx_task_exec_by_task_and_status').on(table.taskId, table.status),
    index('idx_task_exec_by_status_created_at').on(table.status, table.createdAt),
    index('idx_task_exec_by_status_started_at').on(table.status, table.startedAt),
  ],
)

export const taskMetrics = sqliteTable('task_metrics', {
  taskId: integer('task_id')
    .primaryKey()
    .references(() => taskDefinitions.id, { onDelete: 'cascade' }),
  totalRuns: integer('total_runs').notNull().default(0),
  failedRuns: integer('failed_runs').notNull().default(0),
  lastRunAt: integer('last_run_at', { mode: 'timestamp' }),
  nextRunAt: integer('next_run_at', { mode: 'timestamp' }),
})
