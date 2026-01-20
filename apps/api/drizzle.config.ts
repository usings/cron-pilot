import { defineConfig } from 'drizzle-kit'
import { CONFIG } from './src/config'

export default defineConfig({
  out: CONFIG.DB_MIGRATIONS_FOLDER,
  schema: 'src/libs/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: CONFIG.DB_URL,
  },
})
