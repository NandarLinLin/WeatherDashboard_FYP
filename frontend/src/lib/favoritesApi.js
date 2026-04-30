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

export function getApiErrorMessage(error, fallbackMessage) {
  const fallback = fallbackMessage || 'Request failed. Please try again.'
  const data = error?.response?.data

  if (!data) return fallback

  if (typeof data === 'string' && data.trim()) return data

  const details = typeof data?.details === 'string' ? data.details.trim() : ''
  const message = typeof data?.message === 'string' ? data.message.trim() : ''

  if (details) return details
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

