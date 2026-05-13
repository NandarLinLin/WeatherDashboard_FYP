/* Author: Nandar Lin */

import { useEffect, useRef, useState } from 'react'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Avatar,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useAuth } from '../context/useAuth.js'
import { getApiErrorMessage, isNetworkError, postUserProfilePicture, putUserSettings } from '../lib/favoritesApi.js'

/**
 * Accessible toggle: green track when on, grey when off; thumb slides with ~300ms transition.
 * @param {{ checked: boolean, onCheckedChange: (next: boolean) => void, disabled?: boolean, 'aria-labelledby'?: string, id?: string }} props
 */
function PreferenceToggle({ checked, onCheckedChange, disabled, 'aria-labelledby': ariaLabelledBy, id }) {
  return (
    <Box
      component="button"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
      id={id}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        onCheckedChange(!checked)
      }}
      sx={{
        width: 48,
        height: 28,
        borderRadius: 9999,
        border: 'none',
        p: 0,
        flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        bgcolor: checked ? '#22c55e' : '#d1d5db',
        transition: 'background-color 300ms ease',
        position: 'relative',
        opacity: disabled ? 0.55 : 1,
        '&:focus-visible': {
          outline: '2px solid',
          outlineOffset: 2,
          outlineColor: 'primary.main',
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '50%',
          left: 4,
          width: 20,
          height: 20,
          mt: '-10px',
          borderRadius: '50%',
          bgcolor: '#fff',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.12)',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </Box>
  )
}

