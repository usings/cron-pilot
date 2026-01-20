import { Elysia } from 'elysia'
import { withAuth } from '#api/plugins/auth'
import { withDb } from '#api/plugins/db'
import { createSchema, executionsQuerySchema, taskIdParamSchema, taskListQuerySchema, updateSchema } from './schema'
import {
  createTask,
  deleteTask,
  getTaskById,
  getTaskExecutions,
  getTaskMetrics,
  listTasks,
  updateTask,
} from './service'

export const tasks = new Elysia({ prefix: '/tasks' })
  .use(withDb)
  .use(withAuth)
  /**
   * List tasks with cursor pagination and optional name filter.
   */
  .get('/', ({ db, query }) => listTasks(db, query), {
    query: taskListQuerySchema,
  })
  /**
   * Create a new task and register its schedule.
   */
  .post('/', ({ db, body }) => createTask(db, body), {
    body: createSchema,
  })
  .group('/:id', (app) =>
    app.guard({ params: taskIdParamSchema }, (guarded) =>
      guarded
        /**
         * Get a single task by id.
         */
        .get('/', ({ db, params }) => getTaskById(db, params.id))
        /**
         * Update a task and sync its schedule state.
         */
        .patch('/', ({ db, body, params }) => updateTask(db, params.id, body), {
          body: updateSchema,
        })
        /**
         * Delete a task and clean up scheduled jobs.
         */
        .delete('/', ({ db, params }) => deleteTask(db, params.id))
        /**
         * Get metrics summary for a task.
         */
        .get('/metrics', ({ db, params }) => getTaskMetrics(db, params.id))
        /**
         * List recent executions for a task.
         */
        .get('/executions', ({ db, query, params }) => getTaskExecutions(db, params.id, query), {
          query: executionsQuerySchema,
        }),
    ),
  )
