import { Elysia, ValidationError } from 'elysia'
import { logger } from '#api/libs/logger'

export class HttpError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const withError = new Elysia({ name: 'plugin:error' }).onError({ as: 'scoped' }, ({ error, set }) => {
  if (error instanceof HttpError) {
    set.status = error.status
    return {
      data: null,
      meta: { message: error.message || 'request failed.', code: error.code },
    }
  }

  if (error instanceof ValidationError) {
    const err = JSON.parse(error.message)

    set.status = error.status
    return {
      data: null,
      meta: { message: err.message, code: 'VALIDATION_ERROR' },
    }
  }

  logger.error({ err: error }, 'unhandled error')
  set.status = 500
  return {
    data: null,
    meta: { message: 'internal server error', code: 'INTERNAL_SERVER_ERROR' },
  }
})
