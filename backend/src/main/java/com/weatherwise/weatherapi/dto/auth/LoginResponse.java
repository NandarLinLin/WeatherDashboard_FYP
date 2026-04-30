/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.auth;

public record LoginResponse(
  String token,
  UserProfileResponse user
) {}

