/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto;

import java.util.List;

public record WeatherResponse(
  String city,
  double temperatureCelsius,
  String description,
  /** OpenWeather {@code weather[0].main}, e.g. Clear, Clouds, Rain. */
  String conditionMain,
  String icon,
  Integer humidityPercent,
  /** Shift in seconds from UTC for the requested city (OpenWeather `timezone`). */
  Integer timezoneOffsetSeconds,
  Long sunriseEpochSeconds,
  Long sunsetEpochSeconds,
  Integer rainChancePercent,
  Double uvIndex,
  Double windSpeedMetersPerSecond,
  Integer visibilityMeters,
  List<WeatherForecastDay> forecast,
  List<WeatherForecastHour> hourlyForecast
) {}

