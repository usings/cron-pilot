import type { SQLiteBunDatabase } from 'drizzle-orm/bun-sqlite'
import { Database as SQLiteBun } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { CONFIG } from '#api/config'
import { relations } from './relations'
import * as schema from './schema'

export type DrizzleInstance = SQLiteBunDatabase<typeof schema, typeof relations>

const sqliteClient = new SQLiteBun(CONFIG.DB_URL)
applySqlitePragmas(sqliteClient)

export const db: DrizzleInstance = drizzle({ client: sqliteClient, schema, relations })

await migrate(db, { migrationsFolder: CONFIG.DB_MIGRATIONS_FOLDER })

function applySqlitePragmas(sqliteClient: SQLiteBun) {
  sqliteClient.run('PRAGMA foreign_keys = ON;')
  sqliteClient.run('PRAGMA busy_timeout = 5000;')
  sqliteClient.run('PRAGMA journal_mode = WAL;')
  sqliteClient.run('PRAGMA synchronous = NORMAL;')
  sqliteClient.run('PRAGMA wal_autocheckpoint = 1000;')
  sqliteClient.run('PRAGMA optimize;')
}
