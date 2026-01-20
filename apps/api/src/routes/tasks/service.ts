import type { infer as Infer } from 'zod'
import type { DrizzleInstance } from '#api/libs/db/client'
import type { createSchema, executionsQuerySchema, taskListQuerySchema, updateSchema } from './schema'
import { eq, sql } from 'drizzle-orm'
import * as scheme from '#api/libs/db/schema'
import { removeQueuedJobs, removeScheduleJob, upsertScheduleJob } from '#api/libs/schedule/schedule-job'
import { syncTaskSchedule } from '#api/libs/schedule/schedule-task'
import { HttpError } from '#api/plugins/error'

type TaskListQuery = Infer<typeof taskListQuerySchema>
type TaskCreateInput = Infer<typeof createSchema>
type TaskUpdateInput = Infer<typeof updateSchema>
type TaskExecutionsQuery = Infer<typeof executionsQuerySchema>

export async function listTasks(db: DrizzleInstance, query: TaskListQuery) {
  const { name, cursor, limit } = query
  const trimmed = name?.trim()
  const hasWildcard = trimmed ? /[%_]/.test(trimmed) : false

  const where = {
    ...(trimmed
      ? {
          name: {
            like: hasWildcard ? trimmed : `%${trimmed}%`,
          },
        }
      : {}),
    ...(cursor != null ? { id: { gt: cursor } } : {}),
  }

  const items = await db.query.taskDefinitions.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: (taskDefinitions, { asc }) => [asc(taskDefinitions.id)],
    limit: limit + 1,
  })

  const hasNext = items.length > limit
  const data = hasNext ? items.slice(0, limit) : items
  const nextCursor = hasNext ? data.at(-1)?.id : undefined

  return {
    data,
    meta: nextCursor ? { nextCursor } : null,
  }
}

export async function createTask(db: DrizzleInstance, payload: TaskCreateInput) {
  const [task] = await db.insert(scheme.taskDefinitions).values(payload).returning()
  if (!task) {
    throw new HttpError(500, 'TASK_CREATE_FAILED', 'failed to create task.')
  }
  try {
    await upsertScheduleJob(task, { throwOnError: true })
  } catch {
    await db.delete(scheme.taskDefinitions).where(eq(scheme.taskDefinitions.id, task.id))
    throw new HttpError(500, 'TASK_SCHEDULE_FAILED', 'failed to schedule task.')
  }
  return { data: task, meta: null }
}

export async function getTaskById(db: DrizzleInstance, taskId: number) {
  const task = await db.query.taskDefinitions.findFirst({
    where: { id: { eq: taskId } },
  })
  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'task not found.')
  }
  return { data: task, meta: null }
}

export async function updateTask(db: DrizzleInstance, taskId: number, payload: TaskUpdateInput) {
  const previousTask = await db.query.taskDefinitions.findFirst({
    where: { id: { eq: taskId } },
  })
  if (!previousTask) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'task not found.')
  }

  const [task] = await db
    .update(scheme.taskDefinitions)
    .set(payload)
    .where(eq(scheme.taskDefinitions.id, taskId))
    .returning()
  if (!task) {
    throw new HttpError(500, 'TASK_UPDATE_FAILED', 'failed to update task.')
  }

  try {
    await syncTaskSchedule(db, task, { throwOnError: true, previousTask })
  } catch {
    try {
      await db.update(scheme.taskDefinitions).set(previousTask).where(eq(scheme.taskDefinitions.id, taskId))
    } catch {
      // best-effort rollback
    }
    try {
      await syncTaskSchedule(db, previousTask)
    } catch {
      // best-effort rollback
    }
    throw new HttpError(500, 'TASK_SCHEDULE_SYNC_FAILED', 'failed to sync task schedule.')
  }

  return { data: task, meta: null }
}

export async function deleteTask(db: DrizzleInstance, taskId: number) {
  const task = await db.query.taskDefinitions.findFirst({
    where: { id: { eq: taskId } },
  })
  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'task not found.')
  }

  try {
    await removeScheduleJob(taskId, { throwOnError: true })
    await removeQueuedJobs(taskId, { throwOnError: true })
  } catch {
    throw new HttpError(500, 'TASK_UNSCHEDULE_FAILED', 'failed to unschedule task.')
  }

  const [deleted] = await db.delete(scheme.taskDefinitions).where(eq(scheme.taskDefinitions.id, taskId)).returning()
  if (!deleted) {
    if (task.enabled) {
      await upsertScheduleJob(task)
    }
    throw new HttpError(500, 'TASK_DELETE_FAILED', 'failed to delete task.')
  }

  return { data: deleted, meta: null }
}

export async function getTaskMetrics(db: DrizzleInstance, taskId: number) {
  const task = await db.query.taskDefinitions.findFirst({
    where: { id: { eq: taskId } },
    with: {
      metrics: {
        columns: {
          failedRuns: true,
          totalRuns: true,
          lastRunAt: true,
          nextRunAt: true,
        },
      },
    },
  })
  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'task not found.')
  }
  const metrics = task.metrics ?? {
    totalRuns: 0,
    failedRuns: 0,
    lastRunAt: null,
    nextRunAt: null,
  }
  return { data: metrics, meta: null }
}

export async function getTaskExecutions(db: DrizzleInstance, taskId: number, query: TaskExecutionsQuery) {
  const { page, limit } = query
  const offset = (page - 1) * limit

  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(scheme.taskExecutions)
    .where(eq(scheme.taskExecutions.taskId, taskId))

  const executions = await db.query.taskExecutions.findMany({
    where: { taskId: { eq: taskId } },
    orderBy: (taskExecutions, { desc }) => [desc(taskExecutions.createdAt)],
    limit,
    offset,
  })

  return { data: executions, meta: { total: countRow?.total ?? 0, page, limit } }
}
