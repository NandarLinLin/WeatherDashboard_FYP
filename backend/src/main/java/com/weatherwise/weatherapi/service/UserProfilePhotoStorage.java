/* Author: Nandar Lin */
package com.weatherwise.weatherapi.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserProfilePhotoStorage {
  private static final int MAX_BYTES = 3 * 1024 * 1024;
  private final Path uploadRoot;
  private final String publicBaseUrl;

  public UserProfilePhotoStorage(
    @Value("${app.uploads-dir:src/main/resources/static/uploads}") String uploadsDir,
    @Value("${app.public-base-url:http://localhost:8080}") String publicBaseUrl
  ) {
    this.uploadRoot = Path.of(uploadsDir).toAbsolutePath().normalize();
    this.publicBaseUrl = publicBaseUrl == null ? "" : publicBaseUrl.trim().replaceAll("/+$", "");
    try {
      Files.createDirectories(this.uploadRoot);
    } catch (IOException e) {
      throw new UncheckedIOException("Could not create uploads directory", e);
    }
  }

  public Path getUploadRoot() {
    return uploadRoot;
  }

  public String saveProfilePhoto(Long userId, MultipartFile file) throws IOException {
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("Photo file is required");
    }
    if (file.getSize() > MAX_BYTES) {
      throw new IllegalArgumentException("Photo must be at most 3 MB");
    }
    String contentType = file.getContentType() == null ? "" : file.getContentType().trim().toLowerCase();
    if (!contentType.startsWith("image/")) {
      throw new IllegalArgumentException("Photo must be an image file");
    }

    String extension = resolveExtension(file, contentType);
    String filename = "user-" + userId + "-" + UUID.randomUUID() + extension;
    Path target = uploadRoot.resolve(filename).normalize();
    if (!target.startsWith(uploadRoot)) {
      throw new IllegalArgumentException("Invalid upload path");
    }

    Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    return publicBaseUrl + "/uploads/" + filename;
  }

  public void deleteStoredFile(String profilePicturePath) {
    if (profilePicturePath == null || profilePicturePath.isBlank()) {
      return;
    }
    String marker = "/uploads/";
    int markerIndex = profilePicturePath.indexOf(marker);
    if (markerIndex < 0) {
      return;
    }
    String filename = profilePicturePath.substring(markerIndex + marker.length());
    if (filename.isBlank() || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
      return;
    }
    Path candidate = uploadRoot.resolve(filename).normalize();
    if (!candidate.startsWith(uploadRoot)) {
      return;
    }
    try {
      Files.deleteIfExists(candidate);
    } catch (IOException ignored) {
      // best-effort cleanup
    }
  }

  private static String resolveExtension(MultipartFile file, String contentType) {
    String original = file.getOriginalFilename();
    if (original != null) {
      int dot = original.lastIndexOf('.');
      if (dot >= 0 && dot < original.length() - 1) {
        return original.substring(dot).toLowerCase();
      }
    }
    if (contentType.contains("png")) {
      return ".png";
    }
    if (contentType.contains("webp")) {
      return ".webp";
    }
    if (contentType.contains("gif")) {
      return ".gif";
    }
    if (contentType.contains("jpeg") || contentType.contains("jpg")) {
      return ".jpg";
    }
    return ".bin";
  }
}
