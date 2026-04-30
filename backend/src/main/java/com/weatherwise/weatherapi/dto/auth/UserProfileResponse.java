/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.auth;

public record UserProfileResponse(
  Long id,
  String email,
  String fullName
) {}

