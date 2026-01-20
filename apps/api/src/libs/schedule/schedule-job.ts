import type { TaskDefinition } from '#api/libs/db/types'
import { ErrorCode } from 'bullmq'
import { logger } from '#api/libs/logger'
import { executionQueue } from './queue'

type SchedulerOptions = {
  throwOnError?: boolean
}

export async function upsertScheduleJob(task: TaskDefinition, options: SchedulerOptions = {}) {
  if (!task.enabled) {
    logger.info({ taskId: task.id }, 'task disabled; skipping schedule')
    return true
  }
  try {
    await executionQueue.upsertJobScheduler(
      String(task.id),
      { pattern: task.cron },
      {
        name: task.name,
        data: { taskId: task.id, command: task.command, envs: task.envs },
        opts: {
          removeOnComplete: true,
          removeOnFail: true,
        },
      },
    )
    logger.info({ taskId: task.id }, 'task scheduled')
    return true
  } catch (error) {
    logger.error({ err: error, taskId: task.id }, 'task schedule failed')
    if (options.throwOnError) {
      throw error
    }
    return false
  }
}

export async function removeScheduleJob(taskId: number, options: SchedulerOptions = {}) {
  try {
    await executionQueue.removeJobScheduler(String(taskId))
    logger.info({ taskId }, 'task unscheduled')
    return true
  } catch (error) {
    logger.error({ err: error, taskId }, 'task unschedule failed')
    if (options.throwOnError) {
      throw error
    }
    return false
  }
}

export async function removeQueuedJobs(taskId: number, options: SchedulerOptions = {}) {
  try {
    const jobs = await executionQueue.getJobs(['waiting', 'delayed', 'prioritized', 'paused', 'waiting-children'])
    const normalizedTaskId = Number(taskId)
    const jobIds: string[] = []
    for (const job of jobs) {
      if (Number(job.data?.taskId) !== normalizedTaskId) continue
      const jobId = String(job.id)
      try {
        await job.remove()
        jobIds.push(jobId)
      } catch (error) {
        if (shouldIgnoreRemovalError(error)) continue
        throw error
      }
    }
    logger.info({ taskId }, 'queued jobs removed')
    return jobIds
  } catch (error) {
    logger.error({ err: error, taskId }, 'queued job removal failed')
    if (options.throwOnError) {
      throw error
    }
    return []
  }
}

function shouldIgnoreRemovalError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  if (!('code' in error)) return false

  const code = (error as Error & { code?: number }).code
  return (
    code === ErrorCode.JobBelongsToJobScheduler ||
    code === ErrorCode.JobNotInState ||
    code === ErrorCode.JobLockNotExist ||
    code === ErrorCode.JobLockMismatch
  )
}
