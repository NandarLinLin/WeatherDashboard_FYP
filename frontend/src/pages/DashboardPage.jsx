/* Author: Nandar Lin */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
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
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip as MuiTooltip, // <--- Rename it here
  Typography,
} from '@mui/material'

import CityNotFound from '../components/CityNotFound.jsx'
import { fetchCityWeather } from '../lib/weatherApi.js'
import {
  fetchFavoriteCities,
  getApiErrorMessage,
  putUserHomeCity,
  removeFavoriteCity,
  saveFavoriteCity,
} from '../lib/favoritesApi.js'
import { formatTemperature, temperatureChartValue } from '../lib/temperatureUnits.js'
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

const SEVERE_DESCRIPTION_KEYWORDS = ['storm', 'hurricane', 'tornado']

/**
 * Severe if the description mentions storm/hurricane/tornado (case-insensitive) or
 * temperature is outside (-10°C, 40°C) — API values are metric (°C).
 * @param {{ weatherDescription?: string, description?: string, temperatureCelsius?: number|null }} weatherData
 */
function checkSevereWeather(weatherData) {
  if (!weatherData || typeof weatherData !== 'object') return false
  const raw =
    typeof weatherData.weatherDescription === 'string'
      ? weatherData.weatherDescription
      : typeof weatherData.description === 'string'
        ? weatherData.description
        : ''
  const desc = raw.toLowerCase()
  if (SEVERE_DESCRIPTION_KEYWORDS.some((kw) => desc.includes(kw))) return true
  const temp = weatherData.temperatureCelsius
  const t = typeof temp === 'number' ? temp : Number(temp)
  if (Number.isFinite(t) && (t > 40 || t < -10)) return true
  return false
}

/** Home-city snapshot: true when conditions qualify as severe (does not read user settings). */
function evaluateHomeCitySevereWeatherAlert(weatherData) {
  return checkSevereWeather(weatherData)
}

/** User-facing severe alert from data + severe-weather notifications toggle. */
function showSmartSevereWeatherAlert(isSevereWeather, severeWeatherAlertsEnabled) {
  return Boolean(severeWeatherAlertsEnabled) && Boolean(isSevereWeather)
}

const GLANCE_PHOTO_TEXT_SHADOW = '1px 1px 4px rgba(0, 0, 0, 0.6)'

/** Row height in recent-searches sidebar list; container fits exactly 3 rows + gaps (see theme in list Box sx). */
const FAVORITE_LIST_ROW_PX = 72
const FAVORITE_LIST_VISIBLE_ROWS = 3

const RECENT_SEARCHES_STORAGE_KEY_PREFIX = 'weatherwise_recent_searches_'
const MAX_RECENT_SEARCHES = 5

function parseRecentSearchesFromStorage(storageKey) {
  try {
    const key = typeof storageKey === 'string' ? storageKey : ''
    if (!key) return []
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => s.trim())
  } catch {
    return []
  }
}

/** Dedupe by case-insensitive name, move latest to front, cap length. */
function buildNextRecentSearches(prev, cityName) {
  const name = typeof cityName === 'string' ? cityName.trim() : ''
  if (!name) return prev
  const norm = name.toLowerCase()
  const filtered = prev.filter((c) => (typeof c === 'string' ? c : '').trim().toLowerCase() !== norm)
  return [name, ...filtered].slice(0, MAX_RECENT_SEARCHES)
}

/** Recharts line-chart tooltip: time + temp, high-contrast on white. */
function CustomTooltip({ active, payload, useFahrenheit }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const timeLabel = row?.time12 ?? row?.time
  const raw = row?.temperatureDisplay ?? payload[0]?.value
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n) || timeLabel == null) return null
  const deg = useFahrenheit ? '°F' : '°C'
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        color: '#121212',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 10,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        lineHeight: 1.45,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div>Time: {String(timeLabel)}</div>
      <div>Temp: {n}{deg}</div>
    </div>
  )
}

