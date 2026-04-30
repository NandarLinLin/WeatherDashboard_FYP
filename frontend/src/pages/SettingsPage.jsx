/* Author: Nandar Lin */

import { useState } from 'react'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import {
  Avatar,
  Box,
  Button,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

export default function SettingsPage() {
  const [fullName, setFullName] = useState('Jane Doe')
  const [email, setEmail] = useState('jane.doe@email.com')
  const [password, setPassword] = useState('••••••••')
  const [useFahrenheit, setUseFahrenheit] = useState(true)
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [severeWeatherAlertsEnabled, setSevereWeatherAlertsEnabled] = useState(true)
  const [dailyForecastDigestEnabled, setDailyForecastDigestEnabled] = useState(false)

  const cardSx = {
    bgcolor: 'common.white',
    borderRadius: '24px',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
    border: '1px solid rgba(15, 23, 42, 0.06)',
    p: { xs: 2.25, md: 3 },
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
            Profile & Settings
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Manage your profile details and app preferences.
          </Typography>
        </Box>

        <Paper sx={cardSx}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Avatar sx={{ width: 76, height: 76, bgcolor: 'grey.200', color: 'text.secondary' }}>
              <PersonOutlineRoundedIcon />
            </Avatar>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 850 }}>{fullName}</Typography>
              <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>{email}</Typography>
            </Stack>
            <Button
              variant="outlined"
              sx={{ ml: { sm: 'auto' }, borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
            >
              Change Photo
            </Button>
          </Stack>
        </Paper>

        <Paper sx={cardSx}>
          <Stack spacing={2.5}>
            <Typography sx={{ fontWeight: 900, letterSpacing: -0.2 }}>Account</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              <TextField
                label="Full Name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Box>

            <Button
              variant="contained"
              disableElevation
              sx={{
                alignSelf: 'flex-start',
                borderRadius: '10px',
                px: 2.5,
                bgcolor: 'text.primary',
                color: 'background.paper',
                fontWeight: 850,
                textTransform: 'none',
                '&:hover': { bgcolor: 'text.primary' },
              }}
            >
              Save Changes
            </Button>
          </Stack>
        </Paper>

        <Paper sx={cardSx}>
          <Stack spacing={1.25}>
            <Typography sx={{ fontWeight: 900, letterSpacing: -0.2, mb: 0.5 }}>Preferences</Typography>

            <FormControlLabel
              sx={{ m: 0, justifyContent: 'space-between', alignItems: 'center' }}
              control={
                <Switch
                  checked={useFahrenheit}
                  onChange={(event) => setUseFahrenheit(event.target.checked)}
                  color="default"
                />
              }
              labelPlacement="start"
              label={<Typography sx={{ fontWeight: 700 }}>Use Fahrenheit</Typography>}
            />

            <FormControlLabel
              sx={{ m: 0, justifyContent: 'space-between', alignItems: 'center' }}
              control={<Switch checked={isDarkMode} onChange={(event) => setIsDarkMode(event.target.checked)} color="default" />}
              labelPlacement="start"
              label={<Typography sx={{ fontWeight: 700 }}>Dark mode</Typography>}
            />

            <FormControlLabel
              sx={{ m: 0, justifyContent: 'space-between', alignItems: 'center' }}
              control={
                <Switch
                  checked={emailAlertsEnabled}
                  onChange={(event) => setEmailAlertsEnabled(event.target.checked)}
                  color="default"
                />
              }
              labelPlacement="start"
              label={<Typography sx={{ fontWeight: 700 }}>Email notifications</Typography>}
            />

            <FormControlLabel
              sx={{ m: 0, justifyContent: 'space-between', alignItems: 'center' }}
              control={
                <Switch
                  checked={severeWeatherAlertsEnabled}
                  onChange={(event) => setSevereWeatherAlertsEnabled(event.target.checked)}
                  color="default"
                />
              }
              labelPlacement="start"
              label={<Typography sx={{ fontWeight: 700 }}>Severe weather alerts</Typography>}
            />

            <FormControlLabel
              sx={{ m: 0, justifyContent: 'space-between', alignItems: 'center' }}
              control={
                <Switch
                  checked={dailyForecastDigestEnabled}
                  onChange={(event) => setDailyForecastDigestEnabled(event.target.checked)}
                  color="default"
                />
              }
              labelPlacement="start"
              label={<Typography sx={{ fontWeight: 700 }}>Daily forecast digest</Typography>}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
