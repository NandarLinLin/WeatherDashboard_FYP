/* Author: Nandar Lin */

import SearchIcon from '@mui/icons-material/Search'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

const FEATURES = [
  {
    title: 'Live Forecasts',
    description: 'Hourly + 7-day forecasts for any city worldwide.',
  },
  {
    title: 'Deep Analytics',
    description: 'Trends, charts and history at your fingertips.',
  },
  {
    title: 'Favorite Cities',
    description: 'Save cities and switch between them in one click.',
  },
  {
    title: 'Smart Alerts',
    description: 'Get notified about storms, heatwaves, and rain.',
  },
]

const COMPARISON = {
  guest: {
    title: 'Guest (preview)',
    items: [
      { label: 'View current weather for any city', ok: true },
      { label: 'Save favorite cities', ok: false },
      { label: 'Access analytics & history', ok: false },
    ],
  },
  loggedIn: {
    title: 'Free account',
    items: [
      { label: 'Save unlimited favorite cities', ok: true },
      { label: 'Full analytics dashboard', ok: true },
      { label: 'Personalized weather alerts', ok: true },
    ],
  },
}

export default function LandingPage() {
  const navigate = useNavigate()

  const handleFeatureLearnMore = (featureTitle) => {
    switch (featureTitle) {
      case 'Live Forecasts':
        navigate('/dashboard')
        return
      case 'Deep Analytics':
        navigate('/analytics')
        return
      case 'Favorite Cities':
        navigate('/favorites')
        return
      case 'Smart Alerts':
        navigate('/settings')
        return
      default:
        navigate('/dashboard')
    }
  }

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 6, sm: 8, md: 10 } }}>
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 850,
                  letterSpacing: -1.2,
                  fontSize: { xs: 36, sm: 48, md: 60 },
                  lineHeight: 1.05,
                }}
              >
                Know your weather.
                <br />
                Make smarter days.
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  mt: 2,
                  color: 'text.secondary',
                  fontWeight: 500,
                  fontSize: { xs: 16, sm: 18, md: 20 },
                  maxWidth: 720,
                  mx: 'auto',
                }}
              >
                Live forecasts, deep analytics, and saved cities — all free.
              </Typography>
            </Box>

            <Box sx={{ width: '100%', maxWidth: 760 }}>
              <TextField
                fullWidth
                placeholder="Search any city to preview weather..."
                aria-label="Search any city to preview weather"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.default',
                    borderRadius: 999,
                    height: { xs: 52, sm: 56 },
                    px: 0.5,
                  },
                }}
              />

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                justifyContent="center"
                sx={{ mt: 2.25 }}
              >
                <Button
                  size="large"
                  variant="contained"
                  disableElevation
                  sx={{ borderRadius: 999, px: 3, py: 1.3, fontWeight: 800 }}
                  onClick={() => navigate('/register')}
                >
                  Sign Up Free — Save Cities
                </Button>
                <Button
                  size="large"
                  variant="outlined"
                  sx={{ borderRadius: 999, px: 3, py: 1.3, fontWeight: 800 }}
                  onClick={() => navigate('/dashboard')}
                >
                  Continue as Guest (Preview)
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, sm: 8 } }}>
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: -0.6 }}>
            Everything you need to plan your day
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 720 }}>
            Powerful weather tools, beautifully simple.
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          {FEATURES.map((feature) => (
            <Paper
              key={feature.title}
              variant="outlined"
              sx={{
                p: { xs: 2.25, sm: 3 },
                borderRadius: 4,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {feature.title}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                {feature.description}
              </Typography>
              <Box sx={{ mt: 'auto', pt: 1 }}>
                <Link
                  component="button"
                  type="button"
                  underline="hover"
                  onClick={() => handleFeatureLearnMore(feature.title)}
                  sx={{ fontWeight: 700, textAlign: 'left', cursor: 'pointer' }}
                >
                  Learn more →
                </Link>
              </Box>
            </Paper>
          ))}
        </Box>

        <Box sx={{ mt: { xs: 5, sm: 6 } }}>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6, mb: 2 }}>
            Guest vs Logged-in
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>
                {COMPARISON.guest.title}
              </Typography>
              <Stack spacing={1.25}>
                {COMPARISON.guest.items.map((item) => (
                  <Stack key={item.label} direction="row" spacing={1.25} alignItems="center">
                    {item.ok ? (
                      <CheckCircleOutlineIcon sx={{ color: 'success.main' }} />
                    ) : (
                      <HighlightOffIcon sx={{ color: 'error.main' }} />
                    )}
                    <Typography sx={{ fontWeight: 650 }}>{item.label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            <Paper
              variant="outlined"
              sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 4, borderColor: 'divider' }}
            >
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>
                {COMPARISON.loggedIn.title}
              </Typography>
              <Stack spacing={1.25}>
                {COMPARISON.loggedIn.items.map((item) => (
                  <Stack key={item.label} direction="row" spacing={1.25} alignItems="center">
                    <CheckCircleOutlineIcon sx={{ color: 'success.main' }} />
                    <Typography sx={{ fontWeight: 750 }}>{item.label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

