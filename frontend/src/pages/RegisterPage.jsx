/* Author: Nandar Lin */

import { useMemo, useState } from 'react'
import { Box, Divider, Link, Paper, Stack, TextField, Typography } from '@mui/material'
import { Button } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { getApiErrorMessage, registerUser } from '../lib/favoritesApi.js'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const passwordLengthError = useMemo(() => {
    if (!password) return null
    if (password.length < 6) return 'Password must be at least 6 characters.'
    if (password.length > 72) return 'Password must be at most 72 characters.'
    return null
  }, [password])

  const passwordMismatch = useMemo(() => {
    if (!confirmPassword) return false
    return password !== confirmPassword
  }, [confirmPassword, password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await registerUser({ fullName: fullName.trim(), email: email.trim(), password })
      navigate('/login', { replace: true, state: { email: email.trim() } })
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Registration failed. Please try again.'))
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
              Create account
            </Typography>
            <Typography sx={{ mt: 0.75, color: 'text.secondary', fontWeight: 500 }}>
              Welcome back to WeatherWise.
            </Typography>
          </Box>

          <Stack spacing={1.75} component="form" onSubmit={handleSubmit}>
            <TextField
              label="Full Name"
              autoComplete="name"
              fullWidth
              size="medium"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
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
              autoComplete="new-password"
              fullWidth
              size="medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={Boolean(passwordLengthError)}
              helperText={passwordLengthError || ' '}
              required
            />
            <TextField
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              fullWidth
              size="medium"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={passwordMismatch}
              helperText={passwordMismatch ? 'Passwords do not match.' : ' '}
              required
            />

            {submitError ? (
              <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
                {submitError}
              </Typography>
            ) : null}

            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={
                isSubmitting ||
                !fullName.trim() ||
                !email.trim() ||
                !password ||
                !confirmPassword ||
                passwordMismatch ||
                Boolean(passwordLengthError)
              }
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
              {isSubmitting ? 'Creating...' : 'Create account'}
            </Button>

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
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="hover" sx={{ fontWeight: 800 }}>
              Log in
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}

