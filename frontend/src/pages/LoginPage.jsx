/* Author: Nandar Lin */

import { useState } from 'react'
import {
  Box,
  Divider,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Button } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getApiErrorMessage, loginUser } from '../lib/favoritesApi.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const data = await loginUser({ email: email.trim(), password })
      setSession({ token: data?.token, user: data?.user })
      navigate('/dashboard')
    } catch (error) {
      const status = error?.response?.status
      if (status === 401) {
        setSubmitError('Invalid email or password.')
      } else {
        setSubmitError(getApiErrorMessage(error, 'Login failed. Please try again.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: (theme) => theme.palette.grey[50],
        px: 2,
        py: 4,
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 4,
          p: { xs: 2.5, sm: 3.5 },
          bgcolor: 'common.white',
        }}
      >
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
              Log in
            </Typography>
            <Typography sx={{ mt: 0.75, color: 'text.secondary', fontWeight: 500 }}>
              Welcome back to WeatherWise.
            </Typography>
          </Box>

          <Stack spacing={1.75} component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              fullWidth
              size="medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              fullWidth
              size="medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={isSubmitting || !email.trim() || !password}
              sx={{
                mt: 0.5,
                borderRadius: 999,
                py: 1.25,
                fontWeight: 900,
                bgcolor: 'text.primary',
                color: 'background.paper',
                '&:hover': { bgcolor: 'text.primary' },
              }}
            >
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </Button>

            {submitError ? (
              <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
                {submitError}
              </Typography>
            ) : null}

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5 }}>
              <Divider sx={{ flexGrow: 1 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                or
              </Typography>
              <Divider sx={{ flexGrow: 1 }} />
            </Stack>

            <Button
              variant="outlined"
              sx={{
                borderRadius: 999,
                py: 1.15,
                fontWeight: 900,
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': { borderColor: 'text.primary', bgcolor: 'transparent' },
              }}
            >
              Continue with Google
            </Button>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link component={RouterLink} to="/register" underline="hover" sx={{ fontWeight: 800 }}>
              Register
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}

