/* Author: Nandar Lin */

import { Box, Container, Link, Stack, Typography } from '@mui/material'

export default function Footer({ isLoggedIn = false }) {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.5, sm: 2 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Typography sx={{ fontWeight: 800 }}>WeatherWise</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Link href="/privacy" underline="hover" sx={{ fontWeight: 600 }}>
              Privacy
            </Link>
            <Link href="/terms" underline="hover" sx={{ fontWeight: 600 }}>
              Terms
            </Link>
            <Link href="/contact" underline="hover" sx={{ fontWeight: 600 }}>
              Contact
            </Link>
          </Stack>
        </Stack>

        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
          © 2026 WeatherWise — Smart weather analytics for everyone.
          {isLoggedIn ? ' Signed in.' : ''}
        </Typography>
      </Container>
    </Box>
  )
}

