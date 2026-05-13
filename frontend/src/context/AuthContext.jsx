/* Author: Nandar Lin */

import { useCallback, useMemo, useState } from 'react'
import { AuthContext } from './AuthContextBase.js'
import { normalizeUserProfile } from './normalizeUserProfile.js'
import { getCurrentUser, putUserProfile, putUserSettings } from '../lib/favoritesApi.js'

const GUEST_PREFS_KEY = 'ww_guest_prefs'

function loadGuestPrefs() {
  try {
    const raw = localStorage.getItem(GUEST_PREFS_KEY)
    if (!raw) return { useFahrenheit: false, darkMode: false }
    const o = JSON.parse(raw)
    return {
      useFahrenheit: Boolean(o.useFahrenheit),
      darkMode: Boolean(o.darkMode),
    }
  } catch {
    return { useFahrenheit: false, darkMode: false }
  }
}

function persistGuestPrefs(prefs) {
  try {
    localStorage.setItem(GUEST_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignore quota / private mode
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [guestPrefs, setGuestPrefs] = useState(loadGuestPrefs)

  const authHeader = token ? `Bearer ${token}` : null
  const isLoggedIn = Boolean(token)
  const useFahrenheit = authHeader && user ? Boolean(user.useFahrenheit) : guestPrefs.useFahrenheit
  const darkMode = authHeader && user ? Boolean(user.darkMode) : guestPrefs.darkMode

  const setUseFahrenheit = useCallback(
    async (next) => {
      const value = Boolean(next)
      if (authHeader && user) {
        const prevFahrenheit = user.useFahrenheit
        const currentDarkMode = user.darkMode
        setUser((u) => (u ? { ...u, useFahrenheit: value } : null))
        try {
          const data = await putUserSettings({
            authHeader,
            useFahrenheit: value,
            darkMode: Boolean(currentDarkMode),
            severeWeatherAlerts: Boolean(user.severeWeatherAlerts ?? true),
          })
          setUser(normalizeUserProfile(data))
        } catch {
          setUser((u) => (u ? { ...u, useFahrenheit: prevFahrenheit } : null))
        }
        return
      }
      setGuestPrefs((g) => {
        const merged = { ...g, useFahrenheit: value }
        persistGuestPrefs(merged)
        return merged
      })
    },
    [authHeader, user],
  )

  const setDarkMode = useCallback(
    async (next) => {
      const value = Boolean(next)
      if (authHeader && user) {
        const prevDark = user.darkMode
        const currentFahrenheit = user.useFahrenheit
        setUser((u) => (u ? { ...u, darkMode: value } : null))
        try {
          const data = await putUserSettings({
            authHeader,
            useFahrenheit: Boolean(currentFahrenheit),
            darkMode: value,
            severeWeatherAlerts: Boolean(user.severeWeatherAlerts ?? true),
          })
          setUser(normalizeUserProfile(data))
        } catch {
          setUser((u) => (u ? { ...u, darkMode: prevDark } : null))
        }
        return
      }
      setGuestPrefs((g) => {
        const merged = { ...g, darkMode: value }
        persistGuestPrefs(merged)
        return merged
      })
    },
    [authHeader, user],
  )

  const setSession = useCallback(({ token: nextToken, user: nextUser }) => {
    setToken(nextToken ?? null)
    setUser(normalizeUserProfile(nextUser))
  }, [])

  const refreshUser = useCallback(async (overrideAuthHeader) => {
    const header = overrideAuthHeader ?? authHeader
    if (!header) return null
    const data = await getCurrentUser({ authHeader: header })
    const normalized = normalizeUserProfile(data)
    setUser(normalized)
    return normalized
  }, [authHeader])

  const persistProfile = useCallback(
    async ({ fullName, email, currentPassword, newPassword }) => {
      if (!authHeader) {
        throw new Error('Not authenticated')
      }
      const data = await putUserProfile({ authHeader, fullName, email, currentPassword, newPassword })
      const nextToken = data?.token ?? null
      if (nextToken) {
        setToken(nextToken)
      }
      setUser(normalizeUserProfile(data?.user))
      const nextAuthHeader = nextToken ? `Bearer ${nextToken}` : authHeader
      const profileUpdateMessage =
        typeof data?.profileUpdateMessage === 'string' && data.profileUpdateMessage.trim()
          ? data.profileUpdateMessage.trim()
          : null
      return { authHeader: nextAuthHeader, profileUpdateMessage }
    },
    [authHeader],
  )

  const applyServerProfile = useCallback((payload) => {
    if (!payload) return
    setUser(normalizeUserProfile(payload))
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setGuestPrefs(loadGuestPrefs())
  }, [])

  const value = useMemo(
    () => ({
      isLoggedIn,
      token,
      user,
      authHeader,
      setSession,
      logout,
      refreshUser,
      persistProfile,
      applyServerProfile,
      useFahrenheit,
      darkMode,
      setUseFahrenheit,
      setDarkMode,
    }),
    [
      isLoggedIn,
      token,
      user,
      authHeader,
      setSession,
      logout,
      refreshUser,
      persistProfile,
      applyServerProfile,
      useFahrenheit,
      darkMode,
      setUseFahrenheit,
      setDarkMode,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
