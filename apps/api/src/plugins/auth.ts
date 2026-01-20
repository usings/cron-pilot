import { Elysia } from 'elysia'
import { jwtVerify, SignJWT } from 'jose'
import { CONFIG } from '#api/config'
import { HttpError } from '#api/plugins/error'

export const withAuth = new Elysia({ name: 'plugin:auth' })
  .resolve({ as: 'scoped' }, async ({ headers }) => {
    const authorization = headers.authorization
    const bearer = getBearerToken(authorization)
    if (!bearer) return { auth: null }

    const user = await verifyAuthToken(bearer)

    return { auth: user ?? null }
  })
  .onBeforeHandle({ as: 'scoped' }, ({ auth }) => {
    if (!auth) {
      throw new HttpError(401, 'AUTH_REQUIRED', 'authentication required.')
    }
  })

const AUTH_SECRET = new TextEncoder().encode(CONFIG.AUTH_SECRET)

function getBearerToken(authorization?: string) {
  if (!authorization) return

  // "Bearer <token>"
  const [scheme, token] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return

  return token
}

export async function signAuthToken(subject: string) {
  return new SignJWT({ sub: subject })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(AUTH_SECRET)
}

export async function verifyAuthToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET, { algorithms: ['HS256'] })
    return payload
  } catch {
    return null
  }
}
