import type { DrizzleInstance } from '#api/libs/db/client'
import type { TaskDefinition } from '#api/libs/db/types'
import { and, eq, inArray } from 'drizzle-orm'
import { parseCronNextRunTime } from '#api/libs/cron'
import * as scheme from '#api/libs/db/schema'
import { logger } from '#api/libs/logger'
import { removeQueuedJobs, removeScheduleJob, upsertScheduleJob } from './schedule-job'

type SyncScheduleOptions = { throwOnError?: boolean; previousTask?: TaskDefinition | null }

export async function syncTaskSchedule(db: DrizzleInstance, task: TaskDefinition, options: SyncScheduleOptions = {}) {
  logger.info({ taskId: task.id }, 'syncing task schedule')
  if (!task.enabled) {
    await disableTaskSchedule(db, task.id, options)
    return
  }

  const cronChanged = options.previousTask?.cron && options.previousTask.cron !== task.cron
  if (cronChanged) {
    logger.info({ taskId: task.id }, 'task cron updated; rescheduling')
    await removeScheduleJob(task.id, options)
    const queuedJobIds = await removeQueuedJobs(task.id, options)
    await upsertScheduleJob(task, options)
    await clearPendingExecutionsByIds(db, queuedJobIds)
    await clearPendingExecutionsByTaskId(db, task.id)
    await updateNextRunAt(db, task.id, parseCronNextRunTime(task.cron))
    return
  }

  await upsertScheduleJob(task, options)
}

async function disableTaskSchedule(db: DrizzleInstance, taskId: number, options: SyncScheduleOptions) {
  logger.info({ taskId }, 'task disabled; removing schedule and queued jobs')
  await removeScheduleJob(taskId, options)
  await removeQueuedJobs(taskId, options)
  await clearPendingExecutionsByTaskId(db, taskId)
  await updateNextRunAt(db, taskId, null)
}

async function clearPendingExecutionsByTaskId(db: DrizzleInstance, taskId: number) {
  logger.info({ taskId }, 'clearing pending executions for task')
  await db
    .delete(scheme.taskExecutions)
    .where(
      and(
        eq(scheme.taskExecutions.taskId, taskId),
        inArray(scheme.taskExecutions.status, ['waiting', 'delayed', 'stalled']),
      ),
    )
}

async function clearPendingExecutionsByIds(db: DrizzleInstance, jobIds: string[]) {
  if (jobIds.length === 0) return
  logger.info({ jobCount: jobIds.length }, 'clearing pending executions for queued jobs')
  await db.delete(scheme.taskExecutions).where(inArray(scheme.taskExecutions.id, jobIds))
}

async function updateNextRunAt(db: DrizzleInstance, taskId: number, nextRunAt: Date | null) {
  await db.insert(scheme.taskMetrics).values({ taskId, nextRunAt }).onConflictDoUpdate({
    target: scheme.taskMetrics.taskId,
    set: { nextRunAt },
  })
}
