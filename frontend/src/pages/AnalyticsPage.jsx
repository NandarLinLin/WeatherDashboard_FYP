/* Author: Nandar Lin */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import AirRoundedIcon from '@mui/icons-material/AirRounded'
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded'
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded'
import WhatshotRoundedIcon from '@mui/icons-material/WhatshotRounded'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAuth } from '../context/useAuth.js'
import { fetchFavoriteCities } from '../lib/favoritesApi.js'
import { celsiusToFahrenheit, formatTemperature } from '../lib/temperatureUnits.js'
import { fetchCityWeather } from '../lib/weatherApi.js'

const DEFAULT_CITY_NAMES = ['London', 'Tokyo', 'New York', 'Mandalay']

function formatWindSpeedMetersPerSecond(speedMetersPerSecond) {
  const value = typeof speedMetersPerSecond === 'number' ? speedMetersPerSecond : Number(speedMetersPerSecond)
  if (!Number.isFinite(value)) return '—'
  const kmh = value * 3.6
  return `${Math.round(kmh)} km/h`
}

function windMetersPerSecondFromWeather(weather) {
  const fromWindSpeed = Number(weather?.windSpeed)
  if (Number.isFinite(fromWindSpeed)) return fromWindSpeed
  return Number(weather?.windSpeedMetersPerSecond)
}

function visibilityKmFromWeather(weather) {
  const km = Number(weather?.visibility)
  if (Number.isFinite(km)) return km
  const meters = Number(weather?.visibilityMeters)
  if (Number.isFinite(meters)) return meters / 1000
  return NaN
}

/** Semi-gauge track: 0–3 km red, 3–7 km yellow, 7–10 km green (proportions sum to 10). */
const VISIBILITY_GAUGE_TRACK = [
  { name: '0–3 km', value: 3, fill: '#ef4444' },
  { name: '3–7 km', value: 4, fill: '#eab308' },
  { name: '7–10 km', value: 3, fill: '#22c55e' },
]

const VISIBILITY_GAUGE_MAX_KM = 10

function formatVisibilityKmDisplay(km) {
  if (!Number.isFinite(km)) return '—'
  const rounded = Math.round(km * 10) / 10
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return `${Math.round(rounded)} km`
  return `${rounded} km`
}

function isExactlyTenKm(km) {
  if (!Number.isFinite(km)) return false
  return Math.abs(km - VISIBILITY_GAUGE_MAX_KM) < 0.005
}

function visibilityQualityLabel(km, locationLabel) {
  if (!Number.isFinite(km)) return 'No data'
  if (isExactlyTenKm(km) && locationLabel) {
    return `Perfect Visibility in ${locationLabel}`
  }
  if (km >= 7) return 'Clear Skies'
  if (km >= 3) return 'Moderate visibility'
  return 'Poor visibility'
}

/** Returns `in your favorite cities` for average selection, otherwise `in [CityName]`. */
function insightInPlace(cityLabel) {
  const t = cityLabel && String(cityLabel).trim() ? String(cityLabel).trim() : 'this location'
  if (t === 'your favorite cities' || t === 'your cities') return 'in your favorite cities'
  return `in ${t}`
}

function smartInsightText({ visibilityKm, tempCelsius, humidityPercent, cityLabel }) {
  const place = insightInPlace(cityLabel)
  if (Number.isFinite(visibilityKm) && visibilityKm < 5) {
    return `Low visibility detected ${place}. Drive with extra caution.`
  }
  if (Number.isFinite(tempCelsius) && tempCelsius > 30) {
    return `High heat warning ${place}. Stay hydrated and limit outdoor activity.`
  }
  if (Number.isFinite(humidityPercent) && humidityPercent > 80) {
    return `High humidity warning ${place}. It might feel much hotter than the actual temperature.`
  }
  return `Weather conditions are optimal for outdoor activities ${place}.`
}

