/* Author: Nandar Lin */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined'
import NightsStayOutlinedIcon from '@mui/icons-material/NightsStayOutlined'
import UmbrellaOutlinedIcon from '@mui/icons-material/UmbrellaOutlined'
import AirOutlinedIcon from '@mui/icons-material/AirOutlined'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import WbTwilightOutlinedIcon from '@mui/icons-material/WbTwilightOutlined'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import CityNotFound from '../components/CityNotFound.jsx'
import { fetchCityWeather } from '../lib/weatherApi.js'
import { fetchFavoriteCities, getApiErrorMessage, removeFavoriteCity, saveFavoriteCity } from '../lib/favoritesApi.js'
import { useAuth } from '../context/useAuth.js'

/**
 * City wall clock from API unix seconds + API timezone offset; `timeZone: 'UTC'` keeps the browser's
 * local zone (e.g. Singapore) from shifting the formatted value.
 */
const formatCityTime = (unix, offset, options = {}) => {
  // Manual offset adjustment
  const date = new Date((unix + offset) * 1000)
  return date.toLocaleString('en-US', {
    ...options,
    timeZone: 'UTC',
  })
}

/** Minutes after midnight on the city's clock, derived from the same adjusted instant as formatCityTime. */
function cityLocalMinutesFromUnix(unix, offset) {
  const u = Number(unix)
  const o = Number.isFinite(offset) ? offset : 0
  if (!Number.isFinite(u)) return null
  const date = new Date((u + o) * 1000)
  if (Number.isNaN(date.getTime())) return null
  return date.getUTCHours() * 60 + date.getUTCMinutes()
}

/** True when local time is after sunset or before sunrise (show moon instead of daytime OWM icon). */
function isLocalNightBetweenSunsetAndSunrise(nowUnix, offset, sunriseUnix, sunsetUnix) {
  if (!Number.isFinite(sunriseUnix) || !Number.isFinite(sunsetUnix)) return false
  const n = cityLocalMinutesFromUnix(nowUnix, offset)
  const rs = cityLocalMinutesFromUnix(sunriseUnix, offset)
  const st = cityLocalMinutesFromUnix(sunsetUnix, offset)
  if (n == null || rs == null || st == null) return false
  if (rs < st) {
    return n >= st || n < rs
  }
  return false
}

function formatWindSpeedMetersPerSecond(speedMetersPerSecond) {
  const value = typeof speedMetersPerSecond === 'number' ? speedMetersPerSecond : Number(speedMetersPerSecond)
  if (!Number.isFinite(value)) return '—'
  const kmh = value * 3.6
  return `${Math.round(kmh)} km/h`
}

/** Row height in favorites list; container fits exactly 3 rows + gaps (see theme in list Box sx). */
const FAVORITE_LIST_ROW_PX = 72
const FAVORITE_LIST_VISIBLE_ROWS = 3