export default function DashboardPage({ isLoggedIn = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { authHeader, useFahrenheit, user, applyServerProfile, darkMode } = useAuth()
  const isGuest = !isLoggedIn
  const guestDefaultWeatherDoneRef = useRef(false)
  const userDefaultWeatherKeyRef = useRef(null)
  const saveSuccessTimeoutRef = useRef(null)
  const [cityQuery, setCityQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [searchError, setSearchError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isUpdatingHomeCity, setIsUpdatingHomeCity] = useState(false)
  const [homeCityError, setHomeCityError] = useState(null)
  const [favoriteCities, setFavoriteCities] = useState([])
  const storageKey = useMemo(() => {
    const rawId = user?.email ?? (user?.id != null ? String(user.id) : null)
    const id = typeof rawId === 'string' ? rawId.trim() : ''
    if (!isLoggedIn || !id) return `${RECENT_SEARCHES_STORAGE_KEY_PREFIX}guest`
    return `${RECENT_SEARCHES_STORAGE_KEY_PREFIX}${encodeURIComponent(id)}`
  }, [isLoggedIn, user?.email, user?.id])

  const [recentSearches, setRecentSearches] = useState([])
  /** When the dashboard shows a city other than home, we still fetch home conditions for smart alerts. */
  const [homeCityWeatherForAlert, setHomeCityWeatherForAlert] = useState(null)
  const [isTestMode, setIsTestMode] = useState(false)
  const [weatherSnapshot, setWeatherSnapshot] = useState({
    cityName: 'London',
    temperatureCelsius: null,
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
    temperatureCelsius,
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

  const loadFavorites = async () => {
    if (!isLoggedIn) {
      setFavoriteCities([])
      return
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
      /* Keep last loaded favorites if refresh fails (no sidebar error UI). */
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => loadFavorites())
  }, [isLoggedIn, authHeader])

  useLayoutEffect(() => {
    if (!isLoggedIn) {
      setRecentSearches([])
      return
    }
    setRecentSearches(parseRecentSearchesFromStorage(storageKey))
  }, [isLoggedIn, storageKey])

  const addRecentSearch = useCallback(
    (cityName) => {
      if (!isLoggedIn) return
      setRecentSearches((prev) => {
        const next = buildNextRecentSearches(prev, cityName)
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          /* ignore quota / private mode */
        }
        return next
      })
    },
    [isLoggedIn, storageKey],
  )

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
        temperatureCelsius: Number.isFinite(weather?.temperatureCelsius)
          ? weather.temperatureCelsius
          : current.temperatureCelsius,
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

  /** Load weather for a city passed via navigation (Navbar, landing search, favorites). Runs when `searchCity` or `initialCity` is present. */
  useEffect(() => {
    const fromNav =
      typeof location.state?.searchCity === 'string' ? location.state.searchCity.trim() : ''
    const fromLanding =
      typeof location.state?.initialCity === 'string' ? location.state.initialCity.trim() : ''
    const city = fromNav || fromLanding
    if (!city) return

    queueMicrotask(() => {
      navigate('.', { replace: true, state: {} })
      setCityQuery(city)
      setIsInitialLoading(true)
      setSearchError(null)
      guestDefaultWeatherDoneRef.current = true
      if (isLoggedIn && user?.id != null) {
        userDefaultWeatherKeyRef.current = `user:${user.id}`
      }

      fetchCityWeather(city)
        .then((weather) => {
          applyWeatherSnapshot(weather, city)
          const resolved =
            typeof weather?.city === 'string' && weather.city.trim() ? weather.city.trim() : city
          addRecentSearch(resolved)
        })
        .catch((error) => {
          setSearchError(error)
        })
        .finally(() => {
          setIsInitialLoading(false)
        })
    })
  }, [location.key, navigate, isLoggedIn, user?.id, addRecentSearch])

  useEffect(() => {
    if (isLoggedIn) {
      guestDefaultWeatherDoneRef.current = false
    } else {
      userDefaultWeatherKeyRef.current = null
    }
  }, [isLoggedIn])

  /** Default city on first visit when no city was passed in location state (handled above). */
  useEffect(() => {
    Promise.resolve().then(() => {
      const fromNav =
        typeof location.state?.searchCity === 'string' ? location.state.searchCity.trim() : ''
      const fromLanding =
        typeof location.state?.initialCity === 'string' ? location.state.initialCity.trim() : ''
      const routeCity = fromNav || fromLanding
      if (routeCity) return

      if (isLoggedIn && user?.id == null) return

      if (isLoggedIn && user?.id != null) {
        const sessionKey = `user:${user.id}`
        if (userDefaultWeatherKeyRef.current === sessionKey) return
        userDefaultWeatherKeyRef.current = sessionKey

        const initialCity =
          typeof user.homeCity === 'string' && user.homeCity.trim() ? user.homeCity.trim() : 'London'

        setCityQuery(initialCity)
        setIsInitialLoading(true)
        setSearchError(null)

        fetchCityWeather(initialCity)
          .then((weather) => {
            applyWeatherSnapshot(weather, initialCity)
            const resolved =
              typeof weather?.city === 'string' && weather.city.trim()
                ? weather.city.trim()
                : initialCity
            addRecentSearch(resolved)
          })
          .catch((error) => {
            setSearchError(error)
          })
          .finally(() => {
            setIsInitialLoading(false)
          })
        return
      }

      if (guestDefaultWeatherDoneRef.current) return
      guestDefaultWeatherDoneRef.current = true

      const defaultCity = 'London'
      setCityQuery(defaultCity)
      setIsInitialLoading(true)
      setSearchError(null)

      fetchCityWeather(defaultCity)
        .then((weather) => {
          applyWeatherSnapshot(weather, defaultCity)
          const resolved =
            typeof weather?.city === 'string' && weather.city.trim()
              ? weather.city.trim()
              : defaultCity
          addRecentSearch(resolved)
        })
        .catch((error) => {
          setSearchError(error)
        })
        .finally(() => {
          setIsInitialLoading(false)
        })
    })
  }, [isLoggedIn, user?.id, user?.homeCity, navigate, location.state, addRecentSearch])

  const trimmedHomeCity = useMemo(() => {
    const raw = typeof user?.homeCity === 'string' ? user.homeCity.trim() : ''
    return raw || ''
  }, [user])

  const normalizedActiveCity = useMemo(() => (cityName || '').trim().toLowerCase(), [cityName])
  const matchingFavorite = useMemo(() => {
    if (!normalizedActiveCity) return null
    return favoriteCities.find((fav) => (fav?.cityName || '').trim().toLowerCase() === normalizedActiveCity) ?? null
  }, [favoriteCities, normalizedActiveCity])

  useEffect(() => {
    if (!isLoggedIn || !trimmedHomeCity || !user?.severeWeatherAlerts) {
      queueMicrotask(() => setHomeCityWeatherForAlert(null))
      return
    }
    const viewingHome = normalizedActiveCity === trimmedHomeCity.toLowerCase()
    if (viewingHome) {
      queueMicrotask(() => setHomeCityWeatherForAlert(null))
      return
    }
    let cancelled = false
    fetchCityWeather(trimmedHomeCity)
      .then((weather) => {
        if (cancelled) return
        setHomeCityWeatherForAlert({
          description: typeof weather?.description === 'string' ? weather.description : '',
          temperatureCelsius: Number.isFinite(weather?.temperatureCelsius) ? weather.temperatureCelsius : null,
        })
      })
      .catch(() => {
        if (!cancelled) setHomeCityWeatherForAlert(null)
      })
    return () => {
      cancelled = true
    }
  }, [isLoggedIn, trimmedHomeCity, normalizedActiveCity, user?.severeWeatherAlerts])

  const homeCityWeatherDataForSevereCheck = useMemo(() => {
    if (!trimmedHomeCity) return null
    const viewingHome = normalizedActiveCity === trimmedHomeCity.toLowerCase()
    return {
      weatherDescription: viewingHome ? description : homeCityWeatherForAlert?.description ?? '',
      temperatureCelsius: viewingHome ? temperatureCelsius : homeCityWeatherForAlert?.temperatureCelsius ?? null,
    }
  }, [
    trimmedHomeCity,
    normalizedActiveCity,
    description,
    temperatureCelsius,
    homeCityWeatherForAlert,
  ])

  const isSevereWeather = evaluateHomeCitySevereWeatherAlert(homeCityWeatherDataForSevereCheck)
  const severeAlertsOn = Boolean(user?.severeWeatherAlerts)
  const showFromHomeConditions = showSmartSevereWeatherAlert(isSevereWeather, severeAlertsOn)
  const showSevereWeatherBanner =
    isLoggedIn && severeAlertsOn && (showFromHomeConditions || isTestMode)

  const runWeatherSearch = async (trimmedQuery) => {
    setIsSearching(true)
    setSearchError(null)
    setSaveError(null)
    setHomeCityError(null)
    if (saveSuccessTimeoutRef.current) {
      clearTimeout(saveSuccessTimeoutRef.current)
      saveSuccessTimeoutRef.current = null
    }
    setSaveSuccess(false)

    try {
      const weather = await fetchCityWeather(trimmedQuery)
      applyWeatherSnapshot(weather, trimmedQuery)
      const resolved =
        typeof weather?.city === 'string' && weather.city.trim() ? weather.city.trim() : trimmedQuery
      addRecentSearch(resolved)
    } catch (error) {
      setSearchError(error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async (overrideCity) => {
    const fromOverride = typeof overrideCity === 'string' && overrideCity.trim() !== ''
    const trimmedQuery = fromOverride ? overrideCity.trim() : cityQuery.trim()
    if (!trimmedQuery) return
    if (fromOverride) setCityQuery(trimmedQuery)
    await runWeatherSearch(trimmedQuery)
  }

  const handleRetry = () => {
    setCityQuery('')
    setSearchError(null)
    setHomeCityError(null)
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
      await loadFavorites()
    } catch (error) {
      setSaveError(getApiErrorMessage(error, 'Could not save this city. Please try again.'))
    } finally {
      setIsSaving(false)
    }
  }

  const isActiveHomeCity =
    Boolean(trimmedHomeCity) && normalizedActiveCity === trimmedHomeCity.toLowerCase()
  const myCityButtonLabel = isActiveHomeCity
    ? 'My Home City'
    : trimmedHomeCity
      ? 'Change My City'
      : 'Set as My City'

  const handleSetHomeCity = async () => {
    if (!isLoggedIn || !authHeader) return
    const name = (cityName || '').trim()
    if (!name || isActiveHomeCity) return
    setIsUpdatingHomeCity(true)
    setHomeCityError(null)
    try {
      const profile = await putUserHomeCity({ authHeader, city: name })
      applyServerProfile(profile)
    } catch (error) {
      setHomeCityError(getApiErrorMessage(error, 'Could not update home city. Please try again.'))
    } finally {
      setIsUpdatingHomeCity(false)
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
      await loadFavorites()
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
      high: formatTemperature(item?.temperatureMaxCelsius, useFahrenheit),
      low: formatTemperature(item?.temperatureMinCelsius, useFahrenheit),
      icon: item?.icon ?? null,
      description: item?.description ?? '',
    }))
  }, [forecast, useFahrenheit])

  const hourlyTemperatureSeries = useMemo(() => {
    if (!Array.isArray(hourlyForecast) || hourlyForecast.length === 0) return []
    return hourlyForecast
      .map((item, index) => {
        const c = Number(item?.temperatureCelsius)
        const display = temperatureChartValue(c, useFahrenheit)
        return {
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
          temperatureCelsius: c,
          temperatureDisplay: display,
        }
      })
      .filter((item) => Number.isFinite(item.temperatureCelsius) && item.temperatureDisplay != null)
  }, [hourlyForecast, timezoneOffsetSeconds, useFahrenheit])

  const tempUnitSuffix = useFahrenheit ? 'F' : 'C'

  const cardSx = useMemo(
    () => ({
      bgcolor: darkMode ? '#1e1e1e' : '#ffffff',
      borderRadius: '24px',
      boxShadow: darkMode ? '0px 4px 20px rgba(0, 0, 0, 0.45)' : '0px 4px 20px rgba(0, 0, 0, 0.05)',
      border: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.06)',
    }),
    [darkMode],
  )

  const glancePhotoIconDropShadow = 'drop-shadow(1px 1px 3px rgba(0, 0, 0, 0.65))'

  const pageBg = darkMode ? '#121212' : '#ffffff'

  const chartGridStroke = darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)'
  const chartAxisLineStroke = darkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(15, 23, 42, 0.22)'
  const chartAxisTick = darkMode
    ? { fill: '#e8eaed', fontSize: 12, fontWeight: 700 }
    : { fill: '#0f172a', fontSize: 12, fontWeight: 700 }
  const chartAxisTickY = darkMode
    ? { fill: '#e8eaed', fontSize: 12, fontWeight: 700 }
    : { fill: '#0f172a', fontSize: 12, fontWeight: 700 }
  const chartLineStroke = darkMode ? '#e2e8f0' : '#0f172a'

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

  /** Guest-only sections: sharper blur per product spec (chart keeps lockedContentSx). */
  const guestBlurLayerSx = {
    filter: 'blur(5px)',
    pointerEvents: 'none',
    userSelect: 'none',
    transition: 'filter 180ms ease',
  }

  const lockedOverlaySx = {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    px: 2.5,
    textAlign: 'center',
    bgcolor: darkMode ? 'rgba(18, 18, 18, 0.55)' : 'rgba(248, 249, 250, 0.35)',
    backdropFilter: 'blur(1px)',
  }

  const guestSectionOverlaySx = {
    ...lockedOverlaySx,
    bgcolor: darkMode ? 'rgba(18, 18, 18, 0.42)' : 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(2px)',
  }

  const condition = (
    weatherSnapshot?.weatherDescription ||
    weatherSnapshot?.description ||
    weatherSnapshot?.weather?.[0]?.description ||
    ''
  ).toLowerCase()

  let dashboardBgImage =
    'https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=800&auto=format&fit=crop&q=80'

  if (
    condition.includes('overcast') ||
    condition.includes('scattered') ||
    condition.includes('broken') ||
    condition.includes('scatter') ||
    condition.includes('cloud')
  ) {
    dashboardBgImage =
      'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop&q=80'
  } else if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
    dashboardBgImage =
      'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&auto=format&fit=crop&q=80'
  }

  const glancePhotoOn = true
  const glancePhotoTextSx = {
    color: 'rgba(255, 255, 255, 0.95)',
    textShadow: GLANCE_PHOTO_TEXT_SHADOW,
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
      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          display: 'grid',
          gap: '24px',
        }}
      >
        <Box sx={{ mb: { xs: 0.25, md: 0.75 } }}>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, mb: 1, color: 'text.primary' }}>
            Dashboard
          </Typography>

          <Box
            sx={{
              mt: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto auto' },
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
                    <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mr: 0.5 }}>
                      <WbSunnyOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <MuiTooltip
                        title={
                          trimmedHomeCity
                            ? `Show weather for ${trimmedHomeCity}`
                            : 'Set your home city from the Dashboard'
                        }
                      >
                        <span>
                          <IconButton
                            type="button"
                            size="small"
                            disabled={!trimmedHomeCity}
                            onClick={() => void handleSearch(user?.homeCity)}
                            aria-label="Show weather for home city"
                            sx={{ color: 'text.secondary' }}
                          >
                            <HomeRoundedIcon sx={{ fontSize: 22 }} />
                          </IconButton>
                        </span>
                      </MuiTooltip>
                    </Stack>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px',
                  bgcolor: darkMode ? '#1e1e1e' : '#ffffff',
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
            <Box
              component="button"
              type="button"
              onClick={() => setIsTestMode(!isTestMode)}
              sx={{
                borderRadius: '24px',
                minHeight: 58,
                px: 1.75,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.2)',
                bgcolor: isTestMode ? 'rgba(185, 28, 28, 0.12)' : darkMode ? '#1e1e1e' : '#ffffff',
                color: darkMode ? '#e2e8f0' : '#0f172a',
                fontFamily: 'inherit',
              }}
            >
              Toggle Test Alert
            </Box>
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
            <Paper
              sx={{
                p: 4,
                borderRadius: '24px',
                bgcolor: 'transparent',
                transition: 'background-image 320ms ease, box-shadow 240ms ease',
                overflow: 'hidden',
                boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.22)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
              }}
              style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.35)), url(${dashboardBgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <Stack spacing={3}>
                {showSevereWeatherBanner ? (
                  <Alert
                    severity="error"
                    variant="filled"
                    icon={<WarningAmberRoundedIcon fontSize="inherit" />}
                    role="alert"
                    sx={{
                      borderRadius: '16px',
                      py: 1.25,
                      fontWeight: 700,
                      boxShadow: (theme) =>
                        theme.palette.mode === 'dark'
                          ? '0 10px 28px rgba(0, 0, 0, 0.5)'
                          : '0 10px 28px rgba(185, 28, 28, 0.35)',
                    }}
                  >
                    <Typography component="div" variant="subtitle1" sx={{ fontWeight: 900, letterSpacing: -0.02 }}>
                      {isTestMode
                        ? 'Severe Weather Alert: Hurricane conditions detected (Test Mode Active)'
                        : `Warning: Severe weather detected in your Home City (${trimmedHomeCity}). Please take necessary precautions!`}
                    </Typography>
                  </Alert>
                ) : null}
                <Typography
                  sx={{
                    fontWeight: 900,
                    letterSpacing: 0.4,
                    ...glancePhotoTextSx,
                  }}
                >
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
                      <Typography
                        variant="h5"
                        sx={{
                          ...glancePhotoTextSx,
                          fontWeight: 800,
                          lineHeight: 1.45,
                          mb: 1,
                        }}
                      >
                        {cityName}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          ...glancePhotoTextSx,
                          fontWeight: 600,
                          lineHeight: 1.5,
                          mb: 0.25,
                        }}
                      >
                        {todayDate}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          ...glancePhotoTextSx,
                          fontWeight: 650,
                          lineHeight: 1.5,
                          mb: 1.5,
                        }}
                      >
                        Local time: {localTimeLabel}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: { xs: '3.2rem', md: '4rem' },
                          lineHeight: 1.12,
                          fontWeight: 900,
                          letterSpacing: -1.2,
                          ...glancePhotoTextSx,
                          color: 'rgba(255, 255, 255, 0.98)',
                        }}
                      >
                        {formatTemperature(temperatureCelsius, useFahrenheit)}
                      </Typography>
                    </Stack>

                    <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 96 }}>
                      {isLocalNight ? (
                        <NightsStayOutlinedIcon
                          sx={{
                            fontSize: 44,
                            color: glancePhotoOn ? 'rgba(255, 255, 255, 0.95)' : 'text.secondary',
                            filter: glancePhotoOn ? glancePhotoIconDropShadow : undefined,
                          }}
                          aria-hidden
                        />
                      ) : icon ? (
                        <Box
                          component="img"
                          alt={description || 'Weather icon'}
                          src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
                          sx={{
                            width: 44,
                            height: 44,
                            display: 'block',
                            filter: glancePhotoOn ? glancePhotoIconDropShadow : undefined,
                          }}
                        />
                      ) : (
                        <WbSunnyOutlinedIcon
                          sx={{
                            fontSize: 40,
                            color: glancePhotoOn ? 'rgba(255, 255, 255, 0.95)' : 'text.secondary',
                            filter: glancePhotoOn ? glancePhotoIconDropShadow : undefined,
                          }}
                          aria-hidden
                        />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          ...glancePhotoTextSx,
                          fontWeight: 700,
                          textAlign: 'center',
                        }}
                      >
                        {description}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ flexShrink: 0 }}
                  >
                    <Button
                      variant="outlined"
                      disabled={!isLoggedIn || isSaving || isUpdatingHomeCity || Boolean(matchingFavorite)}
                      onClick={matchingFavorite ? undefined : handleSaveCity}
                      sx={{
                        borderRadius: 999,
                        fontWeight: 700,
                        textTransform: 'none',
                        px: 2,
                        py: 0.75,
                        flexShrink: 0,
                        ...(glancePhotoOn
                          ? {
                              color: 'rgba(255, 255, 255, 0.96)',
                              borderColor: 'rgba(255, 255, 255, 0.72)',
                              textShadow: GLANCE_PHOTO_TEXT_SHADOW,
                              '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255, 255, 255, 0.12)' },
                            }
                          : {}),
                      }}
                    >
                      {isSaving ? 'Saving...' : matchingFavorite ? 'Saved' : 'Save City'}
                    </Button>
                    {isLoggedIn && matchingFavorite ? (
                      <Button
                        variant="text"
                        disabled={isSaving || isUpdatingHomeCity}
                        onClick={handleUnsaveCity}
                        sx={{
                          borderRadius: 999,
                          fontWeight: 800,
                          textTransform: 'none',
                          px: 1.5,
                          py: 0.75,
                          flexShrink: 0,
                          ...(glancePhotoOn
                            ? {
                                color: 'rgba(255, 255, 255, 0.95)',
                                textShadow: GLANCE_PHOTO_TEXT_SHADOW,
                                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
                              }
                            : {}),
                        }}
                      >
                        Unsave
                      </Button>
                    ) : null}
                    {isLoggedIn ? (
                      <Button
                        variant={isActiveHomeCity ? 'contained' : 'outlined'}
                        color="primary"
                        disabled={isActiveHomeCity || isUpdatingHomeCity || isSaving}
                        onClick={() => void handleSetHomeCity()}
                        sx={{
                          borderRadius: 999,
                          fontWeight: 700,
                          textTransform: 'none',
                          px: 2,
                          py: 0.75,
                          flexShrink: 0,
                          ...(glancePhotoOn && !isActiveHomeCity
                            ? {
                                color: 'rgba(255, 255, 255, 0.96)',
                                borderColor: 'rgba(255, 255, 255, 0.72)',
                                textShadow: GLANCE_PHOTO_TEXT_SHADOW,
                                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255, 255, 255, 0.12)' },
                              }
                            : {}),
                        }}
                      >
                        {isUpdatingHomeCity ? 'Updating...' : myCityButtonLabel}
                      </Button>
                    ) : null}
                  </Stack>
                </Box>
                {saveError ? (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'error.main',
                      fontWeight: 650,
                      ...(glancePhotoOn ? { textShadow: GLANCE_PHOTO_TEXT_SHADOW } : {}),
                    }}
                  >
                    {saveError}
                  </Typography>
                ) : saveSuccess ? (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'success.main',
                      fontWeight: 650,
                      ...(glancePhotoOn ? { textShadow: GLANCE_PHOTO_TEXT_SHADOW } : {}),
                    }}
                  >
                    Saved to favorites.
                  </Typography>
                ) : null}
                {homeCityError ? (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'error.main',
                      fontWeight: 650,
                      ...(glancePhotoOn ? { textShadow: GLANCE_PHOTO_TEXT_SHADOW } : {}),
                    }}
                  >
                    {homeCityError}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>

            <Paper
              sx={{
                ...cardSx,
                ...(isGuest ? lockedCardSx : null),
                p: { xs: 2.25, md: 3 },
              }}
            >
              <Box sx={isGuest ? guestBlurLayerSx : null}>
                <Typography sx={{ fontWeight: 950, letterSpacing: -0.3, color: 'text.primary' }}>5-Day Forecast</Typography>
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
                        borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
                        bgcolor: darkMode ? '#121212' : 'background.default',
                        textAlign: 'center',
                      }}
                    >
                      <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>{item.day}</Typography>
                      {item.icon ? (
                        <Box
                          component="img"
                          alt={item.description || 'Forecast icon'}
                          src={`https://openweathermap.org/img/wn/${item.icon}@2x.png`}
                          sx={{ mt: 0.5, width: 44, height: 44, display: 'block', mx: 'auto' }}
                        />
                      ) : (
                        <WbSunnyOutlinedIcon sx={{ mt: 0.75, fontSize: 40, color: 'text.secondary' }} />
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
              </Box>
              {isGuest ? (
                <Box sx={guestSectionOverlaySx} role="presentation">
                  <Typography
                    sx={{
                      fontWeight: 900,
                      color: 'text.primary',
                      maxWidth: 280,
                      lineHeight: 1.35,
                      textShadow: darkMode ? '0 1px 12px rgba(0,0,0,0.75)' : '0 1px 10px rgba(255,255,255,0.9)',
                    }}
                  >
                    Register to unlock extended forecasts.
                  </Typography>
                </Box>
              ) : null}
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
              <Typography sx={{ fontWeight: 950, letterSpacing: -0.3, color: 'text.primary' }}>
                Temperature Trend (24h)
              </Typography>
              <Box sx={!isLoggedIn ? lockedContentSx : null}>
                <Box sx={{ mt: 2, height: { xs: 200, md: '100%' }, minHeight: { md: 240 } }}>
                  {hourlyTemperatureSeries.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hourlyTemperatureSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke={chartGridStroke} strokeDasharray="4 4" />
                        <XAxis
                          dataKey="time"
                          tick={chartAxisTick}
                          interval="preserveStartEnd"
                          axisLine={{ stroke: chartAxisLineStroke }}
                          tickLine={{ stroke: chartAxisLineStroke }}
                        />
                        <YAxis
                          tick={chartAxisTickY}
                          tickFormatter={(value) => `${Math.round(Number(value))}°${tempUnitSuffix}`}
                          width={44}
                          axisLine={{ stroke: chartAxisLineStroke }}
                          tickLine={{ stroke: chartAxisLineStroke }}
                        />
                        <Tooltip
                          content={<CustomTooltip useFahrenheit={useFahrenheit} />}
                          cursor={false}
                          wrapperStyle={{ outline: 'none' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="temperatureDisplay"
                          stroke={chartLineStroke}
                          strokeWidth={3}
                          dot={false}
                          activeDot={{
                            r: 6,
                            fill: '#ffffff',
                            stroke: '#121212',
                            strokeWidth: 2,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box
                      sx={{
                        height: '100%',
                        borderRadius: '18px',
                        border: '1px dashed',
                        borderColor: darkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.12)',
                        bgcolor: darkMode ? '#121212' : 'background.default',
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
                ...(isGuest ? lockedCardSx : null),
                p: { xs: 2.25, md: 2.5 },
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <Box sx={isGuest ? guestBlurLayerSx : null}>
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <Typography sx={{ fontWeight: 900, letterSpacing: -0.2, flexShrink: 0, color: 'text.primary' }}>
                    Recent Searches
                  </Typography>
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
                        scrollbarColor: darkMode
                          ? 'rgba(255, 255, 255, 0.22) transparent'
                          : 'rgba(15, 23, 42, 0.18) transparent',
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.12)',
                          borderRadius: 999,
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                          backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.28)' : 'rgba(15, 23, 42, 0.28)',
                        },
                      }
                    }}
                  >
                    {recentSearches.length === 0 ? (
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
                        <Typography sx={{ color: 'text.secondary', fontWeight: 650 }}>
                          No recent searches yet. Search a city to see it here.
                        </Typography>
                      </Box>
                    ) : (
                      recentSearches.map((cityName) => (
                        <Box
                          key={cityName}
                          component="button"
                          type="button"
                          onClick={() => void handleSearch(cityName)}
                          title={`Search weather for ${cityName}`}
                          aria-label={`Search weather for ${cityName}`}
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
                            borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.06)',
                            bgcolor: darkMode ? '#121212' : 'background.default',
                            minWidth: 0,
                            width: '100%',
                            cursor: 'pointer',
                            textAlign: 'left',
                            font: 'inherit',
                            color: 'text.primary',
                            transition: 'background-color 140ms ease',
                            '&:hover': {
                              bgcolor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.07)',
                            },
                            '&:focus-visible': {
                              outline: '2px solid',
                              outlineColor: 'primary.main',
                              outlineOffset: 2,
                            },
                          }}
                        >
                          <Typography
                            title={cityName}
                            sx={{
                              fontWeight: 800,
                              width: '100%',
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              pointerEvents: 'none',
                              color: 'text.primary',
                            }}
                          >
                            {cityName}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              </Box>
              {isGuest ? (
                <Box sx={guestSectionOverlaySx} role="presentation">
                  <Typography
                    sx={{
                      fontWeight: 900,
                      color: 'text.primary',
                      maxWidth: 260,
                      lineHeight: 1.35,
                      textShadow: darkMode ? '0 1px 12px rgba(0,0,0,0.75)' : '0 1px 10px rgba(255,255,255,0.9)',
                    }}
                  >
                    Sign in to see search history.
                  </Typography>
                </Box>
              ) : null}
            </Paper>

            <Paper sx={{ ...cardSx, p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={metricIconSx('#e0f2fe', '#0369a1')}>
                  <UmbrellaOutlinedIcon fontSize="small" />
                </Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: -0.2, color: 'text.primary' }}>
                  Chances of Rain
                </Typography>
              </Stack>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 950, color: 'text.primary' }}>
                {rainChance}
              </Typography>
            </Paper>

            <Paper sx={{ ...cardSx, p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={metricIconSx('#ecfeff', '#0f766e')}>
                  <AirOutlinedIcon fontSize="small" />
                </Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: -0.2, color: 'text.primary' }}>Wind Speed</Typography>
              </Stack>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 950, color: 'text.primary' }}>
                {windSpeed}
              </Typography>
            </Paper>

            <Paper sx={{ ...cardSx, p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={metricIconSx('#e0f2fe', '#075985')}>
                  <WaterDropOutlinedIcon fontSize="small" />
                </Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: -0.2, color: 'text.primary' }}>Humidity</Typography>
              </Stack>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 950, color: 'text.primary' }}>
                {humidity}
              </Typography>
            </Paper>

            <Paper sx={{ ...cardSx, p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={metricIconSx('#ede9fe', '#5b21b6')}>
                  <WbTwilightOutlinedIcon fontSize="small" />
                </Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: -0.2, color: 'text.primary' }}>
                  Sunrise / Sunset
                </Typography>
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
                <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>{sunrise}</Typography>
                <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>Sunset</Typography>
                <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>{sunset}</Typography>
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

