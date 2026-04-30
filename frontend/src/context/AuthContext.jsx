/* Author: Nandar Lin */

import { useMemo, useState } from 'react'
import { AuthContext } from './AuthContextBase.js'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  const value = useMemo(
    () => ({
      isLoggedIn: Boolean(token),
      token,
      user,
      authHeader: token ? `Bearer ${token}` : null,
      setSession: ({ token: nextToken, user: nextUser }) => {
        setToken(nextToken)
        setUser(nextUser ?? null)
      },
      logout: () => {
        setToken(null)
        setUser(null)
      },
    }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

