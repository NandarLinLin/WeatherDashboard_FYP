/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
  @NotBlank(message = "email is required")
  @Email(message = "email must be valid")
  String email,

  @NotBlank(message = "password is required")
  @Size(min = 6, max = 72, message = "password must be between 6 and 72 characters")
  String password,

  @NotBlank(message = "fullName is required")
  @Size(max = 120, message = "fullName must be at most 120 characters")
  String fullName
) {}

