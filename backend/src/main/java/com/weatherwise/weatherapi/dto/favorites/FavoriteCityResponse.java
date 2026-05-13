/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.favorites;

/**
 * Weather fields are populated when favorites are listed; they may be null if the provider
 * lookup fails for that saved city name.
 */
public record FavoriteCityResponse(
  Long id,
  String cityName,
  Double temp,
  String weatherDescription,
  String iconCode,
  /** OpenWeather {@code timezone} shift in seconds from UTC for the resolved city. */
  Integer timezoneOffsetSeconds
) {}

