import type { JobSchedulerJson } from 'bullmq'
import { Queue, QueueEvents } from 'bullmq'
import { CONFIG } from '#api/config'
import { logger } from '#api/libs/logger'
import { db } from '../db/client'
import { recordExecutionStatus } from './execution-tracker'

export interface ExecutionResult {
  exitCode: number | null
  stdout?: string
  stderr?: string
}

export interface ExecutionJobPayload {
  taskId: number
  command: string
  envs?: Record<string, string> | null
  executionResult?: ExecutionResult
  skipped?: boolean
}

export type ExecutionJobScheduler = JobSchedulerJson<ExecutionJobPayload>

export const executionQueue = new Queue<ExecutionJobPayload>(CONFIG.QUEUE_NAME, {
  connection: CONFIG.QUEUE_CONNECTION_OPTIONS,
})

export const executionQueueEvents = new QueueEvents(CONFIG.QUEUE_NAME, {
  connection: CONFIG.QUEUE_CONNECTION_OPTIONS,
  autorun: false,
})

executionQueueEvents.on('waiting', ({ jobId }) => {
  void recordExecutionStatus(db, 'waiting', jobId).catch((error) =>
    logger.error({ err: error, jobId, status: 'waiting' }, 'queue event handler failed'),
  )
})

executionQueueEvents.on('active', ({ jobId }) => {
  void recordExecutionStatus(db, 'active', jobId).catch((error) =>
    logger.error({ err: error, jobId, status: 'active' }, 'queue event handler failed'),
  )
})

executionQueueEvents.on('delayed', ({ jobId }) => {
  void recordExecutionStatus(db, 'delayed', jobId).catch((error) =>
    logger.error({ err: error, jobId, status: 'delayed' }, 'queue event handler failed'),
  )
})

executionQueueEvents.on('stalled', ({ jobId }) => {
  void recordExecutionStatus(db, 'stalled', jobId).catch((error) =>
    logger.error({ err: error, jobId, status: 'stalled' }, 'queue event handler failed'),
  )
})

executionQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  void recordExecutionStatus(db, 'completed', jobId, { result: returnvalue as unknown as ExecutionResult }).catch(
    (error) => logger.error({ err: error, jobId, status: 'completed' }, 'queue event handler failed'),
  )
})

executionQueueEvents.on('failed', ({ jobId, failedReason }) => {
  void recordExecutionStatus(db, 'failed', jobId, { failedReason }).catch((error) =>
    logger.error({ err: error, jobId, status: 'failed' }, 'queue event handler failed'),
  )
})

executionQueueEvents.on('error', (error) => {
  logger.error({ err: error }, 'queue events stream error')
})
