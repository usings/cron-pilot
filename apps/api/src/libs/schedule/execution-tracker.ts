import type { Job } from 'bullmq'
import type { DrizzleInstance } from '#api/libs/db/client'
import type { TaskExecution } from '#api/libs/db/types'
import type { ExecutionJobPayload, ExecutionResult } from './queue'
import { eq, sql } from 'drizzle-orm'
import * as schema from '#api/libs/db/schema'
import { logger } from '#api/libs/logger'
import { executionQueue } from './queue'
import { removeQueuedJobs, removeScheduleJob } from './schedule-job'

export type ExecutionStatus = TaskExecution['status']

type ExecutionContext = {
  result?: ExecutionResult
  failedReason?: string
}

type StatusHandlerContext = {
  db: DrizzleInstance
  taskId: number
  jobId: string
  job?: Job<ExecutionJobPayload>
  repeatInfo?: {
    taskId: number
    nextRunAt: Date
  }
}

const statusHandlers: Partial<Record<ExecutionStatus, (context: StatusHandlerContext) => Promise<void>>> = {
  delayed: async ({ db, taskId, repeatInfo, job }) => {
    const nextRunAt =
      repeatInfo?.nextRunAt ??
      (typeof job?.timestamp === 'number' && typeof job?.opts?.delay === 'number'
        ? new Date(job.timestamp + job.opts.delay)
        : undefined)
    if (nextRunAt) {
      await updateNextRunAt(db, { taskId, nextRunAt })
    }
  },
  stalled: async ({ jobId, taskId }) => {
    logger.warn({ taskId, jobId }, 'execution stalled; job will retry if attempts remain')
  },
}

export async function recordExecutionStatus(
  db: DrizzleInstance,
  status: ExecutionStatus,
  jobId: string | number | undefined,
  context?: ExecutionContext,
) {
  if (!jobId) return
  const normalizedJobId = String(jobId)

  const job = await executionQueue.getJob(normalizedJobId)
  if (job?.data.skipped) return

  const repeatInfo = parseRepeatJobId(normalizedJobId)
  const taskId = job?.data?.taskId ?? repeatInfo?.taskId
  if (!taskId) return

  const [existingTask] = await db
    .select({ id: schema.taskDefinitions.id })
    .from(schema.taskDefinitions)
    .where(eq(schema.taskDefinitions.id, taskId))

  if (!existingTask) {
    logger.error(
      { taskId, jobId: normalizedJobId },
      'execution status for deleted task; cleaning up schedule and queue',
    )
    await job?.updateData({ ...job.data, skipped: true })
    await removeScheduleJob(taskId)
    await removeQueuedJobs(taskId)
    return
  }

  const jobStartedAt = typeof job?.processedOn === 'number' ? new Date(job.processedOn) : undefined
  const jobFinishedAt = typeof job?.finishedOn === 'number' ? new Date(job.finishedOn) : undefined

  const statusHandler = statusHandlers[status]
  if (statusHandler) {
    await statusHandler({ db, taskId, jobId: normalizedJobId, job, repeatInfo })
  }

  const isTerminal = isTerminalStatus(status)
  const result = isTerminal ? (context?.result ?? job?.data?.executionResult) : undefined
  const exitCode = isTerminal ? (result?.exitCode ?? null) : null
  const stdout = isTerminal ? result?.stdout : undefined
  const stderr = isTerminal ? (result?.stderr ?? context?.failedReason) : context?.failedReason

  const { finishedAt, existingStatus } = await upsertExecutionStatus(db, {
    jobId: normalizedJobId,
    taskId,
    status,
    exitCode,
    stdout,
    stderr,
    jobStartedAt,
    jobFinishedAt,
  })

  const attempts = typeof job?.opts?.attempts === 'number' ? job.opts.attempts : undefined
  const attemptsMade = typeof job?.attemptsMade === 'number' ? job.attemptsMade : undefined
  const isRetrying =
    status === 'failed' && attempts !== undefined && attemptsMade !== undefined && attemptsMade < attempts

  const wasTerminal = existingStatus ? isTerminalStatus(existingStatus) : false
  if (!isTerminal || !finishedAt || wasTerminal || isRetrying) {
    return
  }

  await updateTaskStats(db, { taskId, status, finishedAt })
}

