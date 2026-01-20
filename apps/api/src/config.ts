/** biome-ignore-all lint/style/useNamingConvention: constants */
import type { ConnectionOptions } from 'bullmq'

/**
 * App configuration values.
 */
export const CONFIG = {
  /**
   * Port number for the HTTP server.
   */
  PORT: 3030,

  /**
   * JWT signing secret used for dashboard authentication.
   */
  AUTH_SECRET: process.env.AUTH_SECRET ?? 'change-me',

  /**
   * Username for dashboard authentication.
   */
  AUTH_USERNAME: process.env.AUTH_USERNAME ?? 'root',

  /**
   * Password for dashboard authentication.
   */
  AUTH_PASSWORD: process.env.AUTH_PASSWORD ?? 'password',

  /**
   * SQLite database file path.
   */
  DB_URL: process.env.NODE_ENV === 'production' ? '/data/sqlite.db' : `${process.cwd()}/sqlite.db`,

  /**
   * Folder name that contains database migration files.
   */
  DB_MIGRATIONS_FOLDER: 'drizzle',

  /**
   * BullMQ queue name used for task execution jobs.
   */
  QUEUE_NAME: 'executions',

  /**
   * Shared Redis connection options for BullMQ workers and queues.
   */
  QUEUE_CONNECTION_OPTIONS: {
    url: process.env.REDIS_URL,
  } satisfies ConnectionOptions,

  /**
   * Maximum number of tasks a worker can process concurrently.
   */
  QUEUE_WORKER_CONCURRENCY: 5,
} as const
