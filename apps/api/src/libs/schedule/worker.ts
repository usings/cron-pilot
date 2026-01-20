import type { ExecutionJobPayload } from './queue'
import { Worker } from 'bullmq'
import { $ } from 'bun'
import { CONFIG } from '../../config'
import { logger } from '../logger'

export const executionWorker = new Worker<ExecutionJobPayload>(
  CONFIG.QUEUE_NAME,
  async (job) => {
    const payload = job.data
    if (!payload) {
      logger.warn({ jobId: job.id }, 'job payload missing; skipping execution')
      return
    }

    const { taskId, skipped } = payload
    if (!payload.command) {
      logger.warn({ taskId, jobId: job.id }, 'command missing; skipping execution')
      return
    }

    if (skipped) {
      logger.info({ taskId, jobId: job.id }, 'execution skipped; task deleted')
      return
    }

    return await runTaskCommand(payload, String(job.id))
  },
  {
    autorun: false,
    connection: CONFIG.QUEUE_CONNECTION_OPTIONS,
    concurrency: CONFIG.QUEUE_WORKER_CONCURRENCY,
  },
)

executionWorker.on('error', (error) => {
  logger.error({ err: error }, 'worker runtime error')
})

async function runTaskCommand(task: ExecutionJobPayload, jobId?: string) {
  try {
    const envs = task.envs ?? {}
    const {
      stdout: rawStdout,
      stderr: rawStderr,
      exitCode,
    } = await $`bash -c ${task.command}`
      .env({ ...process.env, ...envs })
      .nothrow()
      .quiet()

    return {
      exitCode,
      stdout: trimExecutionOutput(rawStdout?.toString()),
      stderr: trimExecutionOutput(rawStderr?.toString()),
    }
  } catch (error) {
    logger.error(
      { err: error, command: task.command, taskId: task.taskId, executionId: jobId },
      'command execution failed',
    )
    return {
      exitCode: null,
      stderr: error instanceof Error ? error.message : String(error),
    }
  }
}
const MAX_OUTPUT_CHARS = 10_000

function trimExecutionOutput(output?: string | null) {
  if (output === null || output === undefined) return output ?? undefined
  if (output.length <= MAX_OUTPUT_CHARS) return output
  return `${output.slice(0, MAX_OUTPUT_CHARS)}\n...[truncated ${output.length - MAX_OUTPUT_CHARS} chars]`
}
