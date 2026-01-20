import { Elysia } from 'elysia'
import { auth } from './auth/route'
import { tasks } from './tasks/route'

export const routes = new Elysia().use(auth).use(tasks)

export type APIService = typeof routes
