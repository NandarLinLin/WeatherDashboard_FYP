/* Author: Nandar Lin */
package com.weatherwise.weatherapi.service;

import com.weatherwise.weatherapi.model.User;
import com.weatherwise.weatherapi.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  private static final String BCRYPT_PREFIX_2A = "$2a$";
  private static final String BCRYPT_PREFIX_2B = "$2b$";
  private static final String BCRYPT_PREFIX_2Y = "$2y$";

  public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional
  public User registerUser(String email, String rawPassword, String fullName) {
    String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
    userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
      throw new IllegalArgumentException("Email is already registered");
    });

    User user = new User();
    user.setEmail(normalizedEmail);
    user.setPassword(passwordEncoder.encode(rawPassword));
    user.setFullName(fullName);

    return userRepository.save(user);
  }

  @Transactional
  public User saveUser(User user) {
    if (user.getPassword() != null) {
      String candidate = user.getPassword();
      if (!looksLikeBcryptHash(candidate)) {
        user.setPassword(passwordEncoder.encode(candidate));
      }
    }
    return userRepository.save(user);
  }

  private static boolean looksLikeBcryptHash(String value) {
    if (value == null) return false;
    return value.startsWith(BCRYPT_PREFIX_2A) || value.startsWith(BCRYPT_PREFIX_2B) || value.startsWith(BCRYPT_PREFIX_2Y);
  }
}

