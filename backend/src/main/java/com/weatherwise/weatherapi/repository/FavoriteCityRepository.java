/* Author: Nandar Lin */
package com.weatherwise.weatherapi.repository;

import com.weatherwise.weatherapi.model.FavoriteCity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteCityRepository extends JpaRepository<FavoriteCity, Long> {
  List<FavoriteCity> findAllByUserIdOrderByCityNameAsc(Long userId);

  Optional<FavoriteCity> findByUserIdAndCityNameIgnoreCase(Long userId, String cityName);

  long deleteByIdAndUserId(Long id, Long userId);
}

