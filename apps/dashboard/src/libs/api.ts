import type { APIService } from '#api/routes'
import { treaty } from '@elysiajs/eden'
import { toast } from 'sonner'
import { clearAuthToken, getAuthToken } from '#dashboard/libs/auth'

export const api = treaty<APIService>(import.meta.env.VITE_API_URL!, {
  keepDomain: true,
  headers: () => {
    const token = getAuthToken()
    return token ? { authorization: `Bearer ${token}` } : undefined
  },
  onResponse(response) {
    if (response.status === 401) {
      handleAuthExpiry()
    }
  },
})

type EdenResponse<D, E = unknown> = {
  data: D | null
  error: E | null
}

export function unwrap<D, E = unknown>(response: EdenResponse<D, E>): D {
  if (response.error) {
    throw response.error
  }
  if (response.data == null) throw new Error('empty response data')
  return response.data
}

let authExpiredHandled = false

function handleAuthExpiry() {
  if (authExpiredHandled || !getAuthToken() || location.pathname.startsWith('/signin')) {
    return
  }

  authExpiredHandled = true

  clearAuthToken()
  toast.error('Session expired. Please sign in again.')

  setTimeout(redirectToSignin, 1500)
}

function redirectToSignin() {
  const { pathname, search, hash } = location
  const redirect = `${pathname}${search}${hash}`
  location.assign(`/signin?redirect=${encodeURIComponent(redirect)}`)
}
