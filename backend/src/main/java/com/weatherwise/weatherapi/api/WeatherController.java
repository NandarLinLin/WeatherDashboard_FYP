/* Author: Nandar Lin */
package com.weatherwise.weatherapi.api;

import com.weatherwise.weatherapi.dto.WeatherResponse;
import com.weatherwise.weatherapi.service.WeatherService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {
  private final WeatherService weatherService;

  public WeatherController(WeatherService weatherService) {
    this.weatherService = weatherService;
  }

  @GetMapping("/{city}")
  public WeatherResponse getWeatherByCity(@PathVariable String city) {
    return weatherService.getCurrentWeatherByCity(city);
  }
}

