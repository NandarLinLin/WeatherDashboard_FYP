/* Author: Nandar Lin */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`
}

/**
 * Milliseconds for the city's civil clock reading at a UTC instant, without using the browser's local zone.
 * OpenWeather `timezone` is seconds east of UTC (e.g. +28800 for UTC+8).
 * @param {number} unixTimestampSeconds - UTC Unix seconds (e.g. `dt`, `sunrise`, `sunset`)
 * @param {number} timezoneOffsetSeconds - City offset from UTC in seconds
 * @returns {number} ms suitable for `new Date(ms)` + `getUTC*` getters only
 */
export function cityTimeInMsFromUnix(unixTimestampSeconds, timezoneOffsetSeconds) {
  const dt = Number(unixTimestampSeconds)
  const tz = Number.isFinite(timezoneOffsetSeconds) ? timezoneOffsetSeconds : 0
  if (!Number.isFinite(dt)) return NaN
  return (dt + tz) * 1000
}

/**
 * @returns {{ hours: number, minutes: number } | null}
 */
function cityLocalComponentsFromUnix(unixTimestampSeconds, timezoneOffsetSeconds) {
  const cityTimeInMs = cityTimeInMsFromUnix(unixTimestampSeconds, timezoneOffsetSeconds)
  if (!Number.isFinite(cityTimeInMs)) return null
  const date = new Date(cityTimeInMs)
  if (Number.isNaN(date.getTime())) return null

  return {
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
  }
}

function localMinutesFromUnix(unixTimestampSeconds, timezoneOffsetSeconds) {
  const c = cityLocalComponentsFromUnix(unixTimestampSeconds, timezoneOffsetSeconds)
  if (!c) return null
  return c.hours * 60 + c.minutes
}

/**
 * 12-hour time string using only getUTC* on `(unix + timezone) * 1000` (browser local zone never applied).
 * @param {number} unixTimestampSeconds
 * @param {number} timezoneOffsetSeconds
 * @returns {string}
 */
export function formatLocalTime(unixTimestampSeconds, timezoneOffsetSeconds) {
  const c = cityLocalComponentsFromUnix(unixTimestampSeconds, timezoneOffsetSeconds)
  if (!c) return '—'

  const h = c.hours
  const m = c.minutes
  const ampm = h >= 12 ? 'PM' : 'AM'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${pad2(m)} ${ampm}`
}

/**
 * 24-hour `HH:mm` for charts so the x-axis order matches local afternoon (14:00–16:00) for every city.
 * @param {number} unixTimestampSeconds
 * @param {number} timezoneOffsetSeconds
 * @returns {string}
 */
export function formatLocalTime24h(unixTimestampSeconds, timezoneOffsetSeconds) {
  const c = cityLocalComponentsFromUnix(unixTimestampSeconds, timezoneOffsetSeconds)
  if (!c) return '—'
  return `${pad2(c.hours)}:${pad2(c.minutes)}`
}

/**
 * Long calendar date in the city's local frame (UTC getters on pure-offset time).
 */
export function formatLocalDateLong(unixTimestampSeconds, timezoneOffsetSeconds) {
  const cityTimeInMs = cityTimeInMsFromUnix(unixTimestampSeconds, timezoneOffsetSeconds)
  if (!Number.isFinite(cityTimeInMs)) return ''
  const date = new Date(cityTimeInMs)
  if (Number.isNaN(date.getTime())) return ''

  const dayName = WEEKDAYS[date.getUTCDay()]
  const monthName = MONTHS[date.getUTCMonth()]
  const dayNum = date.getUTCDate()
  return `${dayName}, ${monthName} ${dayNum}`
}

/**
 * True when local civil time is after sunset or before sunrise (night: between sunset and next sunrise).
 * When true, use a moon/night icon instead of the daytime OWM icon.
 */
export function isLocalNightBetweenSunsetAndSunrise(
  nowUnixSeconds,
  timezoneOffsetSeconds,
  sunriseEpochSeconds,
  sunsetEpochSeconds,
) {
  if (!Number.isFinite(sunriseEpochSeconds) || !Number.isFinite(sunsetEpochSeconds)) return false

  const n = localMinutesFromUnix(nowUnixSeconds, timezoneOffsetSeconds)
  const rs = localMinutesFromUnix(sunriseEpochSeconds, timezoneOffsetSeconds)
  const st = localMinutesFromUnix(sunsetEpochSeconds, timezoneOffsetSeconds)
  if (n == null || rs == null || st == null) return false

  if (rs < st) {
    return n >= st || n < rs
  }

  return false
}
