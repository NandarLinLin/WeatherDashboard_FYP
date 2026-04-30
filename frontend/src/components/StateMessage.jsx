/* Author: Nandar Lin */

import { Box, Button, Paper, Stack, Typography } from '@mui/material'

export default function StateMessage({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  maxWidth = 720,
}) {
  return (
    <Paper
      sx={{
        borderRadius: '24px',
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(15, 23, 42, 0.06)',
        bgcolor: 'common.white',
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
              bgcolor: '#f1f5f9',
              color: 'text.secondary',
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
            <Typography sx={{ mt: 0.75, color: 'text.secondary', fontWeight: 600, maxWidth: 560, mx: 'auto' }}>
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
              bgcolor: 'text.primary',
              color: 'background.paper',
              fontWeight: 900,
              textTransform: 'none',
              '&:hover': { bgcolor: 'text.primary' },
            }}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  )
}

