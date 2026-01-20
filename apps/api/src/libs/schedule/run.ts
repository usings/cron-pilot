import { executionQueueEvents } from './queue'
import { executionWorker } from './worker'

export function runExecutionQueue() {
  executionQueueEvents.run()
  executionWorker.run()
}
