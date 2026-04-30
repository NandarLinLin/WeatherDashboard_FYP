/* Author: Nandar Lin */

import axios from 'axios'

const weatherApi = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000,
})

export async function fetchCityWeather(city) {
  const trimmed = city.trim()
  if (!trimmed) {
    const error = new Error('City not found')
    error.code = 'CITY_NOT_FOUND'
    throw error
  }

  try {
    const { data } = await weatherApi.get(`/weather/${encodeURIComponent(trimmed)}`)
    return data
  } catch (error) {
    const status = error?.response?.status
    if (status === 404) {
      const notFound = new Error('City not found')
      notFound.code = 'CITY_NOT_FOUND'
      throw notFound
    }
    throw error
  }
}

