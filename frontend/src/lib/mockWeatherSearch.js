/* Author: Nandar Lin */

const MOCK_CITY_DATA = {
  london: {
    cityName: 'London',
    todayDate: 'Monday, April 29',
    temperature: '25°C',
    rainChance: '30%',
    uvIndex: '5 (Moderate)',
    humidity: '62%',
    sunrise: '06:12',
    sunset: '19:58',
  },
}

export async function searchCityWeather(cityQuery) {
  const normalized = cityQuery.trim().toLowerCase()

  await new Promise((resolve) => setTimeout(resolve, 450))

  if (!normalized) {
    const error = new Error('City not found')
    error.code = 'CITY_NOT_FOUND'
    throw error
  }

  const result = MOCK_CITY_DATA[normalized]

  if (!result) {
    const error = new Error('City not found')
    error.code = 'CITY_NOT_FOUND'
    throw error
  }

  return result
}