function scrollToSection(ref) {
  ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export default function AnalyticsPage() {
  const theme = useTheme()
  const tempChartRef = useRef(null)
  const windChartRef = useRef(null)
  const humidityChartRef = useRef(null)
  const { authHeader, isLoggedIn, useFahrenheit, darkMode } = useAuth()
  const [favoriteCities, setFavoriteCities] = useState([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [citySnapshots, setCitySnapshots] = useState([])
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)
  const [snapshotsError, setSnapshotsError] = useState(null)
  /** `'__average__'` or index into `validSnapshots` as string. Drives visibility gauge and smart insights together. */
  const [selectedCity, setSelectedCity] = useState('__average__')

  const usingDefaultCities = useMemo(
    () => isLoggedIn && !favoritesLoading && favoriteCities.length === 0,
    [isLoggedIn, favoritesLoading, favoriteCities.length],
  )

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!isLoggedIn || !authHeader) {
        await Promise.resolve()
        if (!cancelled) {
          setFavoriteCities([])
          setFavoritesLoading(false)
        }
        return
      }

      setFavoritesLoading(true)
      try {
        const data = await fetchFavoriteCities({ authHeader })
        if (!cancelled) setFavoriteCities(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setFavoriteCities([])
      } finally {
        if (!cancelled) setFavoritesLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, authHeader])

  useEffect(() => {
    if (!isLoggedIn || favoritesLoading) return

    const fromFavorites = [
      ...new Set(
        favoriteCities.map((c) => (c?.cityName || '').trim()).filter(Boolean),
      ),
    ]
    const cityNames = fromFavorites.length > 0 ? fromFavorites : DEFAULT_CITY_NAMES

    let cancelled = false

    void (async () => {
      if (cancelled) return
      setSnapshotsLoading(true)
      setSnapshotsError(null)
      try {
        const settled = await Promise.allSettled(
          cityNames.map((name) => fetchCityWeather(name)),
        )
        if (cancelled) return
        const rows = cityNames.map((city, i) => {
          const r = settled[i]
          if (r.status === 'fulfilled') {
            return { city, weather: r.value, error: null }
          }
          return { city, weather: null, error: r.reason }
        })
        setCitySnapshots(rows)
        const allFailed = rows.every((row) => !row.weather)
        if (allFailed && cityNames.length > 0) {
          setSnapshotsError('Could not load weather for these cities. Try again later.')
        }
      } catch {
        if (!cancelled) {
          setCitySnapshots([])
          setSnapshotsError('Could not load weather. Try again later.')
        }
      } finally {
        if (!cancelled) setSnapshotsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, favoritesLoading, favoriteCities])

  const validSnapshots = useMemo(
    () =>
      citySnapshots.filter(
        (s) =>
          s.weather &&
          Number.isFinite(s.weather.temperatureCelsius) &&
          s.weather.temperatureCelsius !== null,
      ),
    [citySnapshots],
  )

  const insights = useMemo(() => {
    if (validSnapshots.length === 0) {
      return { hottest: null, windiest: null, mostHumid: null }
    }

    let hottest = validSnapshots[0]
    let windiest = validSnapshots[0]
    let mostHumid = validSnapshots[0]

    for (const s of validSnapshots) {
      const w = s.weather
      if (w.temperatureCelsius > hottest.weather.temperatureCelsius) hottest = s
      const wind = windMetersPerSecondFromWeather(w)
      const bestWind = windMetersPerSecondFromWeather(windiest.weather)
      if (Number.isFinite(wind) && (!Number.isFinite(bestWind) || wind > bestWind)) windiest = s
      const hum = w.humidityPercent
      const bestHum = mostHumid.weather.humidityPercent
      if (Number.isFinite(hum) && hum != null && (!Number.isFinite(bestHum) || hum > bestHum)) mostHumid = s
    }

    return { hottest, windiest, mostHumid }
  }, [validSnapshots])

  const barChartData = useMemo(
    () =>
      validSnapshots.map((s) => {
        const c = s.weather.temperatureCelsius
        const bar = useFahrenheit ? celsiusToFahrenheit(c) : c
        return {
          name:
            s.weather?.city && String(s.weather.city).trim()
              ? String(s.weather.city).trim()
              : s.city,
          temperatureCelsius: Math.round(c * 10) / 10,
          temperatureBar: Math.round(bar * 10) / 10,
        }
      }),
    [validSnapshots, useFahrenheit],
  )

  const windBarData = useMemo(
    () =>
      validSnapshots
        .map((s) => {
          const mps = windMetersPerSecondFromWeather(s.weather)
          return {
            name:
              s.weather?.city && String(s.weather.city).trim()
                ? String(s.weather.city).trim()
                : s.city,
            windSpeed: Number.isFinite(mps) ? Math.round(mps * 3.6 * 10) / 10 : null,
          }
        })
        .filter((row) => row.windSpeed != null),
    [validSnapshots],
  )

  const humidityBarData = useMemo(
    () =>
      validSnapshots.map((s) => ({
        name:
          s.weather?.city && String(s.weather.city).trim()
            ? String(s.weather.city).trim()
            : s.city,
        humidityPercent: Number.isFinite(s.weather.humidityPercent)
          ? Math.round(s.weather.humidityPercent)
          : null,
      })).filter((row) => row.humidityPercent != null),
    [validSnapshots],
  )

  const averageVisibilityKm = useMemo(() => {
    const kms = validSnapshots
      .map((s) => visibilityKmFromWeather(s.weather))
      .filter((km) => Number.isFinite(km))
    if (kms.length === 0) return NaN
    return kms.reduce((a, b) => a + b, 0) / kms.length
  }, [validSnapshots])

  const gaugeVisibilityKm = useMemo(() => {
    if (selectedCity === '__average__') return averageVisibilityKm
    const idx = Number.parseInt(selectedCity, 10)
    if (!Number.isInteger(idx) || idx < 0 || idx >= validSnapshots.length) return averageVisibilityKm
    return visibilityKmFromWeather(validSnapshots[idx]?.weather)
  }, [selectedCity, averageVisibilityKm, validSnapshots])

  /** Tint for the front semi-transparent overlay only (not the static red/yellow/green track). */
  const activeOverlayColor = useMemo(() => {
    const km = gaugeVisibilityKm
    if (!Number.isFinite(km)) return 'rgba(148, 163, 184, 0.3)'
    if (km >= 7) return 'rgba(52, 211, 153, 0.3)'
    if (km >= 3) return 'rgba(250, 204, 21, 0.3)'
    return 'rgba(248, 113, 113, 0.3)'
  }, [gaugeVisibilityKm])

  const gaugeNeedleData = useMemo(() => {
    const capped = Number.isFinite(gaugeVisibilityKm)
      ? Math.min(Math.max(gaugeVisibilityKm, 0), VISIBILITY_GAUGE_MAX_KM)
      : 0
    /** Cap sweep slightly below 10 so the green band stays visible at max scale. */
    const needleSweep = Math.min(capped, 9.985)
    return [
      { name: 'reading', value: needleSweep, fill: 'rgba(15, 23, 42, 0.72)' },
      { name: 'rest', value: VISIBILITY_GAUGE_MAX_KM - needleSweep, fill: activeOverlayColor },
    ]
  }, [gaugeVisibilityKm, activeOverlayColor])

  useEffect(() => {
    if (selectedCity === '__average__') return
    const idx = Number.parseInt(selectedCity, 10)
    if (!Number.isInteger(idx) || idx < 0 || idx >= validSnapshots.length) {
      const t = window.setTimeout(() => setSelectedCity('__average__'), 0)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [validSnapshots, selectedCity])

  const hasAnyVisibilityData = useMemo(
    () => validSnapshots.some((s) => Number.isFinite(visibilityKmFromWeather(s.weather))),
    [validSnapshots],
  )

  const visibilityGaugeLocationLabel = useMemo(() => {
    if (selectedCity === '__average__') return 'your favorite cities'
    const idx = Number.parseInt(selectedCity, 10)
    const s = validSnapshots[idx]
    if (!s) return 'your favorite cities'
    const name = s.weather?.city && String(s.weather.city).trim() ? String(s.weather.city).trim() : s.city
    return name || 'your favorite cities'
  }, [selectedCity, validSnapshots])

  const smartInsightMetrics = useMemo(() => {
    if (validSnapshots.length === 0) {
      return { visibilityKm: NaN, tempCelsius: NaN, humidityPercent: NaN }
    }
    if (selectedCity === '__average__') {
      const temps = validSnapshots
        .map((s) => s.weather?.temperatureCelsius)
        .filter((t) => Number.isFinite(t))
      const hums = validSnapshots
        .map((s) => s.weather?.humidityPercent)
        .filter((h) => Number.isFinite(h) && h != null)
      const tempCelsius = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : NaN
      const humidityPercent = hums.length ? hums.reduce((a, b) => a + b, 0) / hums.length : NaN
      return {
        visibilityKm: averageVisibilityKm,
        tempCelsius,
        humidityPercent,
      }
    }
    const idx = Number.parseInt(selectedCity, 10)
    const w = validSnapshots[idx]?.weather
    if (!w) {
      return { visibilityKm: NaN, tempCelsius: NaN, humidityPercent: NaN }
    }
    return {
      visibilityKm: visibilityKmFromWeather(w),
      tempCelsius: Number.isFinite(w.temperatureCelsius) ? w.temperatureCelsius : NaN,
      humidityPercent: Number.isFinite(w.humidityPercent) ? w.humidityPercent : NaN,
    }
  }, [validSnapshots, selectedCity, averageVisibilityKm])

  const smartInsightRecommendation = useMemo(() => {
    if (validSnapshots.length === 0) {
      return 'Weather data will appear here once your city list is available.'
    }
    return smartInsightText({
      ...smartInsightMetrics,
      cityLabel: visibilityGaugeLocationLabel,
    })
  }, [smartInsightMetrics, visibilityGaugeLocationLabel, validSnapshots.length])

  const cardSx = useMemo(
    () => ({
      bgcolor: darkMode ? '#1e1e1e' : '#ffffff',
      borderRadius: '24px',
      boxShadow: darkMode ? '0px 4px 20px rgba(0, 0, 0, 0.45)' : '0px 4px 20px rgba(0, 0, 0, 0.05)',
      border: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.06)',
    }),
    [darkMode],
  )

  const pageBg = darkMode ? '#121212' : '#ffffff'

  const chartGridStroke = darkMode ? '#424242' : 'rgba(15,23,42,0.08)'
  const chartAxisTickFill = darkMode ? '#ffffff' : theme.palette.text.secondary
  const chartAxisLabelStyle = {
    fill: darkMode ? '#ffffff' : theme.palette.text.secondary,
    fontSize: 12,
    fontWeight: 600,
  }
  const chartTooltipContentStyle = darkMode
    ? { borderRadius: 12, backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }
    : { borderRadius: 12 }

  /** Scroll targets: no focus ring on the card after programmatic scroll. */
  const chartCardScrollTargetSx = {
    outline: 'none',
    '&:focus': { outline: 'none' },
    '&:focus-visible': { outline: 'none' },
  }

  const insightCardInnerSx = useMemo(
    () => ({
      p: 2.25,
      borderRadius: '24px',
      bgcolor: darkMode ? '#2a2a2a' : '#f8f9fa',
      border: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.06)',
      height: '100%',
    }),
    [darkMode],
  )

  const insightsHighlightPaperSx = useMemo(
    () => ({
      ...cardSx,
      bgcolor: darkMode ? '#1e293b' : '#f0f9ff',
      border: darkMode ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(14, 165, 233, 0.2)',
      boxShadow: darkMode ? '0px 4px 24px rgba(0, 0, 0, 0.35)' : '0px 4px 24px rgba(14, 165, 233, 0.08)',
      p: { xs: 2.25, md: 3 },
      height: '100%',
      minHeight: { xs: 320, md: 400 },
      display: 'flex',
      flexDirection: 'column',
    }),
    [cardSx, darkMode],
  )

  const chartBoxSx = {
    width: '100%',
    minHeight: { xs: 300, md: 380 },
    mt: 1,
  }

  const loading = favoritesLoading || snapshotsLoading

  const summaryCardInteractiveSx = {
    cursor: 'pointer',
    transition: 'transform 200ms ease, box-shadow 200ms ease',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0px 12px 28px rgba(0, 0, 0, 0.12)',
    },
  }

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        bgcolor: pageBg,
        py: { xs: 2.5, md: 4 },
        px: { xs: 2, md: 4 },
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, mb: 0.75, color: 'text.primary' }}>
            Analytics
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Compare live conditions across your cities at a glance.
          </Typography>
        </Box>

        {usingDefaultCities && isLoggedIn ? (
          <Alert severity="info" sx={{ borderRadius: '16px', fontWeight: 650 }}>
            Viewing global defaults. Add your own favorite cities to customize this dashboard!
          </Alert>
        ) : null}

        {snapshotsError ? (
          <Alert severity="warning" sx={{ borderRadius: '16px', fontWeight: 650 }}>
            {snapshotsError}
          </Alert>
        ) : null}

        {loading ? (
          <Paper sx={{ ...cardSx, p: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={22} />
              <Typography sx={{ color: 'text.secondary', fontWeight: 650 }}>
                {favoritesLoading ? 'Loading favorites…' : 'Loading weather data…'}
              </Typography>
            </Stack>
          </Paper>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          <Paper
            role="button"
            tabIndex={0}
            onClick={() => scrollToSection(tempChartRef)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                scrollToSection(tempChartRef)
              }
            }}
            sx={{ ...cardSx, ...summaryCardInteractiveSx, p: { xs: 2, md: 2.25 } }}
          >
            <Box sx={insightCardInnerSx}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <WhatshotRoundedIcon sx={{ fontSize: 22, color: 'error.main' }} />
                <Typography sx={{ color: 'text.secondary', fontWeight: 800 }}>Hottest city</Typography>
              </Stack>
              {insights.hottest ? (
                <>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.35rem', color: 'text.primary' }}>
                    {insights.hottest.weather?.city?.trim() || insights.hottest.city}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.5 }}>
                    {formatTemperature(insights.hottest.weather.temperatureCelsius, useFahrenheit)}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ color: 'text.secondary', fontWeight: 650 }}>—</Typography>
              )}
            </Box>
          </Paper>
          <Paper
            role="button"
            tabIndex={0}
            onClick={() => scrollToSection(windChartRef)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                scrollToSection(windChartRef)
              }
            }}
            sx={{ ...cardSx, ...summaryCardInteractiveSx, p: { xs: 2, md: 2.25 } }}
          >
            <Box sx={insightCardInnerSx}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <AirRoundedIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                <Typography sx={{ color: 'text.secondary', fontWeight: 800 }}>Windiest city</Typography>
              </Stack>
              {insights.windiest ? (
                <>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.35rem', color: 'text.primary' }}>
                    {insights.windiest.weather?.city?.trim() || insights.windiest.city}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.5 }}>
                    {formatWindSpeedMetersPerSecond(insights.windiest.weather.windSpeedMetersPerSecond)}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ color: 'text.secondary', fontWeight: 650 }}>—</Typography>
              )}
            </Box>
          </Paper>
          <Paper
            role="button"
            tabIndex={0}
            onClick={() => scrollToSection(humidityChartRef)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                scrollToSection(humidityChartRef)
              }
            }}
            sx={{ ...cardSx, ...summaryCardInteractiveSx, p: { xs: 2, md: 2.25 } }}
          >
            <Box sx={insightCardInnerSx}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <WaterDropRoundedIcon sx={{ fontSize: 22, color: 'info.main' }} />
                <Typography sx={{ color: 'text.secondary', fontWeight: 800 }}>Highest humidity</Typography>
              </Stack>
              {insights.mostHumid ? (
                <>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.35rem', color: 'text.primary' }}>
                    {insights.mostHumid.weather?.city?.trim() || insights.mostHumid.city}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.5 }}>
                    {Number.isFinite(insights.mostHumid.weather.humidityPercent)
                      ? `${Math.round(insights.mostHumid.weather.humidityPercent)}%`
                      : '—'}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ color: 'text.secondary', fontWeight: 650 }}>—</Typography>
              )}
            </Box>
          </Paper>
        </Box>

        <Paper
          ref={tempChartRef}
          sx={{ ...cardSx, ...chartCardScrollTargetSx, p: { xs: 2.25, md: 3 } }}
        >
          <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'text.primary' }}>Current temperature by city</Typography>
          <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem' }}>
            Bar chart of temperatures across all cities in your list ({useFahrenheit ? '°F' : '°C'}).
          </Typography>
          {!loading && validSnapshots.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontWeight: 650, mt: 2 }}>
              No temperature data to display.
            </Typography>
          ) : (
            <Box sx={chartBoxSx}>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={barChartData} margin={{ top: 28, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: chartAxisTickFill, fontSize: 12, fontWeight: 600 }}
                    interval={0}
                    angle={barChartData.length > 4 ? -25 : 0}
                    textAnchor={barChartData.length > 4 ? 'end' : 'middle'}
                    height={barChartData.length > 4 ? 70 : 36}
                  />
                  <YAxis
                    tick={{ fill: chartAxisTickFill, fontSize: 12 }}
                    tickFormatter={(v) => `${v}°${useFahrenheit ? 'F' : 'C'}`}
                    label={{
                      value: useFahrenheit ? 'Temperature (°F)' : 'Temperature (°C)',
                      angle: -90,
                      position: 'insideLeft',
                      style: chartAxisLabelStyle,
                    }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}°${useFahrenheit ? 'F' : 'C'}`, 'Temperature']}
                    labelFormatter={(label) => label}
                    contentStyle={chartTooltipContentStyle}
                  />
                  <Bar
                    dataKey="temperatureBar"
                    fill={theme.palette.primary.main}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={56}
                  >
                    <LabelList
                      dataKey="temperatureBar"
                      position="top"
                      formatter={(v) => (v != null ? `${v}°${useFahrenheit ? 'F' : 'C'}` : '')}
                      style={{ fill: theme.palette.text.primary, fontSize: 12, fontWeight: 700 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
            gap: 3,
            alignItems: 'stretch',
          }}
        >
          <Paper
            ref={windChartRef}
            sx={{ ...cardSx, ...chartCardScrollTargetSx, p: { xs: 2.25, md: 3 }, height: '100%' }}
          >
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'text.primary' }}>Wind Speed by city</Typography>
            <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem' }}>
              Live wind speeds across your favorite cities (km/h).
            </Typography>
            {!loading && windBarData.length === 0 ? (
              <Typography sx={{ color: 'text.secondary', fontWeight: 650, mt: 2 }}>
                No wind data to display.
              </Typography>
            ) : (
              <Box sx={{ ...chartBoxSx, minHeight: { xs: 300, md: 380 } }}>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={windBarData} margin={{ top: 28, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: chartAxisTickFill, fontSize: 12, fontWeight: 600 }}
                      interval={0}
                      angle={windBarData.length > 4 ? -25 : 0}
                      textAnchor={windBarData.length > 4 ? 'end' : 'middle'}
                      height={windBarData.length > 4 ? 70 : 36}
                    />
                    <YAxis
                      tick={{ fill: chartAxisTickFill, fontSize: 12 }}
                      tickFormatter={(v) => `${v} km/h`}
                      label={{
                        value: 'Wind speed (km/h)',
                        angle: -90,
                        position: 'insideLeft',
                        style: chartAxisLabelStyle,
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} km/h`, 'Wind speed']}
                      labelFormatter={(label) => label}
                      contentStyle={chartTooltipContentStyle}
                    />
                    <Bar
                      dataKey="windSpeed"
                      fill="#34d399"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={56}
                    >
                      <LabelList
                        dataKey="windSpeed"
                        position="top"
                        formatter={(v) => (v != null ? `${v} km/h` : '')}
                        style={{ fill: theme.palette.text.primary, fontSize: 12, fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>

          <Paper
            ref={humidityChartRef}
            sx={{ ...cardSx, ...chartCardScrollTargetSx, p: { xs: 2.25, md: 3 }, height: '100%' }}
          >
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'text.primary' }}>Humidity by city</Typography>
            <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem' }}>
              Relative humidity across the same cities (%).
            </Typography>
            {!loading && humidityBarData.length === 0 ? (
              <Typography sx={{ color: 'text.secondary', fontWeight: 650, mt: 2 }}>
                No humidity data to display.
              </Typography>
            ) : (
              <Box sx={{ ...chartBoxSx, minHeight: { xs: 300, md: 380 } }}>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={humidityBarData} margin={{ top: 28, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: chartAxisTickFill, fontSize: 12, fontWeight: 600 }}
                      interval={0}
                      angle={humidityBarData.length > 4 ? -25 : 0}
                      textAnchor={humidityBarData.length > 4 ? 'end' : 'middle'}
                      height={humidityBarData.length > 4 ? 70 : 36}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: chartAxisTickFill, fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                      label={{
                        value: 'Humidity (%)',
                        angle: -90,
                        position: 'insideLeft',
                        style: chartAxisLabelStyle,
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Humidity']}
                      labelFormatter={(label) => label}
                      contentStyle={chartTooltipContentStyle}
                    />
                    <Bar
                      dataKey="humidityPercent"
                      fill={theme.palette.info.main}
                      radius={[8, 8, 0, 0]}
                      maxBarSize={56}
                    >
                      <LabelList
                        dataKey="humidityPercent"
                        position="top"
                        formatter={(v) => (v != null ? `${v}%` : '')}
                        style={{ fill: theme.palette.text.primary, fontSize: 12, fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>

          <Box
            sx={{
              gridColumn: { xs: '1', lg: '1 / -1' },
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Paper sx={{ ...cardSx, p: { xs: 2, md: 2.25 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
              >
                <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.05rem', sm: '1.1rem' }, color: 'text.primary' }}>
                  Select City for Deep Insights
                </Typography>
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 280 } }}>
                  <InputLabel id="deep-insights-city-label">City or average</InputLabel>
                  <Select
                    labelId="deep-insights-city-label"
                    id="deep-insights-city"
                    label="City or average"
                    value={hasAnyVisibilityData ? selectedCity : '__average__'}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!hasAnyVisibilityData || loading}
                  >
                    <MenuItem value="__average__">Average (all cities)</MenuItem>
                    {validSnapshots.map((s, i) => {
                      const label = s.weather?.city && String(s.weather.city).trim()
                        ? String(s.weather.city).trim()
                        : s.city
                      return (
                        <MenuItem key={`${label}-${i}`} value={String(i)}>
                          {label}
                        </MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
              </Stack>
            </Paper>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 3,
                alignItems: 'stretch',
              }}
            >
              <Paper
                sx={{
                  ...cardSx,
                  p: { xs: 2.25, md: 3 },
                  height: '100%',
                  minHeight: { xs: 320, md: 400 },
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                  }}
                >
                  {!loading && !hasAnyVisibilityData ? (
                    <Typography sx={{ color: 'text.secondary', fontWeight: 650, textAlign: 'center', px: 2 }}>
                      No visibility data to display.
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 420,
                        minHeight: { xs: 280, md: 300 },
                        mx: 'auto',
                      }}
                    >
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart margin={{ top: 4, right: 12, left: 12, bottom: 0 }}>
                          <Pie
                            data={VISIBILITY_GAUGE_TRACK}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="78%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={108}
                            outerRadius={148}
                            stroke="none"
                            paddingAngle={0}
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {VISIBILITY_GAUGE_TRACK.map((entry, index) => (
                              <Cell key={`track-${entry.name}-${index}`} fill={entry.fill} stroke="none" />
                            ))}
                          </Pie>
                          <Pie
                            data={gaugeNeedleData}
                            dataKey="value"
                            cx="50%"
                            cy="78%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={102}
                            outerRadius={154}
                            stroke="none"
                            paddingAngle={0}
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {gaugeNeedleData.map((seg, index) => (
                              <Cell key={`needle-${seg.name}-${index}`} fill={seg.fill} stroke="none" />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '50%',
                          top: '52%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none',
                          width: '72%',
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: { xs: '2.25rem', md: '2.75rem' },
                            letterSpacing: -1,
                            lineHeight: 1.1,
                            color: theme.palette.text.primary,
                          }}
                        >
                          {formatVisibilityKmDisplay(gaugeVisibilityKm)}
                        </Typography>
                        <Typography
                          sx={{
                            mt: 0.75,
                            fontWeight: 700,
                            fontSize: '1.05rem',
                            color: 'text.secondary',
                          }}
                        >
                          {visibilityQualityLabel(gaugeVisibilityKm, visibilityGaugeLocationLabel)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Paper>

              <Paper sx={insightsHighlightPaperSx}>
                <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'text.primary' }}>
                  {'Weather Insights & Recommendations'}
                </Typography>
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    mb: 0,
                  }}
                >
                  Updates when you change the selection above.
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    py: { xs: 1, md: 2 },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ maxWidth: 520 }}>
                    <LightbulbRoundedIcon
                      sx={{
                        fontSize: { xs: 32, md: 36 },
                        color: 'warning.main',
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        lineHeight: 1.45,
                        fontSize: { xs: '1.15rem', sm: '1.25rem', md: '1.35rem' },
                      }}
                    >
                      {loading ? 'Loading…' : smartInsightRecommendation}
                    </Typography>
                  </Stack>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
      </Stack>
    </Box>
  )
}
