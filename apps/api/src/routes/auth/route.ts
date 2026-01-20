import { Elysia } from 'elysia'
import { z } from 'zod'
import { CONFIG } from '#api/config'
import { signAuthToken } from '#api/plugins/auth'
import { HttpError } from '#api/plugins/error'

export const auth = new Elysia({ prefix: '/auth' }).post(
  '/signin',
  async ({ body }) => {
    const { username, password } = body

    if (username !== CONFIG.AUTH_USERNAME || password !== CONFIG.AUTH_PASSWORD) {
      throw new HttpError(401, 'AUTH_INVALID', 'invalid username or password.')
    }

    const token = await signAuthToken(username)

    return {
      data: { token },
      meta: null,
    }
  },
  {
    body: z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }),
  },
)