export default function SettingsPage() {
  const fileInputRef = useRef(null)
  const avatarBlobRef = useRef(null)
  const {
    user,
    isLoggedIn,
    authHeader,
    refreshUser,
    persistProfile,
    applyServerProfile,
    setUseFahrenheit,
    setDarkMode,
  } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [avatarBlobUrl, setAvatarBlobUrl] = useState(null)
  const [preferences, setPreferences] = useState({ useFahrenheit: false, darkMode: false })
  const [severeWeatherAlertsEnabled, setSevereWeatherAlertsEnabled] = useState(true)
  const [accountError, setAccountError] = useState(null)
  const [accountWarning, setAccountWarning] = useState(null)
  const [accountSuccessMessage, setAccountSuccessMessage] = useState(null)
  const [accountNeutralMessage, setAccountNeutralMessage] = useState(null)
  const [photoSaved, setPhotoSaved] = useState(false)
  const [isSavingAccount, setIsSavingAccount] = useState(false)

  useEffect(() => {
    if (!isLoggedIn || !authHeader) return
    void refreshUser().catch(() => {})
  }, [isLoggedIn, authHeader, refreshUser])

  useEffect(() => {
    if (!user) return
    const name = user.name ?? user.fullName ?? ''
    const mail = user.email ?? ''
    const id = window.setTimeout(() => {
      setFullName(name)
      setEmail(mail)
      setPreferences({
        useFahrenheit: Boolean(user.useFahrenheit),
        darkMode: Boolean(user.darkMode),
      })
      setSevereWeatherAlertsEnabled(Boolean(user.severeWeatherAlerts ?? true))
    }, 0)
    return () => window.clearTimeout(id)
  }, [
    user?.id,
    user?.name,
    user?.fullName,
    user?.email,
    user?.useFahrenheit,
    user?.darkMode,
    user?.severeWeatherAlerts,
  ])

  useEffect(() => {
    return () => {
      if (avatarBlobRef.current) {
        URL.revokeObjectURL(avatarBlobRef.current)
        avatarBlobRef.current = null
      }
    }
  }, [])

  const handleSevereWeatherAlertsChange = async (next) => {
    setSevereWeatherAlertsEnabled(next)
    if (!authHeader || !user) return
    try {
      const data = await putUserSettings({
        authHeader,
        useFahrenheit: Boolean(user.useFahrenheit),
        darkMode: Boolean(user.darkMode),
        severeWeatherAlerts: next,
      })
      applyServerProfile(data)
    } catch {
      setSevereWeatherAlertsEnabled(!next)
    }
  }

  const cardSx = {
    bgcolor: 'background.paper',
    borderRadius: '24px',
    boxShadow: (theme) =>
      theme.palette.mode === 'dark' ? '0px 4px 20px rgba(0, 0, 0, 0.35)' : '0px 4px 20px rgba(0, 0, 0, 0.05)',
    border: (theme) =>
      theme.palette.mode === 'dark' ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid rgba(15, 23, 42, 0.06)',
    p: { xs: 2.25, md: 3 },
  }

  /** Full-width row: label left, toggle aligned to the far right (flexbox). */
  const preferenceRowSx = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 2,
    py: 1,
    width: '100%',
  }

  const preferenceLabelSx = {
    fontWeight: 700,
    flex: '1 1 auto',
    minWidth: 0,
    pr: 1,
    textAlign: 'left',
  }

  const avatarSrc = avatarBlobUrl ?? user?.profilePicturePath ?? undefined

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!isLoggedIn || !authHeader) {
      setAccountError('Sign in to upload a profile photo.')
      return
    }

    const blobUrl = URL.createObjectURL(file)
    if (avatarBlobRef.current) {
      URL.revokeObjectURL(avatarBlobRef.current)
    }
    avatarBlobRef.current = blobUrl
    setAvatarBlobUrl(blobUrl)
    setAccountError(null)
    setPhotoSaved(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const profile = await postUserProfilePicture({ authHeader, formData })
      if (avatarBlobRef.current) {
        URL.revokeObjectURL(avatarBlobRef.current)
        avatarBlobRef.current = null
      }
      setAvatarBlobUrl(null)
      applyServerProfile(profile)
      setPhotoSaved(true)
    } catch (err) {
      setAccountError(getApiErrorMessage(err, 'Could not upload profile photo. Please try again.'))
    }
  }

  const handleSaveChanges = async () => {
    setAccountError(null)
    setAccountWarning(null)
    setAccountSuccessMessage(null)
    setAccountNeutralMessage(null)
    if (!isLoggedIn || !authHeader) {
      setAccountError('Sign in to save your profile.')
      return
    }

    const originalName = (user?.fullName ?? user?.name ?? '').trim()
    const originalEmail = (user?.email ?? '').trim()
    const nameUnchanged = fullName.trim() === originalName
    const emailUnchanged = email.trim() === originalEmail
    const passwordsUnchanged = currentPassword === '' && newPassword === ''
    const noChangesDetected = Boolean(user) && nameUnchanged && emailUnchanged && passwordsUnchanged
    if (noChangesDetected) {
      setAccountNeutralMessage('No changes detected.')
      return
    }

    if (newPassword.trim() !== '' && currentPassword === '') {
      setAccountError('Current password required to set a new one.')
      return
    }

    const isChangingPassword = currentPassword !== '' || newPassword !== ''
    const trimmedNew = newPassword.trim()
    const trimmedCurrent = currentPassword.trim()
    const requestedPasswordChange = trimmedCurrent.length > 0 && trimmedNew.length > 0

    setIsSavingAccount(true)
    try {
      const { authHeader: nextAuthHeader, profileUpdateMessage } = await persistProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        currentPassword,
        newPassword,
      })
      await putUserSettings({
        authHeader: nextAuthHeader,
        useFahrenheit: preferences.useFahrenheit,
        darkMode: preferences.darkMode,
        severeWeatherAlerts: severeWeatherAlertsEnabled,
      })
      await refreshUser(nextAuthHeader)

      if (profileUpdateMessage) {
        setAccountWarning(profileUpdateMessage)
      } else if (!isChangingPassword) {
        setAccountSuccessMessage('Profile information saved!')
      } else {
        setAccountSuccessMessage('Profile and password updated successfully!')
        if (requestedPasswordChange) {
          setCurrentPassword('')
          setNewPassword('')
        }
      }
    } catch (err) {
      setAccountSuccessMessage(null)
      setAccountWarning(null)
      setAccountNeutralMessage(null)
      if (isNetworkError(err)) {
        setAccountError('Connection error. Please try again.')
      } else {
        setAccountError(getApiErrorMessage(err, 'Could not save profile. Please try again.'))
      }
    } finally {
      setIsSavingAccount(false)
    }
  }

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        bgcolor: 'background.default',
        py: { xs: 2.5, md: 4 },
        px: { xs: 2, md: 4 },
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void handlePhotoChange(e)}
      />

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
          <Stack spacing={1.25}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Avatar
                src={avatarSrc}
                sx={{ width: 76, height: 76, bgcolor: 'grey.200', color: 'text.secondary' }}
              >
                {!avatarSrc ? <PersonOutlineRoundedIcon sx={{ fontSize: 40 }} /> : null}
              </Avatar>
              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 850 }}>{fullName || 'Your name'}</Typography>
                <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>{email || 'your@email.com'}</Typography>
              </Stack>
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                sx={{ ml: { sm: 'auto' }, borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
              >
                Change Photo
              </Button>
            </Stack>
            {photoSaved ? (
              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>
                Photo saved successfully!
              </Typography>
            ) : null}
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
              <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2' } }}>
                <TextField
                  label="Home City"
                  value={typeof user?.homeCity === 'string' ? user.homeCity : ''}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  slotProps={{ htmlInput: { readOnly: true } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
                <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary', fontWeight: 600 }}>
                  Change your home city directly from the Dashboard.
                </Typography>
              </Box>
              <TextField
                label="Current Password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Required with new password to update"
                autoComplete="current-password"
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        edge="end"
                      >
                        {showCurrentPassword ? (
                          <VisibilityOffOutlinedIcon sx={{ color: 'text.secondary' }} />
                        ) : (
                          <VisibilityOutlinedIcon sx={{ color: 'text.secondary' }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ gridColumn: { xs: 'span 1', md: 'span 2' }, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                        onClick={() => setShowNewPassword((v) => !v)}
                        edge="end"
                      >
                        {showNewPassword ? (
                          <VisibilityOffOutlinedIcon sx={{ color: 'text.secondary' }} />
                        ) : (
                          <VisibilityOutlinedIcon sx={{ color: 'text.secondary' }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ gridColumn: { xs: 'span 1', md: 'span 2' }, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Box>

            {accountError ? (
              <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
                {accountError}
              </Typography>
            ) : null}
            {accountWarning ? (
              <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 700 }}>
                {accountWarning}
              </Typography>
            ) : null}
            {accountNeutralMessage ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                {accountNeutralMessage}
              </Typography>
            ) : null}
            {accountSuccessMessage ? (
              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>
                {accountSuccessMessage}
              </Typography>
            ) : null}

            <Button
              variant="contained"
              disableElevation
              disabled={!isLoggedIn || isSavingAccount}
              onClick={() => void handleSaveChanges()}
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
              {isSavingAccount ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        </Paper>

        <Paper sx={cardSx}>
          <Stack spacing={2.5}>
            <Typography sx={{ fontWeight: 900, letterSpacing: -0.2 }}>Preferences</Typography>

            <Box sx={preferenceRowSx}>
              <Typography id="pref-fahrenheit-label" sx={preferenceLabelSx}>
                Use Fahrenheit
              </Typography>
              <PreferenceToggle
                aria-labelledby="pref-fahrenheit-label"
                checked={preferences.useFahrenheit}
                onCheckedChange={(next) => {
                  setPreferences((p) => ({ ...p, useFahrenheit: next }))
                  void setUseFahrenheit(next).catch(() => {})
                }}
              />
            </Box>

            <Box sx={preferenceRowSx}>
              <Typography id="pref-dark-label" sx={preferenceLabelSx}>
                Dark mode
              </Typography>
              <PreferenceToggle
                aria-labelledby="pref-dark-label"
                checked={preferences.darkMode}
                onCheckedChange={(next) => {
                  setPreferences((p) => ({ ...p, darkMode: next }))
                  void setDarkMode(next).catch(() => {})
                }}
              />
            </Box>

            <Box sx={{ ...preferenceRowSx, alignItems: 'flex-start' }}>
              <Box sx={{ flex: '1 1 auto', minWidth: 0, pr: 1, textAlign: 'left' }}>
                <Typography id="pref-severe-label" sx={{ ...preferenceLabelSx, pr: 0 }}>
                  Severe weather alerts
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontWeight: 600 }}
                >
                  Shows a banner on your Dashboard when conditions are severe.
                </Typography>
              </Box>
              <Box sx={{ pt: 0.25 }}>
                <PreferenceToggle
                  aria-labelledby="pref-severe-label"
                  checked={severeWeatherAlertsEnabled}
                  onCheckedChange={(next) => void handleSevereWeatherAlertsChange(next)}
                />
              </Box>
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
