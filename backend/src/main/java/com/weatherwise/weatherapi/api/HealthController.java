/* Author: Nandar Lin */
package com.weatherwise.weatherapi.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {
  @GetMapping("/health")
  public String health() {
    return "Backend is running on Java 21";
  }
}