async function upsertExecutionStatus(
  db: DrizzleInstance,
  payload: {
    jobId: string
    taskId: number
    status: ExecutionStatus
    exitCode?: number | null
    stdout?: string
    stderr?: string
    jobStartedAt?: Date
    jobFinishedAt?: Date
  },
) {
  const now = new Date()
  const [existing] = await db.select().from(schema.taskExecutions).where(eq(schema.taskExecutions.id, payload.jobId))
  const existingStatus = existing?.status
  const startedAtFromDb = existing?.startedAt ? new Date(existing.startedAt) : null
  const finishedAtFromDb = existing?.finishedAt ? new Date(existing.finishedAt) : null

  const isTerminal = isTerminalStatus(payload.status)
  const wasTerminal = existingStatus ? isTerminalStatus(existingStatus) : false
  if (wasTerminal && !isTerminal) {
    return { startedAt: startedAtFromDb, finishedAt: finishedAtFromDb, existingStatus }
  }

  if (wasTerminal && existingStatus === payload.status && finishedAtFromDb) {
    return { startedAt: startedAtFromDb, finishedAt: finishedAtFromDb, existingStatus }
  }

  if (existingStatus === payload.status && !isTerminal) {
    if (payload.status !== 'active' || startedAtFromDb) {
      return { startedAt: startedAtFromDb, finishedAt: finishedAtFromDb, existingStatus }
    }
  }

  let startedAt: Date | null = null
  let finishedAt: Date | null = null

  if (isTerminal) {
    const terminalStartedAt = payload.jobStartedAt ?? startedAtFromDb ?? now
    const terminalFinishedAt = payload.jobFinishedAt ?? finishedAtFromDb ?? now
    startedAt = terminalFinishedAt < terminalStartedAt ? terminalFinishedAt : terminalStartedAt
    finishedAt = terminalFinishedAt
  } else if (payload.status === 'active') {
    startedAt = payload.jobStartedAt ?? now
  } else {
    startedAt = startedAtFromDb
  }
  const durationMs = startedAt && finishedAt ? finishedAt.getTime() - startedAt.getTime() : null
  const exitCode = isTerminal ? (payload.exitCode ?? null) : null
  const stdout = isTerminal ? (payload.stdout ?? null) : null
  const stderr = isTerminal ? (payload.stderr ?? null) : null

  const values = {
    id: payload.jobId,
    taskId: payload.taskId,
    status: payload.status,
    exitCode,
    stdout: stdout ?? null,
    stderr: stderr ?? null,
    startedAt,
    finishedAt,
    durationMs,
    updatedAt: now,
  }

  const updateSet: Partial<typeof schema.taskExecutions.$inferInsert> = {
    status: payload.status,
    updatedAt: now,
  }

  if (startedAt !== null) updateSet.startedAt = startedAt
  if (finishedAt !== null) updateSet.finishedAt = finishedAt
  if (durationMs !== null) updateSet.durationMs = durationMs
  if (isTerminal) {
    updateSet.exitCode = exitCode ?? null
    updateSet.stdout = stdout ?? null
    updateSet.stderr = stderr ?? null
  }

  await db.insert(schema.taskExecutions).values(values).onConflictDoUpdate({
    target: schema.taskExecutions.id,
    set: updateSet,
  })
  return { startedAt, finishedAt, existingStatus }
}

async function updateTaskStats(
  db: DrizzleInstance,
  payload: {
    taskId: number
    status: ExecutionStatus
    finishedAt: Date
  },
) {
  const { taskId, status, finishedAt } = payload
  const isFailedRun = status === 'failed'

  await db
    .insert(schema.taskMetrics)
    .values({
      taskId,
      totalRuns: 1,
      failedRuns: isFailedRun ? 1 : 0,
      lastRunAt: finishedAt,
    })
    .onConflictDoUpdate({
      target: schema.taskMetrics.taskId,
      set: {
        totalRuns: sql`${schema.taskMetrics.totalRuns} + 1`,
        failedRuns: isFailedRun ? sql`${schema.taskMetrics.failedRuns} + 1` : schema.taskMetrics.failedRuns,
        lastRunAt: finishedAt,
      },
    })
}

async function updateNextRunAt(
  db: DrizzleInstance,
  payload: {
    taskId: number
    nextRunAt: Date
  },
) {
  const { taskId, nextRunAt } = payload

  await db.insert(schema.taskMetrics).values({ taskId, nextRunAt }).onConflictDoUpdate({
    target: schema.taskMetrics.taskId,
    set: { nextRunAt },
  })
}

function parseRepeatJobId(candidate: string) {
  const match = candidate.match(/^repeat:(\d+):(\d+)$/)
  if (!match) return undefined
  return { taskId: Number(match[1]), nextRunAt: new Date(Number(match[2])) }
}

function isTerminalStatus(status: ExecutionStatus) {
  return status === 'completed' || status === 'failed'
}
