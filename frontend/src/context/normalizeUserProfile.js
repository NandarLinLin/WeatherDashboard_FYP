/* Author: Nandar Lin */

export function normalizeUserProfile(payload) {
  if (!payload) return null
  const fullName = payload.fullName ?? payload.name ?? ''
  const homeCity =
    typeof payload.homeCity === 'string' && payload.homeCity.trim() ? payload.homeCity.trim() : null

  return {
    id: payload.id,
    email: payload.email ?? '',
    fullName,
    name: fullName,
    useFahrenheit: Boolean(payload.useFahrenheit),
    darkMode: Boolean(payload.darkMode),
    severeWeatherAlerts: Boolean(payload.severeWeatherAlerts ?? true),
    homeCity,
    profilePicturePath:
      typeof payload.profilePicturePath === 'string' && payload.profilePicturePath
        ? payload.profilePicturePath
        : typeof payload.profilePictureUrl === 'string' && payload.profilePictureUrl
          ? payload.profilePictureUrl
          : null,
  }
}
