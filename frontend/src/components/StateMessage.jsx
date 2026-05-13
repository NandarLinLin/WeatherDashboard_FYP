/* Author: Nandar Lin */

import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { useAuth } from '../context/useAuth.js'

export default function StateMessage({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  maxWidth = 720,
}) {
  const { darkMode } = useAuth()

  return (
    <Paper
      sx={{
        borderRadius: '24px',
        boxShadow: darkMode ? '0px 4px 24px rgba(0, 0, 0, 0.55)' : '0px 4px 20px rgba(0, 0, 0, 0.05)',
        border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(15, 23, 42, 0.06)',
        bgcolor: darkMode ? '#1e1e1e' : 'common.white',
        color: darkMode ? '#ffffff' : 'text.primary',
        p: { xs: 3, md: 4 },
        width: '100%',
        maxWidth,
        mx: 'auto',
      }}
    >
      <Stack spacing={1.75} alignItems="center" textAlign="center">
        {Icon ? (
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              bgcolor: darkMode ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
              color: darkMode ? '#fbbf24' : 'text.secondary',
              border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            }}
          >
            <Icon sx={{ fontSize: 32 }} />
          </Box>
        ) : null}

        <Box>
          <Typography sx={{ fontWeight: 950, letterSpacing: -0.3, fontSize: { xs: '1.35rem', md: '1.5rem' } }}>
            {title}
          </Typography>
          {description ? (
            <Typography
              sx={{
                mt: 0.75,
                color: darkMode ? 'rgba(255, 255, 255, 0.72)' : 'text.secondary',
                fontWeight: 600,
                maxWidth: 560,
                mx: 'auto',
              }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>

        {actionLabel && onAction ? (
          <Button
            variant="contained"
            disableElevation
            onClick={onAction}
            sx={{
              borderRadius: '24px',
              px: 4,
              minHeight: 50,
              bgcolor: darkMode ? 'rgba(255, 255, 255, 0.14)' : 'text.primary',
              color: darkMode ? '#ffffff' : 'background.paper',
              fontWeight: 900,
              textTransform: 'none',
              border: darkMode ? '1px solid rgba(255, 255, 255, 0.18)' : 'none',
              '&:hover': {
                bgcolor: darkMode ? 'rgba(255, 255, 255, 0.22)' : 'text.primary',
              },
            }}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  )
}

