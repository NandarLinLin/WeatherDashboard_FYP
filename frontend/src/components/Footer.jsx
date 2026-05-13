/* Author: Nandar Lin */

import { Box, Container, Typography } from '@mui/material'

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        py: { xs: 3.5, sm: 4 },
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          width: '100%',
          gap: 1.5,
        }}
      >
        <Typography sx={{ fontWeight: 800, textAlign: 'center', width: '100%' }}>
          WeatherWise
        </Typography>
        <Typography
          variant="body2"
          sx={(theme) => ({
            color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.55)' : '#666666',
            textAlign: 'center',
            maxWidth: 720,
            lineHeight: 1.6,
            width: '100%',
          })}
        >
          © 2026 WeatherWise — Smart weather analytics for everyone.
        </Typography>
      </Container>
    </Box>
  )
}
