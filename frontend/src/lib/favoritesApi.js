/* Author: Nandar Lin */

import axios from 'axios'

const favoritesApi = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000,
})

function requireAuthHeaders(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    const error = new Error('Missing authorization token.')
    error.name = 'AuthError'
    throw error
  }

  return { Authorization: authHeader }
}

export function isNetworkError(error) {
  if (!error || error.response) return false
  return Boolean(error.request || error.code === 'ERR_NETWORK')
}

export function getApiErrorMessage(error, fallbackMessage) {
  const fallback = fallbackMessage || 'Request failed. Please try again.'
  const data = error?.response?.data

  if (!data) return fallback

  if (typeof data === 'string' && data.trim()) return data

  const details = typeof data?.details === 'string' ? data.details.trim() : ''
  const detail = typeof data?.detail === 'string' ? data.detail.trim() : ''
  const message = typeof data?.message === 'string' ? data.message.trim() : ''

  if (details) return details
  if (detail) return detail
  if (message) return message

  const firstErrorMessage =
    data?.errors?.[0]?.message ||
    data?.errors?.[0]?.defaultMessage ||
    data?.fieldErrors?.[0]?.defaultMessage

  if (typeof firstErrorMessage === 'string' && firstErrorMessage.trim()) return firstErrorMessage.trim()

  return fallback
}

export async function saveFavoriteCity({ cityName, authHeader }) {
  const { data } = await favoritesApi.post(
    '/favorites',
    { cityName },
    {
      headers: requireAuthHeaders(authHeader),
    },
  )
  return data
}

export async function fetchFavoriteCities({ authHeader }) {
  const { data } = await favoritesApi.get('/favorites/all', {
    headers: requireAuthHeaders(authHeader),
  })
  return data
}

export async function removeFavoriteCity({ favoriteId, authHeader }) {
  await favoritesApi.delete(`/favorites/${favoriteId}`, {
    headers: requireAuthHeaders(authHeader),
  })
}

export async function registerUser({ fullName, email, password }) {
  const { data } = await favoritesApi.post('/auth/register', {
    fullName,
    email,
    password,
  })
  return data
}

export async function loginUser({ email, password }) {
  const { data } = await favoritesApi.post('/auth/login', {
    email,
    password,
  })
  return data
}

export async function getCurrentUser({ authHeader }) {
  const { data } = await favoritesApi.get('/auth/me', {
    headers: requireAuthHeaders(authHeader),
  })
  return data
}

export async function putUserSettings({
  authHeader,
  useFahrenheit,
  darkMode,
  severeWeatherAlerts,
  emailNotifications = false,
}) {
  const { data } = await favoritesApi.put(
    '/user/settings',
    { useFahrenheit, darkMode, severeWeatherAlerts, emailNotifications },
    { headers: requireAuthHeaders(authHeader) },
  )
  return data
}

export async function putUserHomeCity({ authHeader, city }) {
  const trimmed = typeof city === 'string' ? city.trim() : ''
  const { data } = await favoritesApi.put(
    '/user/update-home-city',
    { homeCity: trimmed },
    { headers: requireAuthHeaders(authHeader) },
  )
  return data
}

export async function putUserProfile({ authHeader, fullName, email, currentPassword, newPassword }) {
  const body = { fullName, email }
  const trimmedCurrent = typeof currentPassword === 'string' ? currentPassword.trim() : ''
  const trimmedNew = typeof newPassword === 'string' ? newPassword.trim() : ''
  if (trimmedCurrent && trimmedNew) {
    body.currentPassword = trimmedCurrent
    body.newPassword = trimmedNew
  }
  const { data } = await favoritesApi.put('/user/update', body, {
    headers: requireAuthHeaders(authHeader),
  })
  return data
}

export async function postUserProfilePicture({ authHeader, formData }) {
  const { data } = await favoritesApi.post('/user/profile-picture', formData, {
    headers: requireAuthHeaders(authHeader),
  })
  return data
}

