/* Author: Nandar Lin */
package com.weatherwise.weatherapi.service;

import com.weatherwise.weatherapi.dto.WeatherResponse;
import com.weatherwise.weatherapi.dto.favorites.FavoriteCityResponse;
import com.weatherwise.weatherapi.model.FavoriteCity;
import com.weatherwise.weatherapi.model.User;
import com.weatherwise.weatherapi.repository.FavoriteCityRepository;
import com.weatherwise.weatherapi.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FavoriteCityService {
  private final FavoriteCityRepository favoriteCityRepository;
  private final UserRepository userRepository;
  private final WeatherService weatherService;

  public FavoriteCityService(
    FavoriteCityRepository favoriteCityRepository,
    UserRepository userRepository,
    WeatherService weatherService
  ) {
    this.favoriteCityRepository = favoriteCityRepository;
    this.userRepository = userRepository;
    this.weatherService = weatherService;
  }

  @Transactional
  public FavoriteCityResponse addFavoriteCity(String userEmail, String cityName) {
    String normalizedCity = normalizeCity(cityName);
    User user = requireUser(userEmail);

    favoriteCityRepository.findByUserIdAndCityNameIgnoreCase(user.getId(), normalizedCity)
      .ifPresent(existing -> {
        throw new IllegalArgumentException("City is already in favorites");
      });

    FavoriteCity favoriteCity = new FavoriteCity();
    favoriteCity.setCityName(normalizedCity);
    favoriteCity.setUser(user);

    FavoriteCity saved = favoriteCityRepository.save(favoriteCity);
    return new FavoriteCityResponse(saved.getId(), saved.getCityName(), null, null, null, null);
  }

  @Transactional(readOnly = true)
  public List<FavoriteCityResponse> getFavorites(String userEmail) {
    User user = requireUser(userEmail);

    List<FavoriteCity> cities = favoriteCityRepository.findAllByUserIdOrderByCityNameAsc(user.getId());
    List<FavoriteCityResponse> results = new ArrayList<>(cities.size());
    for (FavoriteCity city : cities) {
      results.add(toResponseWithLiveWeather(city));
    }
    return results;
  }

  @Transactional
  public void removeFavorite(String userEmail, Long favoriteId) {
    User user = requireUser(userEmail);

    long removed = favoriteCityRepository.deleteByIdAndUserId(favoriteId, user.getId());
    if (removed == 0) {
      throw new IllegalArgumentException("Favorite city not found");
    }
  }

  private User requireUser(String userEmail) {
    if (userEmail == null || userEmail.isBlank()) {
      throw new IllegalArgumentException("Unauthenticated request");
    }

    return userRepository.findByEmail(userEmail.trim())
      .orElseThrow(() -> new IllegalArgumentException("User not found"));
  }

  private static String normalizeCity(String cityName) {
    if (cityName == null) return "";
    return cityName.trim();
  }

  private FavoriteCityResponse toResponseWithLiveWeather(FavoriteCity city) {
    try {
      WeatherResponse w = weatherService.getCurrentWeatherByCity(city.getCityName());
      return new FavoriteCityResponse(
        city.getId(),
        city.getCityName(),
        w.temperatureCelsius(),
        w.description(),
        w.icon(),
        w.timezoneOffsetSeconds()
      );
    } catch (Exception ignored) {
      return new FavoriteCityResponse(city.getId(), city.getCityName(), null, null, null, null);
    }
  }
}

