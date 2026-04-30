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
import { fetchFavoriteCities, removeFavoriteCity, saveFavoriteCity } from '../lib/favoritesApi.js'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { authHeader, isLoggedIn } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [cityQuery, setCityQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState(null)

  const canAdd = useMemo(() => Boolean(cityQuery.trim()), [cityQuery])
  const normalizedQuery = useMemo(() => cityQuery.trim().toLowerCase(), [cityQuery])
  const isAlreadyInFavorites = useMemo(() => {
    if (!normalizedQuery) return false
    return favorites.some((fav) => (fav?.cityName || '').trim().toLowerCase() === normalizedQuery)
  }, [favorites, normalizedQuery])

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

  const cardSx = {
    bgcolor: 'common.white',
    borderRadius: '24px',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
    border: '1px solid rgba(15, 23, 42, 0.06)',
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
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, mb: 0.75 }}>
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
                  <SearchRoundedIcon />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '24px',
                bgcolor: 'transparent',
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
            {favorites.map((city) => (
              <Paper key={city.id} sx={{ ...cardSx, p: 0, overflow: 'hidden' }}>
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
                        bgcolor: 'rgba(15, 23, 42, 0.06)',
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      },
                    }}
                  >
                    <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', lineHeight: 1.2 }}>
                      {city.cityName}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontWeight: 650, mt: 0.5 }}>
                      Saved city
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    justifyContent="flex-end"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ px: { xs: 2.25, md: 2.5 }, pb: { xs: 2.25, md: 2.5 } }}
                  >
                    <Button
                      onClick={() => handleRemoveFavorite(city.id)}
                      variant="outlined"
                      color="inherit"
                      startIcon={<DeleteOutlineRoundedIcon />}
                      sx={{ borderRadius: 999, fontWeight: 800, textTransform: 'none' }}
                    >
                      Remove
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Box>
        )}
      </Stack>
    </Box>
  )
}
