/* Author: Nandar Lin */

import { useEffect, useMemo } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { useAuth } from '../context/useAuth.js'

export default function AppTheme({ children }) {
  const { darkMode } = useAuth()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', Boolean(darkMode))
  }, [darkMode])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
        },
        shape: {
          borderRadius: 12,
        },
        typography: {
          fontFamily: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
        },
      }),
    [darkMode],
  )

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}
