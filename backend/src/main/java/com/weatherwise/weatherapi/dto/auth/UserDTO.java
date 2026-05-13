/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.auth;

public record UserDTO(
  Long id,
  String email,
  String fullName,
  boolean useFahrenheit,
  boolean darkMode,
  boolean severeWeatherAlerts,
  boolean emailNotifications,
  String profilePicturePath,
  String homeCity
) {}
