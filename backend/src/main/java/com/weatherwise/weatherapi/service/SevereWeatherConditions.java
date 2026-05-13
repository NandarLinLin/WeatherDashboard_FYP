/* Author: Nandar Lin */
package com.weatherwise.weatherapi.service;

import java.util.Locale;

/**
 * Shared rules for severe weather: keyword scan on description (case-insensitive) and
 * Celsius thresholds matching the dashboard.
 */
public final class SevereWeatherConditions {
  private static final String[] DESCRIPTION_KEYWORDS = { "storm", "hurricane", "tornado" };
  private static final double EXTREME_HEAT_C = 40.0;
  private static final double EXTREME_COLD_C = -10.0;

  private SevereWeatherConditions() {}

  public static boolean isSevere(String description, double temperatureCelsius) {
    return descriptionMatches(description) || temperatureExtreme(temperatureCelsius);
  }

  private static boolean descriptionMatches(String description) {
    if (description == null || description.isBlank()) {
      return false;
    }
    String lower = description.toLowerCase(Locale.ROOT);
    for (String kw : DESCRIPTION_KEYWORDS) {
      if (lower.contains(kw)) {
        return true;
      }
    }
    return false;
  }

  private static boolean temperatureExtreme(double temperatureCelsius) {
    return temperatureCelsius > EXTREME_HEAT_C || temperatureCelsius < EXTREME_COLD_C;
  }
}
