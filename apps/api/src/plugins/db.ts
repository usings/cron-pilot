import { Elysia } from 'elysia'
import { db } from '#api/libs/db/client'

export const withDb = new Elysia({ name: 'plugin:db' }).decorate('db', db)
