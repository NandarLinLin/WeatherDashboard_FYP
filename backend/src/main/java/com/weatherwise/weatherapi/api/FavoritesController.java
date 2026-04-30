/* Author: Nandar Lin */
package com.weatherwise.weatherapi.api;

import com.weatherwise.weatherapi.dto.favorites.CreateFavoriteCityRequest;
import com.weatherwise.weatherapi.dto.favorites.FavoriteCityResponse;
import com.weatherwise.weatherapi.service.FavoriteCityService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/favorites")
public class FavoritesController {
  private final FavoriteCityService favoriteCityService;

  public FavoritesController(FavoriteCityService favoriteCityService) {
    this.favoriteCityService = favoriteCityService;
  }

  @PostMapping
  public FavoriteCityResponse addFavorite(@Valid @RequestBody CreateFavoriteCityRequest request, Principal principal) {
    return favoriteCityService.addFavoriteCity(requireUserEmail(principal), request.cityName());
  }

  @PostMapping("/save")
  public FavoriteCityResponse saveFavorite(@RequestParam String cityName, Principal principal) {
    return favoriteCityService.addFavoriteCity(requireUserEmail(principal), cityName);
  }

  @GetMapping
  public List<FavoriteCityResponse> getFavorites(Principal principal) {
    return favoriteCityService.getFavorites(requireUserEmail(principal));
  }

  @GetMapping("/all")
  public List<FavoriteCityResponse> getFavoritesAll(Principal principal) {
    return favoriteCityService.getFavorites(requireUserEmail(principal));
  }

  @DeleteMapping("/{favoriteId}")
  public void removeFavorite(@PathVariable Long favoriteId, Principal principal) {
    favoriteCityService.removeFavorite(requireUserEmail(principal), favoriteId);
  }

  private static String requireUserEmail(Principal principal) {
    if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
      throw new IllegalArgumentException("Unauthenticated request");
    }
    return principal.getName();
  }
}

