import cors from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { CONFIG } from './config'
import { logger } from './libs/logger'
import { runExecutionQueue } from './libs/schedule/run'
import { withError } from './plugins/error'
import { withSecurityHeaders } from './plugins/security-headers'
import { routes } from './routes'

runExecutionQueue()

new Elysia()
  .use(cors())
  .use(withSecurityHeaders)
  .use(withError)
  .use(routes)
  .on('start', ({ server }) => {
    logger.info({ origin: server.url.origin }, 'server started')
  })
  .listen(CONFIG.PORT)
