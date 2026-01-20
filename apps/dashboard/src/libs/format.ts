const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>()

function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function getDateTimeFormatter(timeZone: string) {
  const cached = dateTimeFormatters.get(timeZone)
  if (cached) return cached

  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  })
  dateTimeFormatters.set(timeZone, formatter)
  return formatter
}

export function formatDateTime(value: string | number | Date | null | undefined) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const timeZone = getDeviceTimeZone()
  return getDateTimeFormatter(timeZone).format(date)
}
