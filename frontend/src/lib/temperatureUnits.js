/* Author: Nandar Lin */

/** @param {number} celsius */
export function celsiusToFahrenheit(celsius) {
  return celsius * 1.8 + 32
}

/**
 * @param {number | null | undefined} celsius
 * @param {boolean} useFahrenheit
 */
export function formatTemperature(celsius, useFahrenheit) {
  if (!Number.isFinite(celsius)) return '—'
  if (useFahrenheit) {
    return `${Math.round(celsiusToFahrenheit(celsius))}°F`
  }
  return `${Math.round(celsius)}°C`
}

/**
 * @param {number | null | undefined} celsius
 * @param {boolean} useFahrenheit
 */
export function temperatureChartValue(celsius, useFahrenheit) {
  if (!Number.isFinite(celsius)) return null
  return useFahrenheit ? celsiusToFahrenheit(celsius) : celsius
}
