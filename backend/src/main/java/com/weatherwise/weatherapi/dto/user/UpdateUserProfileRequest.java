/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateUserProfileRequest(
  @NotBlank String fullName,
  @NotBlank @Email String email,
  String currentPassword,
  String newPassword
) {}
