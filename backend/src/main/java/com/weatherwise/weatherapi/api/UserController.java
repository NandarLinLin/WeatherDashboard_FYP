/* Author: Nandar Lin */
package com.weatherwise.weatherapi.api;

import com.weatherwise.weatherapi.dto.auth.LoginResponse;
import com.weatherwise.weatherapi.dto.auth.UserDTO;
import com.weatherwise.weatherapi.dto.user.UpdateHomeCityRequest;
import com.weatherwise.weatherapi.dto.user.UpdateUserProfileRequest;
import com.weatherwise.weatherapi.dto.user.UpdateUserSettingsRequest;
import com.weatherwise.weatherapi.security.JwtService;
import com.weatherwise.weatherapi.service.UserService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.security.Principal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/user")
public class UserController {
  private final UserService userService;
  private final JwtService jwtService;

  public UserController(UserService userService, JwtService jwtService) {
    this.userService = userService;
    this.jwtService = jwtService;
  }

  @PutMapping("/update-home-city")
  public UserDTO updateHomeCity(Principal principal, @Valid @RequestBody UpdateHomeCityRequest request) {
    if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
      throw new IllegalArgumentException("Unauthenticated request");
    }
    return userService.updateHomeCity(principal.getName().trim(), request);
  }

  @PutMapping("/settings")
  public UserDTO updateSettings(Principal principal, @Valid @RequestBody UpdateUserSettingsRequest request) {
    if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
      throw new IllegalArgumentException("Unauthenticated request");
    }
    return userService.updateUserSettings(principal.getName().trim(), request);
  }

  @PutMapping("/update")
  public LoginResponse updateUser(Principal principal, @Valid @RequestBody UpdateUserProfileRequest request) {
    if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
      throw new IllegalArgumentException("Unauthenticated request");
    }
    String principalEmail = principal.getName().trim();
    var result = userService.updateUserProfile(principalEmail, request);
    String token = jwtService.generateToken(result.user().getEmail());
    return new LoginResponse(token, UserService.toUserDto(result.user()), result.profileUpdateMessage());
  }

  @PostMapping("/profile-picture")
  public UserDTO uploadProfilePicture(Principal principal, @RequestParam("file") MultipartFile file)
    throws IOException {
    if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
      throw new IllegalArgumentException("Unauthenticated request");
    }
    return userService.uploadProfilePhoto(principal.getName().trim(), file);
  }
}
