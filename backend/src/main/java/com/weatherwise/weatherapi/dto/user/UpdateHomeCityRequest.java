/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.user;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** JSON: {@code {"homeCity":"Mandalay"}} or legacy {@code {"city":"..."}}. */
public record UpdateHomeCityRequest(
  @JsonAlias("city") @NotBlank @Size(max = 255) String homeCity
) {}
