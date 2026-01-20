import { redirect } from '@tanstack/react-router'
import { isAuthenticated } from '#dashboard/libs/auth'

const DEFAULT_AFTER_LOGIN = '/'

/**
 * Sanitize redirect target to prevent open redirect vulnerabilities.
 * Only allows internal paths that start with a single `/`.
 */
export function sanitizeRedirectTarget(value?: string) {
  if (!value) return DEFAULT_AFTER_LOGIN
  if (!value.startsWith('/')) return DEFAULT_AFTER_LOGIN
  if (value.startsWith('//')) return DEFAULT_AFTER_LOGIN // scheme-relative URL
  if (value.includes('\\')) return DEFAULT_AFTER_LOGIN
  return value
}

/**
 * Guard for protected routes.
 * Redirects unauthenticated users to the sign-in page
 * and attaches the current location as `redirect`.
 */
export function requireAuth(options: { signinPath: string }) {
  const { signinPath } = options

  return ({ location }: { location: { href: string } }) => {
    if (isAuthenticated()) return

    throw redirect({
      to: signinPath,
      search: {
        redirect: location.href,
      },
      // replace: true, // Optional: avoid polluting browser history
    })
  }
}

/**
 * Guard for guest-only routes (e.g. /signin, /signup).
 * Redirects authenticated users away from guest pages.
 */
export function requireGuest(options: { defaultTo: string }) {
  const { defaultTo } = options

  return ({ search }: { search: { redirect?: string } }) => {
    if (!isAuthenticated()) return

    throw redirect({
      to: sanitizeRedirectTarget(search.redirect ?? defaultTo),
    })
  }
}
