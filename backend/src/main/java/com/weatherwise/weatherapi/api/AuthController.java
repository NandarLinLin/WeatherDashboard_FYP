/* Author: Nandar Lin */
package com.weatherwise.weatherapi.api;

import com.weatherwise.weatherapi.dto.auth.LoginRequest;
import com.weatherwise.weatherapi.dto.auth.LoginResponse;
import com.weatherwise.weatherapi.dto.auth.RegisterRequest;
import com.weatherwise.weatherapi.dto.auth.UserDTO;
import com.weatherwise.weatherapi.model.User;
import com.weatherwise.weatherapi.repository.UserRepository;
import com.weatherwise.weatherapi.security.JwtService;
import com.weatherwise.weatherapi.service.UserService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private static final Logger log = LoggerFactory.getLogger(AuthController.class);

  private final UserService userService;
  private final UserRepository userRepository;
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;

  public AuthController(
    UserService userService,
    UserRepository userRepository,
    AuthenticationManager authenticationManager,
    JwtService jwtService
  ) {
    this.userService = userService;
    this.userRepository = userRepository;
    this.authenticationManager = authenticationManager;
    this.jwtService = jwtService;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public UserDTO register(@Valid @RequestBody RegisterRequest request) {
    User user = userService.registerUser(request.email(), request.password(), request.fullName());
    return UserService.toUserDto(user);
  }

  @PostMapping("/login")
  public LoginResponse login(@Valid @RequestBody LoginRequest request) {
    String normalizedEmail = request.email() == null ? "" : request.email().trim().toLowerCase();
    Authentication authentication = authenticationManager.authenticate(
      new UsernamePasswordAuthenticationToken(normalizedEmail, request.password())
    );

    String email = authentication.getName();
    User user = userRepository.findByEmailIgnoreCase(email)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    String token = jwtService.generateToken(email);
    return new LoginResponse(token, UserService.toUserDto(user));
  }

  @GetMapping("/me")
  public UserDTO me(Principal principal) {
    if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
      throw new IllegalArgumentException("Unauthenticated request");
    }

    User user = userRepository.findByEmailIgnoreCase(principal.getName().trim())
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    return UserService.toUserDto(user);
  }

  @ExceptionHandler(AuthenticationException.class)
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  public void handleAuthFailure(AuthenticationException ex) {
    // Print the real reason to the backend terminal (dev-only visibility).
    log.warn("Login failed: {} - {}", ex.getClass().getSimpleName(), ex.getMessage());
  }
}

