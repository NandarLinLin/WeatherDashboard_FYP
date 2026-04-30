/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto;

public record WeatherForecastDay(
  String dateIso,
  String dayLabel,
  double temperatureMaxCelsius,
  double temperatureMinCelsius,
  String icon,
  String description,
  Integer precipitationProbabilityPercent
) {}