export default function DashboardPage({ isLoggedIn = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { authHeader } = useAuth()
  const hasAutoLoadedRef = useRef(false)
  const saveSuccessTimeoutRef = useRef(null)
  const [cityQuery, setCityQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [searchError, setSearchError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [favoriteCities, setFavoriteCities] = useState([])
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false)
  const [favoritesError, setFavoritesError] = useState(null)
  const [weatherSnapshot, setWeatherSnapshot] = useState({
    cityName: 'London',
    temperature: '25°C',
    rainChance: '30%',
    windSpeed: '—',
    humidity: '62%',
    sunrise: '6:12 AM',
    sunset: '7:45 PM',
    sunriseEpochSeconds: null,
    sunsetEpochSeconds: null,
    timezoneOffsetSeconds: 0,
    description: 'Clear sky',
    icon: null,
    forecast: [],
    hourlyForecast: [],
  })

  const {
    cityName,
    temperature,
    rainChance,
    windSpeed,
    humidity,
    sunrise,
    sunset,
    sunriseEpochSeconds,
    sunsetEpochSeconds,
    timezoneOffsetSeconds,
    description,
    icon,
    forecast,
    hourlyForecast,
  } =
    weatherSnapshot

  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setNowSec(Math.floor(Date.now() / 1000))
    })
    return () => cancelAnimationFrame(id)
  }, [cityName, sunriseEpochSeconds, sunsetEpochSeconds, timezoneOffsetSeconds])

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000))
    }, 30_000)
    return () => window.clearInterval(id)
  }, [])

  const todayDate = formatCityTime(nowSec, timezoneOffsetSeconds, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const localTimeLabel = formatCityTime(nowSec, timezoneOffsetSeconds, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const isLocalNight =
    sunriseEpochSeconds != null &&
    sunsetEpochSeconds != null &&
    isLocalNightBetweenSunsetAndSunrise(
      nowSec,
      timezoneOffsetSeconds,
      sunriseEpochSeconds,
      sunsetEpochSeconds,
    )

  const shouldShowError = Boolean(searchError)

  const loadFavorites = async ({ silent = false } = {}) => {
    if (!isLoggedIn) {
      setFavoriteCities([])
      setFavoritesError(null)
      setIsFavoritesLoading(false)
      return
    }

    if (!silent) {
      setIsFavoritesLoading(true)
      setFavoritesError(null)
    }

    try {
      if (!authHeader) {
        navigate('/login', { replace: true, state: { from: '/dashboard' } })
        return
      }
      const data = await fetchFavoriteCities({ authHeader })
      setFavoriteCities(Array.isArray(data) ? data : [])
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: '/dashboard' } })
        return
      }
      setFavoritesError(getApiErrorMessage(error, 'Could not load favorites.'))
    } finally {
      if (!silent) setIsFavoritesLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => loadFavorites())
  }, [isLoggedIn, authHeader])

  useEffect(() => {
    return () => {
      if (saveSuccessTimeoutRef.current) {
        clearTimeout(saveSuccessTimeoutRef.current)
        saveSuccessTimeoutRef.current = null
      }
    }
  }, [])

  const applyWeatherSnapshot = (weather, fallbackCityName) => {
    setWeatherSnapshot((current) => {
      const tz =
        typeof weather?.timezoneOffsetSeconds === 'number' && Number.isFinite(weather.timezoneOffsetSeconds)
          ? weather.timezoneOffsetSeconds
          : 0
      return {
        ...current,
        cityName: weather?.city ?? fallbackCityName,
        temperature:
          Number.isFinite(weather?.temperatureCelsius) ? `${Math.round(weather.temperatureCelsius)}°C` : current.temperature,
        description: weather?.description ?? current.description,
        icon: weather?.icon ?? current.icon,
        humidity:
          Number.isFinite(weather?.humidityPercent) ? `${Math.round(weather.humidityPercent)}%` : current.humidity,
        rainChance:
          Number.isFinite(weather?.rainChancePercent) ? `${Math.round(weather.rainChancePercent)}%` : current.rainChance,
        windSpeed: Number.isFinite(Number(weather?.windSpeedMetersPerSecond))
          ? formatWindSpeedMetersPerSecond(weather.windSpeedMetersPerSecond)
          : current.windSpeed,
        timezoneOffsetSeconds: tz,
        sunriseEpochSeconds: Number.isFinite(weather?.sunriseEpochSeconds) ? weather.sunriseEpochSeconds : null,
        sunsetEpochSeconds: Number.isFinite(weather?.sunsetEpochSeconds) ? weather.sunsetEpochSeconds : null,
        sunrise:
          Number.isFinite(weather?.sunriseEpochSeconds)
            ? formatCityTime(weather.sunriseEpochSeconds, tz, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : current.sunrise,
        sunset:
          Number.isFinite(weather?.sunsetEpochSeconds)
            ? formatCityTime(weather.sunsetEpochSeconds, tz, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : current.sunset,
        forecast: Array.isArray(weather?.forecast) ? weather.forecast : [],
        hourlyForecast: Array.isArray(weather?.hourlyForecast) ? weather.hourlyForecast : [],
      }
    })
  }

  /** Load weather for a city passed via navigation (Navbar or links). Runs whenever `state.searchCity` is present. */
  useEffect(() => {
    const city = typeof location.state?.searchCity === 'string' ? location.state.searchCity.trim() : ''
    if (!city) return

    queueMicrotask(() => {
      navigate('.', { replace: true, state: {} })
      setCityQuery(city)
      setIsInitialLoading(true)
      setSearchError(null)
      hasAutoLoadedRef.current = true

      fetchCityWeather(city)
        .then((weather) => {
          applyWeatherSnapshot(weather, city)
        })
        .catch((error) => {
          setSearchError(error)
        })
        .finally(() => {
          setIsInitialLoading(false)
        })
    })
  }, [location.key, navigate])

  /** Default city on first visit when no `searchCity` was passed in location state (handled above). */
  useEffect(() => {
    Promise.resolve().then(() => {
      const routeCity = typeof location.state?.searchCity === 'string' ? location.state.searchCity.trim() : ''
      if (routeCity) return

      if (hasAutoLoadedRef.current) return

      if (isLoggedIn && isFavoritesLoading) return

      const firstFavoriteCity = favoriteCities?.[0]?.cityName
      const defaultCity = (
        typeof firstFavoriteCity === 'string' && firstFavoriteCity.trim() ? firstFavoriteCity : 'London'
      ).trim()

      hasAutoLoadedRef.current = true
      setCityQuery(defaultCity)
      setIsInitialLoading(true)
      setSearchError(null)

      fetchCityWeather(defaultCity)
        .then((weather) => {
          applyWeatherSnapshot(weather, defaultCity)
        })
        .catch((error) => {
          setSearchError(error)
        })
        .finally(() => {
          setIsInitialLoading(false)
        })
    })
  }, [isLoggedIn, isFavoritesLoading, favoriteCities, navigate, location.state])

  const normalizedActiveCity = useMemo(() => (cityName || '').trim().toLowerCase(), [cityName])
  const matchingFavorite = useMemo(() => {
    if (!normalizedActiveCity) return null
    return favoriteCities.find((fav) => (fav?.cityName || '').trim().toLowerCase() === normalizedActiveCity) ?? null
  }, [favoriteCities, normalizedActiveCity])

  const runWeatherSearch = async (trimmedQuery) => {
    setIsSearching(true)
    setSearchError(null)
    setSaveError(null)
    if (saveSuccessTimeoutRef.current) {
      clearTimeout(saveSuccessTimeoutRef.current)
      saveSuccessTimeoutRef.current = null
    }
    setSaveSuccess(false)

    try {
      const weather = await fetchCityWeather(trimmedQuery)
      applyWeatherSnapshot(weather, trimmedQuery)
    } catch (error) {
      setSearchError(error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async () => {
    const trimmedQuery = cityQuery.trim()
    if (!trimmedQuery) return
    await runWeatherSearch(trimmedQuery)
  }

  const handleFavoriteCityClick = async (rawName) => {
    const name = typeof rawName === 'string' ? rawName.trim() : ''
    if (!name) return
    setCityQuery(name)
    await runWeatherSearch(name)
  }

  const handleRetry = () => {
    setCityQuery('')
    setSearchError(null)
  }

  const handleSaveCity = async () => {
    if (!isLoggedIn) return
    setIsSaving(true)
    setSaveError(null)
    if (saveSuccessTimeoutRef.current) {
      clearTimeout(saveSuccessTimeoutRef.current)
      saveSuccessTimeoutRef.current = null
    }
    setSaveSuccess(false)

    try {
      const saved = await saveFavoriteCity({ cityName, authHeader })
      const addedName = (saved?.cityName ?? cityName).trim()
      const addedNorm = addedName.toLowerCase()
      if (saved?.id != null && addedName) {
        setFavoriteCities((prev) => {
          const idx = prev.findIndex((f) => (f?.cityName || '').trim().toLowerCase() === addedNorm)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = { ...next[idx], id: saved.id, cityName: saved.cityName ?? addedName }
            return next
          }
          return [...prev, { id: saved.id, cityName: saved.cityName ?? addedName }]
        })
      }
      setSaveSuccess(true)
      saveSuccessTimeoutRef.current = setTimeout(() => {
        saveSuccessTimeoutRef.current = null
        setSaveSuccess(false)
      }, 3000)
      await loadFavorites({ silent: true })
    } catch (error) {
      setSaveError(getApiErrorMessage(error, 'Could not save this city. Please try again.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleUnsaveCity = async () => {
    if (!isLoggedIn) return
    if (!matchingFavorite?.id) return

    if (saveSuccessTimeoutRef.current) {
      clearTimeout(saveSuccessTimeoutRef.current)
      saveSuccessTimeoutRef.current = null
    }
    setSaveSuccess(false)

    setIsSaving(true)
    setSaveError(null)

    try {
      await removeFavoriteCity({ favoriteId: matchingFavorite.id, authHeader })
      setFavoriteCities((current) => current.filter((fav) => fav?.id !== matchingFavorite.id))
      await loadFavorites({ silent: true })
    } catch (error) {
      setSaveError(getApiErrorMessage(error, 'Could not remove this city. Please try again.'))
    } finally {
      setIsSaving(false)
    }
  }

  const onSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSearch()
    }
  }

  const errorDescription = useMemo(() => {
    if (!searchError) return ''
    if (searchError?.code === 'CITY_NOT_FOUND') {
      return "We couldn't find weather data for that city. Check the spelling and try again."
    }
    return 'Something went wrong while searching. Please try again.'
  }, [searchError])

  const forecastCards = useMemo(() => {
    if (!Array.isArray(forecast) || forecast.length === 0) return []
    return forecast.slice(0, 5).map((item, index) => ({
      key: item?.dateIso ?? `${item?.dayLabel ?? 'day'}-${index}`,
      day: item?.dayLabel ?? '—',
      high:
        typeof item?.temperatureMaxCelsius === 'number'
          ? `${Math.round(item.temperatureMaxCelsius)}°C`
          : '—',
      low:
        typeof item?.temperatureMinCelsius === 'number'
          ? `${Math.round(item.temperatureMinCelsius)}°C`
          : '—',
      icon: item?.icon ?? null,
      description: item?.description ?? '',
    }))
  }, [forecast])

  const hourlyTemperatureSeries = useMemo(() => {
    if (!Array.isArray(hourlyForecast) || hourlyForecast.length === 0) return []
    return hourlyForecast
      .map((item, index) => ({
        key: item?.epochSeconds ?? `${item?.timeLabel ?? 'hour'}-${index}`,
        time:
          typeof item?.epochSeconds === 'number'
            ? formatCityTime(item.epochSeconds, timezoneOffsetSeconds, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })
            : '—',
        time12:
          typeof item?.epochSeconds === 'number'
            ? formatCityTime(item.epochSeconds, timezoneOffsetSeconds, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : '—',
        temperatureCelsius: Number(item?.temperatureCelsius),
      }))
      .filter((item) => Number.isFinite(item.temperatureCelsius))
  }, [hourlyForecast, timezoneOffsetSeconds])

  const cardSx = {
    bgcolor: 'common.white',
    borderRadius: '24px',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
    border: '1px solid rgba(15, 23, 42, 0.06)',
  }

  const metricIconSx = (bgColor, color) => ({
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    bgcolor: bgColor,
    color,
    flexShrink: 0,
  })

  const lockedCardSx = {
    position: 'relative',
    overflow: 'hidden',
    transition: 'filter 160ms ease, opacity 160ms ease',
  }

  const lockedContentSx = {
    filter: 'blur(6px)',
    opacity: 0.55,
    pointerEvents: 'none',
    userSelect: 'none',
  }

  const lockedOverlaySx = {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    px: 2.5,
    textAlign: 'center',
    bgcolor: 'rgba(248, 249, 250, 0.35)',
    backdropFilter: 'blur(1px)',
  }

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
      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          display: 'grid',
          gap: '24px',
        }}
      >
        <Box sx={{ mb: { xs: 0.25, md: 0.75 } }}>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, mb: 1 }}>
            Dashboard
          </Typography>

          <Box
            sx={{
              mt: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
              gap: 1.5,
              alignItems: 'stretch',
              maxWidth: 820,
            }}
          >
            <TextField
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search city..."
              aria-label="Search city"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <WbSunnyOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px',
                  bgcolor: 'common.white',
                  minHeight: 58,
                },
              }}
            />
            <Button
              variant="contained"
              disableElevation
              disabled={isSearching}
              onClick={handleSearch}
              sx={{
                borderRadius: '24px',
                px: { xs: 3, md: 4 },
                minHeight: 58,
                bgcolor: 'text.primary',
                color: 'background.paper',
                fontWeight: 900,
                fontSize: '1.05rem',
                textTransform: 'none',
                '&:hover': { bgcolor: 'text.primary' },
              }}
            >
              {isSearching ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} sx={{ color: 'background.paper' }} />
                  <span>Searching...</span>
                </Stack>
              ) : (
                'Search'
              )}
            </Button>
          </Box>
        </Box>

        {isInitialLoading && !shouldShowError ? (
          <Paper sx={{ ...cardSx, p: 4, minHeight: 360, display: 'grid', placeItems: 'center' }}>
            <Stack spacing={1.5} alignItems="center">
              <CircularProgress />
              <Typography sx={{ fontWeight: 850, color: 'text.secondary' }}>Loading weather data…</Typography>
            </Stack>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(280px, 1fr)' },
              gap: '24px',
              alignItems: 'stretch',
            }}
          >
            {shouldShowError ? (
              <Box sx={{ gridColumn: '1 / -1', mt: { xs: 1, md: 2 } }}>
                <CityNotFound description={errorDescription} onRetry={handleRetry} />
              </Box>
            ) : null}

            {!shouldShowError ? (
              <Stack spacing="24px" sx={{ height: '100%' }}>
            <Paper sx={{ ...cardSx, p: 4 }}>
              <Stack spacing={3}>
                <Typography sx={{ fontWeight: 900, color: 'text.secondary', letterSpacing: 0.4 }}>
                  Today at a Glance
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 3,
                    flexDirection: { xs: 'column', md: 'row' },
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={4}
                    sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}
                  >
                    <Stack sx={{ minWidth: 0 }}>
                      <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 800, lineHeight: 1.45, mb: 1 }}>
                        {cityName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.5, mb: 0.25 }}>
                        {todayDate}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 650, lineHeight: 1.5, mb: 1.5 }}>
                        Local time: {localTimeLabel}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: { xs: '3.2rem', md: '4rem' },
                          lineHeight: 1.12,
                          fontWeight: 900,
                          letterSpacing: -1.2,
                        }}
                      >
                        {temperature}
                      </Typography>
                    </Stack>

                    <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 96 }}>
                      {isLocalNight ? (
                        <NightsStayOutlinedIcon sx={{ fontSize: 44, color: 'text.secondary' }} aria-hidden />
                      ) : icon ? (
                        <Box
                          component="img"
                          alt={description || 'Weather icon'}
                          src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
                          sx={{ width: 44, height: 44, display: 'block' }}
                        />
                      ) : (
                        <WbSunnyOutlinedIcon sx={{ fontSize: 40 }} aria-hidden />
                      )}
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textAlign: 'center' }}>
                        {description}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Button
                    variant="outlined"
                    disabled={!isLoggedIn || isSaving || Boolean(matchingFavorite)}
                    onClick={matchingFavorite ? undefined : handleSaveCity}
                    sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 2, py: 0.75, flexShrink: 0 }}
                  >
                    {isSaving ? 'Saving...' : matchingFavorite ? 'Saved' : 'Save City'}
                  </Button>
                  {isLoggedIn && matchingFavorite ? (
                    <Button
                      variant="text"
                      disabled={isSaving}
                      onClick={handleUnsaveCity}
                      sx={{ borderRadius: 999, fontWeight: 800, textTransform: 'none', px: 1.5, py: 0.75, flexShrink: 0 }}
                    >
                      Unsave
                    </Button>
                  ) : null}
                </Box>
                {saveError ? (
                  <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 650 }}>
                    {saveError}
                  </Typography>
                ) : saveSuccess ? (
                  <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 650 }}>
                    Saved to favorites.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>

            <Paper sx={{ ...cardSx, p: { xs: 2.25, md: 3 } }}>
              <Typography sx={{ fontWeight: 950, letterSpacing: -0.3 }}>5-Day Forecast</Typography>
              <Box
                sx={{
                  mt: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
                  gap: 1.25,
                }}
              >
                {forecastCards.map((item) => (
                  <Box
                    key={item.key}
                    sx={{
                      p: 1.25,
                      minHeight: 150,
                      borderRadius: '18px',
                      border: '1px solid',
                      borderColor: 'rgba(15, 23, 42, 0.08)',
                      bgcolor: '#f8f9fa',
                      textAlign: 'center',
                    }}
                  >
                    <Typography sx={{ fontWeight: 900 }}>{item.day}</Typography>
                    {item.icon ? (
                      <Box
                        component="img"
                        alt={item.description || 'Forecast icon'}
                        src={`https://openweathermap.org/img/wn/${item.icon}@2x.png`}
                        sx={{ mt: 0.5, width: 44, height: 44, display: 'block', mx: 'auto' }}
                      />
                    ) : (
                      <WbSunnyOutlinedIcon sx={{ mt: 0.75, fontSize: 40 }} />
                    )}
                    <Typography variant="body2" sx={{ mt: 0.75, color: 'text.primary', fontWeight: 850 }}>
                      Highest: {item.high}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Lowest: {item.low}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            <Paper
              sx={{
                ...cardSx,
                ...(!isLoggedIn ? lockedCardSx : null),
                p: { xs: 2.25, md: 3 },
                width: '100%',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography sx={{ fontWeight: 950, letterSpacing: -0.3 }}>Temperature Trend (24h)</Typography>
              <Box sx={!isLoggedIn ? lockedContentSx : null}>
                <Box sx={{ mt: 2, height: { xs: 200, md: '100%' }, minHeight: { md: 240 } }}>
                  {hourlyTemperatureSeries.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hourlyTemperatureSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="4 4" />
                        <XAxis dataKey="time" tick={{ fontSize: 12, fontWeight: 700 }} interval="preserveStartEnd" />
                        <YAxis
                          tick={{ fontSize: 12, fontWeight: 700 }}
                          tickFormatter={(value) => `${Math.round(Number(value))}°C`}
                          width={44}
                        />
                        <Tooltip
                          formatter={(value) => [`${Math.round(Number(value))}°C`, 'Temp']}
                          labelFormatter={(_, payload) => {
                            const row = payload?.[0]?.payload
                            const label = row?.time12 ?? row?.time
                            return label ? `Time: ${label}` : 'Time'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="temperatureCelsius"
                          stroke="#0f172a"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box
                      sx={{
                        height: '100%',
                        borderRadius: '18px',
                        border: '1px dashed',
                        borderColor: 'rgba(15, 23, 42, 0.12)',
                        bgcolor: '#f8f9fa',
                        display: 'grid',
                        placeItems: 'center',
                        textAlign: 'center',
                        px: 2,
                      }}
                    >
                      <Typography sx={{ color: 'text.secondary', fontWeight: 750 }}>
                        Hourly temperature data is unavailable for this city.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              {!isLoggedIn ? (
                <Box sx={lockedOverlaySx}>
                  <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>
                    Register to unlock analytics and favorites.
                  </Typography>
                </Box>
              ) : null}
            </Paper>
          </Stack>
          ) : null}

          {!shouldShowError ? (
            <Stack spacing="24px">
            <Paper
              sx={{
                ...cardSx,
                ...(!isLoggedIn ? lockedCardSx : null),
                p: { xs: 2.25, md: 2.5 },
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <Box sx={{ ...(!isLoggedIn ? lockedContentSx : null), display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <Typography sx={{ fontWeight: 900, letterSpacing: -0.2, flexShrink: 0 }}>Favorite Cities</Typography>
                <Box
                  sx={(theme) => {
                    const gapPx = parseFloat(theme.spacing(1.25))
                    const listHeightPx =
                      FAVORITE_LIST_VISIBLE_ROWS * FAVORITE_LIST_ROW_PX +
                      (FAVORITE_LIST_VISIBLE_ROWS - 1) * gapPx
                    return {
                      mt: 1.75,
                      height: listHeightPx,
                      minHeight: listHeightPx,
                      maxHeight: listHeightPx,
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.25,
                      overflowY: 'auto',
                      scrollbarGutter: 'stable',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(15, 23, 42, 0.18) transparent',
                      '&::-webkit-scrollbar': { width: 6 },
                      '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(15, 23, 42, 0.12)',
                        borderRadius: 999,
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        backgroundColor: 'rgba(15, 23, 42, 0.28)',
                      },
                    }
                  }}
                >
                  {isFavoritesLoading ? (
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.25,
                        py: 0.25,
                      }}
                    >
                      {[0, 1, 2].map((i) => (
                        <Skeleton
                          key={i}
                          variant="rounded"
                          height={FAVORITE_LIST_ROW_PX}
                          sx={{ flexShrink: 0, borderRadius: '18px', bgcolor: 'rgba(15, 23, 42, 0.06)' }}
                        />
                      ))}
                    </Box>
                  ) : favoritesError ? (
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 2,
                        textAlign: 'center',
                      }}
                    >
                      <Typography sx={{ color: 'error.main', fontWeight: 850 }}>{favoritesError}</Typography>
                    </Box>
                  ) : favoriteCities.length === 0 ? (
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 2,
                        textAlign: 'center',
                      }}
                    >
                      <Typography sx={{ color: 'rgba(15, 23, 42, 0.45)', fontWeight: 650 }}>
                        No favorites yet. Search a city to add!
                      </Typography>
                    </Box>
                  ) : (
                    favoriteCities.map((city) => (
                      <Box
                        key={city.id ?? city.cityName}
                        component="button"
                        type="button"
                        onClick={() => void handleFavoriteCityClick(city.cityName)}
                        title={`Search weather for ${city.cityName}`}
                        aria-label={`Search weather for ${city.cityName}`}
                        sx={{
                          flexShrink: 0,
                          boxSizing: 'border-box',
                          height: FAVORITE_LIST_ROW_PX,
                          minHeight: FAVORITE_LIST_ROW_PX,
                          px: 1.5,
                          py: 1.25,
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '18px',
                          border: '1px solid',
                          borderColor: 'rgba(15, 23, 42, 0.06)',
                          bgcolor: '#f8f9fa',
                          minWidth: 0,
                          width: '100%',
                          cursor: 'pointer',
                          textAlign: 'left',
                          font: 'inherit',
                          color: 'inherit',
                          transition: 'background-color 140ms ease',
                          '&:hover': {
                            bgcolor: 'rgba(15, 23, 42, 0.07)',
                          },
                          '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: 2,
                          },
                        }}
                      >
                        <Typography
                          title={city.cityName}
                          sx={{
                            fontWeight: 800,
                            width: '100%',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                          }}
                        >
                          {city.cityName}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
              {!isLoggedIn ? (
                <Box sx={lockedOverlaySx}>
                  <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>
                    Register to unlock analytics and favorites.
                  </Typography>
                </Box>
              ) : null}
            </Paper>

            <Paper sx={{ ...cardSx, p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={metricIconSx('#e0f2fe', '#0369a1')}>
                  <UmbrellaOutlinedIcon fontSize="small" />
                </Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: -0.2 }}>Chances of Rain</Typography>
              </Stack>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 950 }}>
                {rainChance}
              </Typography>
            </Paper>

            <Paper sx={{ ...cardSx, p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={metricIconSx('#ecfeff', '#0f766e')}>
                  <AirOutlinedIcon fontSize="small" />
                </Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: -0.2 }}>Wind Speed</Typography>
              </Stack>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 950 }}>
                {windSpeed}
              </Typography>
            </Paper>

            <Paper sx={{ ...cardSx, p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={metricIconSx('#e0f2fe', '#075985')}>
                  <WaterDropOutlinedIcon fontSize="small" />
                </Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: -0.2 }}>Humidity</Typography>
              </Stack>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 950 }}>
                {humidity}
              </Typography>
            </Paper>

            <Paper sx={{ ...cardSx, p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={metricIconSx('#ede9fe', '#5b21b6')}>
                  <WbTwilightOutlinedIcon fontSize="small" />
                </Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: -0.2 }}>Sunrise / Sunset</Typography>
              </Stack>
              <Box
                sx={{
                  mt: 1.25,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  rowGap: 0.75,
                  columnGap: 1,
                }}
              >
                <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>Sunrise</Typography>
                <Typography sx={{ fontWeight: 900 }}>{sunrise}</Typography>
                <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>Sunset</Typography>
                <Typography sx={{ fontWeight: 900 }}>{sunset}</Typography>
              </Box>
            </Paper>
          </Stack>
          ) : null}
          </Box>
        )}
      </Box>
    </Box>
  )
}

