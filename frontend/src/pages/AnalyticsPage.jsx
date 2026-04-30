/* Author: Nandar Lin */

import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import AirRoundedIcon from '@mui/icons-material/AirRounded'
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded'
import WhatshotRoundedIcon from '@mui/icons-material/WhatshotRounded'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAuth } from '../context/useAuth.js'
import { fetchFavoriteCities } from '../lib/favoritesApi.js'
import { fetchCityWeather } from '../lib/weatherApi.js'

const DEFAULT_CITY_NAMES = ['London', 'Tokyo', 'New York', 'Mandalay']

/** OpenWeather `main` → display + intuitive fill (Clear/Sunny, Clouds, Rain, …). */
const CONDITION_STYLE = {
  Clear: { fill: '#fbbf24', label: 'Clear' },
  Clouds: { fill: '#94a3b8', label: 'Clouds' },
  Rain: { fill: '#1e3a8a', label: 'Rain' },
  Drizzle: { fill: '#1e40af', label: 'Drizzle' },
  Thunderstorm: { fill: '#5b21b6', label: 'Thunderstorm' },
  Snow: { fill: '#bae6fd', label: 'Snow' },
  Mist: { fill: '#cbd5e1', label: 'Mist' },
  Smoke: { fill: '#9ca3af', label: 'Smoke' },
  Haze: { fill: '#a8a29e', label: 'Haze' },
  Dust: { fill: '#d6d3d1', label: 'Dust' },
  Fog: { fill: '#94a3b8', label: 'Fog' },
  Sand: { fill: '#d97706', label: 'Sand' },
  Ash: { fill: '#78716c', label: 'Ash' },
  Squall: { fill: '#1d4ed8', label: 'Squall' },
  Tornado: { fill: '#7c3aed', label: 'Tornado' },
  Unknown: { fill: '#64748b', label: 'Unknown' },
}

function formatWindSpeedMetersPerSecond(speedMetersPerSecond) {
  const value = typeof speedMetersPerSecond === 'number' ? speedMetersPerSecond : Number(speedMetersPerSecond)
  if (!Number.isFinite(value)) return '—'
  const kmh = value * 3.6
  return `${Math.round(kmh)} km/h`
}

