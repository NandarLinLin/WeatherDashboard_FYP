/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.favorites;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFavoriteCityRequest(
  @NotBlank(message = "cityName is required")
  @Size(max = 140, message = "cityName must be at most 140 characters")
  String cityName
) {}

