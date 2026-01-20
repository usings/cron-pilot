import Elysia from 'elysia'

export const withSecurityHeaders = new Elysia({ name: 'plugin:security-headers' }).onAfterHandle(
  { as: 'scoped' },
  ({ set }) => {
    Object.assign(set.headers, {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=()',
    })
  },
)
