/* Author: Nandar Lin */
package com.weatherwise.weatherapi.dto.auth;

public record LoginResponse(
  String token,
  UserDTO user,
  String profileUpdateMessage
) {
  public LoginResponse(String token, UserDTO user) {
    this(token, user, null);
  }
}

