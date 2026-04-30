/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto;

public record WeatherForecastHour(
  Long epochSeconds,
  String timeLabel,
  Double temperatureCelsius,
  String icon,
  String description
) {}

