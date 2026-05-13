/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.user;

import jakarta.validation.constraints.NotNull;

public record UpdateUserSettingsRequest(
  @NotNull Boolean useFahrenheit,
  @NotNull Boolean darkMode,
  @NotNull Boolean severeWeatherAlerts,
  @NotNull Boolean emailNotifications
) {}
