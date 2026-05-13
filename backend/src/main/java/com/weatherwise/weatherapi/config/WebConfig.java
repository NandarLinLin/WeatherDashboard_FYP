/* Author: Nandar Lin */
package com.weatherwise.weatherapi.config;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final Path uploadRoot;

  public WebConfig(@Value("${app.uploads-dir:src/main/resources/static/uploads}") String uploadsDir) {
    this.uploadRoot = Path.of(uploadsDir).toAbsolutePath().normalize();
    try {
      Files.createDirectories(this.uploadRoot);
    } catch (IOException e) {
      throw new UncheckedIOException("Could not create uploads directory", e);
    }
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    String location = uploadRoot.toUri().toString();
    if (!location.endsWith("/")) {
      location = location + "/";
    }
    registry.addResourceHandler("/uploads/**").addResourceLocations(location);
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
      .allowedOrigins("http://localhost:5173")
      .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
      .allowedHeaders("*")
      .allowCredentials(true)
      .maxAge(3600);
    registry.addMapping("/uploads/**")
      .allowedOrigins("http://localhost:5173")
      .allowedMethods("GET", "HEAD", "OPTIONS")
      .allowedHeaders("*")
      .maxAge(3600);
  }
}


