/* Author: Nandar Lin */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded'
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import StateMessage from '../components/StateMessage.jsx'
import { useAuth } from '../context/useAuth.js'
import { formatTemperature } from '../lib/temperatureUnits.js'
import { fetchFavoriteCities, removeFavoriteCity, saveFavoriteCity } from '../lib/favoritesApi.js'

/**
 * City wall clock from API unix seconds + API timezone offset; `timeZone: 'UTC'` keeps the browser's
 * local zone from shifting the formatted value (same approach as Dashboard).
 */
const formatCityTime = (unix, offset, options = {}) => {
  const date = new Date((unix + offset) * 1000)
  return date.toLocaleString('en-US', {
    ...options,
    timeZone: 'UTC',
  })
}

const FAVORITE_CARD_TEXT_SHADOW = '1px 1px 3px rgba(0, 0, 0, 0.5)'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { authHeader, isLoggedIn, useFahrenheit, darkMode } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [cityQuery, setCityQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))

  const canAdd = useMemo(() => Boolean(cityQuery.trim()), [cityQuery])
  const normalizedQuery = useMemo(() => cityQuery.trim().toLowerCase(), [cityQuery])
  const isAlreadyInFavorites = useMemo(() => {
    if (!normalizedQuery) return false
    return favorites.some((fav) => (fav?.cityName || '').trim().toLowerCase() === normalizedQuery)
  }, [favorites, normalizedQuery])

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000))
    }, 30_000)
    return () => window.clearInterval(id)
  }, [])

  const loadFavorites = async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      if (!authHeader) {
        navigate('/login', { replace: true, state: { from: '/favorites' } })
        return
      }
      const data = await fetchFavoriteCities({ authHeader })
      setFavorites(Array.isArray(data) ? data : [])
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: '/favorites' } })
        return
      }
      const message = error?.response?.data?.message || 'Could not load favorites.'
      setLoadError(message)
      setFavorites([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFavorite = async (favoriteId) => {
    try {
      await removeFavoriteCity({ favoriteId, authHeader })
      await loadFavorites()
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: '/favorites' } })
        return
      }
      const message = error?.response?.data?.message || 'Could not remove this favorite.'
      setLoadError(message)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      if (!isLoggedIn) {
        setFavorites([])
        setIsLoading(false)
        return
      }

      loadFavorites()
    })
  }, [isLoggedIn, authHeader])

  const handleAddFavorite = async () => {
    if (!canAdd) return
    if (isAlreadyInFavorites) return
    setIsAdding(true)
    setAddError(null)

    try {
      await saveFavoriteCity({ cityName: cityQuery.trim(), authHeader })
      setCityQuery('')
      await loadFavorites()
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: '/favorites' } })
        return
      }
      const message = error?.response?.data?.message || 'Could not save this city.'
      setAddError(message)
    } finally {
      setIsAdding(false)
    }
  }

  const cardSx = useMemo(
    () => ({
      bgcolor: darkMode ? '#1e1e1e' : '#ffffff',
      borderRadius: '24px',
      boxShadow: darkMode ? '0px 4px 20px rgba(0, 0, 0, 0.45)' : '0px 4px 20px rgba(0, 0, 0, 0.05)',
      border: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.06)',
    }),
    [darkMode],
  )

  const pageBg = darkMode ? '#121212' : '#f8f9fa'

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
            Favorite Cities
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Quick access to the places you care about most.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
            gap: 2,
            alignItems: 'stretch',
          }}
        >
          <TextField
            value={cityQuery}
            onChange={(event) => setCityQuery(event.target.value)}
            placeholder="Add a city..."
            size="medium"
            aria-label="Search city to add to favorites"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: 'text.secondary' }} />
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
            onClick={handleAddFavorite}
            disabled={!canAdd || isAdding || isAlreadyInFavorites}
            sx={{
              borderRadius: '24px',
              px: { xs: 3, md: 4 },
              minHeight: 58,
              bgcolor: 'text.primary',
              color: 'background.paper',
              fontWeight: 900,
              fontSize: '1.05rem',
              '&:hover': { bgcolor: 'text.primary' },
            }}
          >
            {isAdding ? 'Adding...' : isAlreadyInFavorites ? 'Already in favorites' : '+ Add'}
          </Button>
        </Box>

        {addError ? (
          <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
            {addError}
          </Typography>
        ) : null}

        {isLoading ? (
          <Box sx={{ mt: { xs: 4, md: 6 }, display: 'grid', placeItems: 'center' }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <CircularProgress size={18} />
              <Typography sx={{ color: 'text.secondary', fontWeight: 650 }}>Loading favorites...</Typography>
            </Stack>
          </Box>
        ) : loadError ? (
          <Box sx={{ mt: { xs: 4, md: 6 }, display: 'grid', placeItems: 'center' }}>
            <StateMessage
              icon={StarBorderRoundedIcon}
              title="Could not load favorites"
              description={loadError}
              actionLabel="Try again"
              onAction={loadFavorites}
            />
          </Box>
        ) : favorites.length === 0 ? (
          <Box sx={{ mt: { xs: 4, md: 6 }, display: 'grid', placeItems: 'center' }}>
            <StateMessage
              icon={StarBorderRoundedIcon}
              title="No favorites yet"
              description="Save cities from the dashboard to see them here."
              actionLabel="Browse cities"
              onAction={() => navigate('/dashboard')}
            />
          </Box>
        ) : (
          <Box
            sx={{
              mt: 4,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
              gap: 3,
            }}
          >
            {favorites.map((city) => {
              const hasTz =
                typeof city.timezoneOffsetSeconds === 'number' && Number.isFinite(city.timezoneOffsetSeconds)
              const timeLabel = hasTz
                ? formatCityTime(nowSec, city.timezoneOffsetSeconds, {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                : 'N/A'
              const rawTemp = city.temp ?? city.temperatureCelsius ?? city.temperature
              const tempNum = typeof rawTemp === 'number' ? rawTemp : Number(rawTemp)
              const hasTemp = Number.isFinite(tempNum)
              const tempLabel = hasTemp ? formatTemperature(tempNum, useFahrenheit) : 'N/A'
              const rawDesc = city.weatherDescription ?? city.description
              const desc =
                rawDesc != null && String(rawDesc).trim() !== '' ? String(rawDesc).trim() : null
              const rawIcon = city.iconCode ?? city.icon
              const iconCode =
                rawIcon != null && String(rawIcon).trim() !== '' ? String(rawIcon).trim() : null

              const condition = (
                city.weatherDescription ||
                city.description ||
                city.weather?.[0]?.description ||
                ''
              )
                .toLowerCase()
                .trim()

              let cardBgImage =
                'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop&q=80'

              if (condition.includes('clear') || condition.includes('sun')) {
                // 1. Clear Skies (Dubai)
                cardBgImage =
                  'https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=800&auto=format&fit=crop&q=80'
              } else if (
                condition.includes('overcast') ||
                condition.includes('scattered') ||
                condition.includes('broken') ||
                condition.includes('scatter')
              ) {
                // 2. Unified Cloud / Overcast Image (London, Osaka, Pathein, Vietnam, AND Hollywood)
                cardBgImage =
                  'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop&q=80'
              } else if (condition.includes('few') || condition.includes('cloud')) {
                // 3. Light / Few Clouds
                cardBgImage =
                  'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&auto=format&fit=crop&q=80'
              } else if (
                condition.includes('rain') ||
                condition.includes('drizzle') ||
                condition.includes('shower')
              ) {
                // 4. Rainy Conditions
                cardBgImage =
                  'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&auto=format&fit=crop&q=80'
              }

              console.log("City Name:", city.name, "Parsed Condition:", condition, "Assigned BG:", cardBgImage)

              return (
                <Paper
                  key={city.id}
                  style={{
                    backgroundImage: cardBgImage
                      ? `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.45)), url(${cardBgImage})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                  sx={{
                    ...cardSx,
                    p: 0,
                    overflow: 'hidden',
                    backgroundColor: 'transparent !important',
                    color: '#ffffff',
                  }}
                >
                  <Stack spacing={0}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => {
                        const name = (city?.cityName || '').trim()
                        if (!name) return
                        navigate('/dashboard', { state: { searchCity: name } })
                      }}
                      title={`Search weather for ${city.cityName} on the dashboard`}
                      aria-label={`Search weather for ${city.cityName} on the dashboard`}
                      sx={{
                        width: '100%',
                        p: { xs: 2.25, md: 2.5 },
                        cursor: 'pointer',
                        border: 'none',
                        bgcolor: 'transparent',
                        font: 'inherit',
                        color: 'inherit',
                        textAlign: 'left',
                        transition: 'background-color 140ms ease',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.08)',
                        },
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: -2,
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 900,
                          fontSize: '1.2rem',
                          lineHeight: 1.2,
                          color: '#ffffff',
                          textShadow: FAVORITE_CARD_TEXT_SHADOW,
                        }}
                      >
                        {city.cityName}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#ffffff',
                          fontWeight: 600,
                          mt: 0.75,
                          letterSpacing: 0.01,
                          textShadow: FAVORITE_CARD_TEXT_SHADOW,
                        }}
                      >
                        Local time: {timeLabel}
                      </Typography>

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          justifyContent: 'space-between',
                          gap: { xs: 1.5, sm: 2 },
                          mt: 2,
                          width: '100%',
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: 900,
                            fontSize: { xs: '2rem', sm: '2.25rem' },
                            lineHeight: 1.05,
                            letterSpacing: -0.03,
                            color: '#ffffff',
                            textShadow: FAVORITE_CARD_TEXT_SHADOW,
                          }}
                        >
                          {tempLabel}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 1.25,
                            minWidth: 0,
                            flexShrink: 0,
                          }}
                        >
                          {iconCode ? (
                            <Box
                              component="img"
                              src={`https://openweathermap.org/img/wn/${iconCode}@2x.png`}
                              alt={desc || 'Weather'}
                              sx={{ width: 56, height: 56, flexShrink: 0 }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : null}
                          <Typography
                            sx={{
                              color: '#ffffff',
                              fontWeight: 650,
                              fontSize: '0.95rem',
                              lineHeight: 1.35,
                              textAlign: { xs: 'left', sm: 'right' },
                              maxWidth: { xs: '100%', sm: 200 },
                              textShadow: FAVORITE_CARD_TEXT_SHADOW,
                            }}
                          >
                            {desc || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        px: { xs: 2.25, md: 2.5 },
                        pb: { xs: 2.25, md: 2.5 },
                        pt: 0.5,
                      }}
                    >
                      <Button
                        onClick={() => handleRemoveFavorite(city.id)}
                        variant="outlined"
                        color="inherit"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        sx={{
                          borderRadius: 999,
                          fontWeight: 800,
                          textTransform: 'none',
                          color: '#ffffff',
                          borderColor: 'rgba(255, 255, 255, 0.55)',
                          textShadow: FAVORITE_CARD_TEXT_SHADOW,
                          '&:hover': {
                            borderColor: '#ffffff',
                            bgcolor: 'rgba(255, 255, 255, 0.12)',
                          },
                        }}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Stack>
                </Paper>
              )
            })}
          </Box>
        )}
      </Stack>
    </Box>
  )
}
