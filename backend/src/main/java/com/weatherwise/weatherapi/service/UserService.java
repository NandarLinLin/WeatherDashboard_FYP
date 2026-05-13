/* Author: Nandar Lin */
package com.weatherwise.weatherapi.service;

import com.weatherwise.weatherapi.dto.auth.UserDTO;
import com.weatherwise.weatherapi.dto.user.UpdateHomeCityRequest;
import com.weatherwise.weatherapi.dto.user.UpdateUserProfileRequest;
import com.weatherwise.weatherapi.dto.user.UpdateUserSettingsRequest;
import com.weatherwise.weatherapi.model.User;
import com.weatherwise.weatherapi.repository.UserRepository;
import java.io.IOException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final UserProfilePhotoStorage photoStorage;

  private static final String BCRYPT_PREFIX_2A = "$2a$";
  private static final String BCRYPT_PREFIX_2B = "$2b$";
  private static final String BCRYPT_PREFIX_2Y = "$2y$";

  public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, UserProfilePhotoStorage photoStorage) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.photoStorage = photoStorage;
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

  public static UserDTO toUserDto(User user) {
    return new UserDTO(
      user.getId(),
      user.getEmail(),
      user.getFullName(),
      user.isUseFahrenheit(),
      user.isDarkMode(),
      user.isSevereWeatherAlerts(),
      user.isEmailNotifications(),
      normalizePath(user.getProfilePicturePath()),
      normalizeHomeCity(user.getHomeCity())
    );
  }

  private static String normalizeHomeCity(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static String normalizePath(String path) {
    if (path == null || path.isBlank()) {
      return null;
    }
    return path.trim();
  }

  @Transactional
  public UserDTO updateHomeCity(String principalEmail, UpdateHomeCityRequest request) {
    User user = userRepository
      .findByEmailIgnoreCase(principalEmail)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));
    String raw = request.homeCity() == null ? "" : request.homeCity().trim();
    user.setHomeCity(raw.isEmpty() ? null : raw);
    return toUserDto(userRepository.save(user));
  }

  @Transactional
  public UserDTO updateUserSettings(String principalEmail, UpdateUserSettingsRequest request) {
    User user = userRepository
      .findByEmailIgnoreCase(principalEmail)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));
    user.setUseFahrenheit(Boolean.TRUE.equals(request.useFahrenheit()));
    user.setDarkMode(Boolean.TRUE.equals(request.darkMode()));
    user.setSevereWeatherAlerts(Boolean.TRUE.equals(request.severeWeatherAlerts()));
    user.setEmailNotifications(Boolean.TRUE.equals(request.emailNotifications()));
    return toUserDto(userRepository.save(user));
  }

  @Transactional
  public ProfileUpdateResult updateUserProfile(String principalEmail, UpdateUserProfileRequest request) {
    User user = userRepository
      .findByEmailIgnoreCase(principalEmail)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    String nextEmail = request.email() == null ? "" : request.email().trim().toLowerCase();
    if (nextEmail.isBlank()) {
      throw new IllegalArgumentException("Email is required");
    }

    if (!nextEmail.equalsIgnoreCase(user.getEmail())) {
      if (userRepository.existsByEmailIgnoreCaseAndIdNot(nextEmail, user.getId())) {
        throw new IllegalArgumentException("Email is already registered");
      }
      user.setEmail(nextEmail);
    }

    String name = request.fullName() == null ? "" : request.fullName().trim();
    if (name.isBlank()) {
      throw new IllegalArgumentException("Full name is required");
    }
    user.setFullName(name);

    String newPassword = request.newPassword() == null ? "" : request.newPassword().trim();
    if (!newPassword.isEmpty()) {
      String currentPassword = request.currentPassword() == null ? "" : request.currentPassword().trim();
      if (currentPassword.isEmpty()) {
        throw new IllegalArgumentException("Current password is required to set a new password");
      }
      if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
        User saved = userRepository.save(user);
        return new ProfileUpdateResult(
          saved,
          "Profile updated, but password change failed: Current password incorrect."
        );
      }
      if (newPassword.length() < 6 || newPassword.length() > 72) {
        throw new IllegalArgumentException("password must be between 6 and 72 characters");
      }
      user.setPassword(passwordEncoder.encode(newPassword));
    }

    User saved = userRepository.save(user);
    return new ProfileUpdateResult(saved, null);
  }

  public record ProfileUpdateResult(User user, String profileUpdateMessage) {}

  @Transactional
  public UserDTO uploadProfilePhoto(String principalEmail, MultipartFile file) throws IOException {
    User user = userRepository
      .findByEmailIgnoreCase(principalEmail)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    String previousPath = user.getProfilePicturePath();
    String newPath = photoStorage.saveProfilePhoto(user.getId(), file);
    if (previousPath != null && !previousPath.isBlank() && !previousPath.equals(newPath)) {
      photoStorage.deleteStoredFile(previousPath);
    }
    user.setProfilePicturePath(newPath);
    return toUserDto(userRepository.save(user));
  }
}