/** Fallback when API has no `conditionMain` (older backend). */
function summarizeCondition(raw) {
  if (!raw || typeof raw !== 'string') return 'Unknown'
  const s = raw.trim().toLowerCase()
  if (s.includes('thunder')) return 'Thunderstorm'
  if (s.includes('rain') || s.includes('drizzle')) return 'Rain'
  if (s.includes('snow')) return 'Snow'
  if (s.includes('cloud') || s.includes('overcast')) return 'Clouds'
  if (s.includes('clear')) return 'Clear'
  if (s.includes('mist') || s.includes('fog') || s.includes('haze')) return 'Mist'
  return raw
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function mainConditionKey(weather) {
  const raw = weather?.conditionMain
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return summarizeCondition(weather?.description)
}

function styleForCondition(key) {
  return CONDITION_STYLE[key] ?? { fill: '#64748b', label: key }
}

export default function AnalyticsPage() {
  const theme = useTheme()
  const { authHeader, isLoggedIn } = useAuth()
  const [favoriteCities, setFavoriteCities] = useState([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [citySnapshots, setCitySnapshots] = useState([])
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)
  const [snapshotsError, setSnapshotsError] = useState(null)

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
      const wind = Number(w.windSpeedMetersPerSecond)
      const bestWind = Number(windiest.weather.windSpeedMetersPerSecond)
      if (Number.isFinite(wind) && (!Number.isFinite(bestWind) || wind > bestWind)) windiest = s
      const hum = w.humidityPercent
      const bestHum = mostHumid.weather.humidityPercent
      if (Number.isFinite(hum) && hum != null && (!Number.isFinite(bestHum) || hum > bestHum)) mostHumid = s
    }

    return { hottest, windiest, mostHumid }
  }, [validSnapshots])

  const barChartData = useMemo(
    () =>
      validSnapshots.map((s) => ({
        name:
          s.weather?.city && String(s.weather.city).trim()
            ? String(s.weather.city).trim()
            : s.city,
        temperatureCelsius: Math.round(s.weather.temperatureCelsius * 10) / 10,
      })),
    [validSnapshots],
  )

  const pieChartData = useMemo(() => {
    const counts = new Map()
    for (const s of validSnapshots) {
      const key = mainConditionKey(s.weather)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    if (total === 0) return []
    return [...counts.entries()].map(([name, value]) => {
      const st = styleForCondition(name)
      return {
        name: st.label,
        conditionKey: name,
        value,
        fill: st.fill,
        percent: Math.round((value / total) * 100),
      }
    })
  }, [validSnapshots])

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

  const cardSx = {
    bgcolor: 'common.white',
    borderRadius: '24px',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
    border: '1px solid rgba(15, 23, 42, 0.06)',
  }

  const insightCardInnerSx = {
    p: 2.25,
    borderRadius: '24px',
    bgcolor: '#f8f9fa',
    border: '1px solid rgba(15, 23, 42, 0.06)',
    height: '100%',
  }

  const chartBoxSx = {
    width: '100%',
    minHeight: { xs: 300, md: 380 },
    mt: 1,
  }

  const loading = favoritesLoading || snapshotsLoading

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        bgcolor: '#f8f9fa',
        py: { xs: 2.5, md: 4 },
        px: { xs: 2, md: 4 },
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, mb: 0.75 }}>
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
          <Paper sx={{ ...cardSx, p: { xs: 2, md: 2.25 } }}>
            <Box sx={insightCardInnerSx}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <WhatshotRoundedIcon sx={{ fontSize: 22, color: 'error.main' }} />
                <Typography sx={{ color: 'text.secondary', fontWeight: 800 }}>Hottest city</Typography>
              </Stack>
              {insights.hottest ? (
                <>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.35rem' }}>
                    {insights.hottest.weather?.city?.trim() || insights.hottest.city}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.5 }}>
                    {Math.round(insights.hottest.weather.temperatureCelsius)}°C
                  </Typography>
                </>
              ) : (
                <Typography sx={{ color: 'text.secondary', fontWeight: 650 }}>—</Typography>
              )}
            </Box>
          </Paper>
          <Paper sx={{ ...cardSx, p: { xs: 2, md: 2.25 } }}>
            <Box sx={insightCardInnerSx}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <AirRoundedIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                <Typography sx={{ color: 'text.secondary', fontWeight: 800 }}>Windiest city</Typography>
              </Stack>
              {insights.windiest ? (
                <>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.35rem' }}>
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
          <Paper sx={{ ...cardSx, p: { xs: 2, md: 2.25 } }}>
            <Box sx={insightCardInnerSx}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <WaterDropRoundedIcon sx={{ fontSize: 22, color: 'info.main' }} />
                <Typography sx={{ color: 'text.secondary', fontWeight: 800 }}>Highest humidity</Typography>
              </Stack>
              {insights.mostHumid ? (
                <>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.35rem' }}>
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

        <Paper sx={{ ...cardSx, p: { xs: 2.25, md: 3 } }}>
          <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Current temperature by city</Typography>
          <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem' }}>
            Bar chart of temperatures across all cities in your list (°C).
          </Typography>
          {!loading && validSnapshots.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontWeight: 650, mt: 2 }}>
              No temperature data to display.
            </Typography>
          ) : (
            <Box sx={chartBoxSx}>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={barChartData} margin={{ top: 28, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }}
                    interval={0}
                    angle={barChartData.length > 4 ? -25 : 0}
                    textAnchor={barChartData.length > 4 ? 'end' : 'middle'}
                    height={barChartData.length > 4 ? 70 : 36}
                  />
                  <YAxis
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                    tickFormatter={(v) => `${v}°C`}
                    label={{
                      value: 'Temperature (°C)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 },
                    }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}°C`, 'Temperature']}
                    labelFormatter={(label) => label}
                    contentStyle={{ borderRadius: 12 }}
                  />
                  <Bar
                    dataKey="temperatureCelsius"
                    fill={theme.palette.primary.main}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={56}
                  >
                    <LabelList
                      dataKey="temperatureCelsius"
                      position="top"
                      formatter={(v) => (v != null ? `${v}°C` : '')}
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
          <Paper sx={{ ...cardSx, p: { xs: 2.25, md: 3 }, height: '100%' }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Weather distribution</Typography>
            <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem' }}>
              Cities grouped by main condition (Clear, Clouds, Rain, …).
            </Typography>
            {!loading && pieChartData.length === 0 ? (
              <Typography sx={{ color: 'text.secondary', fontWeight: 650, mt: 2 }}>
                No condition data to display.
              </Typography>
            ) : (
              <Box sx={{ ...chartBoxSx, minHeight: { xs: 300, md: 380 } }}>
                <ResponsiveContainer width="100%" height={380}>
                  <PieChart margin={{ top: 8, right: 24, bottom: 8, left: 4 }}>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="38%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={102}
                      paddingAngle={2}
                      labelLine={false}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${entry.conditionKey}-${index}`} fill={entry.fill} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, props) => {
                        const p = props?.payload
                        const pct = p?.percent
                        return [
                          `${value} cit${value === 1 ? 'y' : 'ies'}${pct != null ? ` (${pct}%)` : ''}`,
                          'Count',
                        ]
                      }}
                      contentStyle={{ borderRadius: 12 }}
                    />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingLeft: 12, fontSize: 13, fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>

          <Paper sx={{ ...cardSx, p: { xs: 2.25, md: 3 }, height: '100%' }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Humidity by city</Typography>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 }}
                      interval={0}
                      angle={humidityBarData.length > 4 ? -25 : 0}
                      textAnchor={humidityBarData.length > 4 ? 'end' : 'middle'}
                      height={humidityBarData.length > 4 ? 70 : 36}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                      label={{
                        value: 'Humidity (%)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 600 },
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Humidity']}
                      labelFormatter={(label) => label}
                      contentStyle={{ borderRadius: 12 }}
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
        </Box>
      </Stack>
    </Box>
  )
}
