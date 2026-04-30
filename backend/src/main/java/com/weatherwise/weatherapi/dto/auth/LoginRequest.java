/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
  @NotBlank(message = "email is required")
  @Email(message = "email must be valid")
  String email,

  @NotBlank(message = "password is required")
  @Size(min = 6, max = 72, message = "password must be between 6 and 72 characters")
  String password
) {}

