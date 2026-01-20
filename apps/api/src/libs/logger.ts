import pino from 'pino'

export const logger = pino({
  base: null,
  ...(process.env.NODE_ENV === 'production'
    ? {
        formatters: {
          level: (label) => ({ level: label }),
        },
      }
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: false,
            ignore: 'time,level',
          },
        },
      }),
})
