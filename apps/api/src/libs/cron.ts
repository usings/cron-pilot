import { CronExpressionParser } from 'cron-parser'
import { logger } from './logger'

export function parseCronNextRunTime(cronExpression: string): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronExpression)
    return interval.next().toDate()
  } catch (error) {
    logger.error({ err: error, cronExpression }, 'invalid cron expression')
    return null
  }
}

export function parseCronExpression(cronExpression: string) {
  return CronExpressionParser.parse(cronExpression)
}
