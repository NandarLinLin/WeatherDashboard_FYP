/* Author: Nandar Lin */
package com.weatherwise.weatherapi.service;

import com.weatherwise.weatherapi.dto.WeatherForecastDay;
import com.weatherwise.weatherapi.dto.WeatherForecastHour;
import com.weatherwise.weatherapi.dto.WeatherResponse;
import com.weatherwise.weatherapi.service.openweather.OpenWeatherCurrentResponse;
import com.weatherwise.weatherapi.service.openweather.OpenWeatherForecastResponse;
import com.weatherwise.weatherapi.service.openweather.OpenWeatherOneCallResponse;
import com.weatherwise.weatherapi.web.CityNotFoundException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class WeatherService {
  private final RestClient restClient;
  private final RestClient oneCallClient;
  private final String apiKey;

  public WeatherService(@Value("${openweathermap.api.key}") String apiKey) {
    this.apiKey = apiKey;
    this.restClient = RestClient.builder()
      .baseUrl("https://api.openweathermap.org/data/2.5")
      .build();
    this.oneCallClient = RestClient.builder()
      .baseUrl("https://api.openweathermap.org/data/3.0")
      .build();
  }

  public WeatherResponse getCurrentWeatherByCity(String city) {
    String encodedCity = URLEncoder.encode(city, StandardCharsets.UTF_8);

    try {
      OpenWeatherCurrentResponse response = restClient.get()
        .uri("/weather?q={city}&appid={key}&units=metric", encodedCity, apiKey)
        .retrieve()
        .body(OpenWeatherCurrentResponse.class);

      OpenWeatherForecastResponse forecastResponse = restClient.get()
        .uri("/forecast?q={city}&appid={key}&units=metric", encodedCity, apiKey)
        .retrieve()
        .body(OpenWeatherForecastResponse.class);

      if (response == null || response.main() == null || response.sys() == null) {
        throw new IllegalStateException("Weather provider returned an empty response");
      }

      String description = null;
      String conditionMain = "Unknown";
      String icon = null;
      if (response.weather() != null && !response.weather().isEmpty()) {
        var w0 = response.weather().getFirst();
        description = w0.description();
        if (w0.main() != null && !w0.main().isBlank()) {
          conditionMain = w0.main();
        }
        icon = w0.icon();
      }

      List<WeatherForecastDay> dailyForecast = buildDailyForecast(forecastResponse);
      List<WeatherForecastHour> hourlyForecast = buildHourlyForecast(forecastResponse);
      Integer rainChancePercent = deriveRainChancePercent(dailyForecast);
      Double uvIndex = fetchUvIndex(response.coord());
      if (rainChancePercent == null) rainChancePercent = 0;

      Double windSpeed = response.wind() != null ? response.wind().speed() : null;
      Integer visibilityMeters = response.visibility();

      int timezoneOffsetSeconds = 0;
      if (response.timezone() != null) {
        timezoneOffsetSeconds = response.timezone();
      } else if (forecastResponse != null && forecastResponse.city() != null) {
        timezoneOffsetSeconds = forecastResponse.city().timezone();
      }

      return new WeatherResponse(
        response.name() != null ? response.name() : city,
        response.main().temp(),
        description != null ? description : "Unavailable",
        conditionMain,
        icon,
        response.main().humidity(),
        timezoneOffsetSeconds,
        response.sys().sunrise(),
        response.sys().sunset(),
        rainChancePercent,
        uvIndex,
        windSpeed,
        visibilityMeters,
        dailyForecast,
        hourlyForecast
      );
    } catch (RestClientResponseException ex) {
      HttpStatusCode status = ex.getStatusCode();
      if (status != null && status.value() == 404) {
        throw new CityNotFoundException(city);
      }
      throw ex;
    }
  }

  private static Integer deriveRainChancePercent(List<WeatherForecastDay> dailyForecast) {
    if (dailyForecast == null || dailyForecast.isEmpty()) return 0;
    WeatherForecastDay first = dailyForecast.getFirst();
    Integer percent = first.precipitationProbabilityPercent();
    return percent != null ? percent : 0;
  }

  private static List<WeatherForecastDay> buildDailyForecast(OpenWeatherForecastResponse forecastResponse) {
    if (forecastResponse == null || forecastResponse.list() == null || forecastResponse.list().isEmpty()) {
      return List.of();
    }

    int timezoneOffsetSeconds = 0;
    if (forecastResponse.city() != null) {
      timezoneOffsetSeconds = forecastResponse.city().timezone();
    }
    ZoneOffset zoneOffset = ZoneOffset.ofTotalSeconds(timezoneOffsetSeconds);

    Map<LocalDate, List<OpenWeatherForecastResponse.ForecastItem>> byDate = new HashMap<>();
    for (OpenWeatherForecastResponse.ForecastItem item : forecastResponse.list()) {
      if (item == null) continue;
      LocalDateTime localDateTime = LocalDateTime.ofInstant(Instant.ofEpochSecond(item.dt()), zoneOffset);
      LocalDate date = localDateTime.toLocalDate();
      byDate.computeIfAbsent(date, ignored -> new ArrayList<>()).add(item);
    }

    DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("EEE", Locale.ENGLISH);
    List<LocalDate> dates = byDate.keySet().stream().sorted().toList();

    List<WeatherForecastDay> results = new ArrayList<>();
    for (LocalDate date : dates) {
      List<OpenWeatherForecastResponse.ForecastItem> items = byDate.get(date);
      if (items == null || items.isEmpty()) continue;

      double tempMin = items.stream().map(OpenWeatherForecastResponse.ForecastItem::main)
        .filter(m -> m != null)
        .mapToDouble(OpenWeatherForecastResponse.Main::temp_min)
        .min()
        .orElse(Double.NaN);

      double tempMax = items.stream().map(OpenWeatherForecastResponse.ForecastItem::main)
        .filter(m -> m != null)
        .mapToDouble(OpenWeatherForecastResponse.Main::temp_max)
        .max()
        .orElse(Double.NaN);

      OpenWeatherForecastResponse.ForecastItem representative = items.stream()
        .min(Comparator.comparingInt(item -> {
          LocalDateTime local = LocalDateTime.ofInstant(Instant.ofEpochSecond(item.dt()), zoneOffset);
          return Math.abs(local.getHour() - 12);
        }))
        .orElse(items.getFirst());

      String description = null;
      String icon = null;
      if (representative.weather() != null && !representative.weather().isEmpty()) {
        description = representative.weather().getFirst().description();
        icon = representative.weather().getFirst().icon();
      }

      Integer popPercent = null;
      Double pop = representative.pop();
      if (pop != null && !Double.isNaN(pop)) {
        popPercent = (int) Math.round(pop * 100.0);
      }

      results.add(new WeatherForecastDay(
        date.toString(),
        dayFormatter.format(date),
        tempMax,
        tempMin,
        icon,
        description,
        popPercent
      ));
    }

    return results;
  }

  private static List<WeatherForecastHour> buildHourlyForecast(OpenWeatherForecastResponse forecastResponse) {
    if (forecastResponse == null || forecastResponse.list() == null || forecastResponse.list().isEmpty()) {
      return List.of();
    }

    int timezoneOffsetSeconds = 0;
    if (forecastResponse.city() != null) {
      timezoneOffsetSeconds = forecastResponse.city().timezone();
    }
    ZoneOffset zoneOffset = ZoneOffset.ofTotalSeconds(timezoneOffsetSeconds);

    long nowEpochSeconds = Instant.now().getEpochSecond();
    long endEpochSeconds = nowEpochSeconds + (24L * 60L * 60L);

    DateTimeFormatter hourFormatter = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH);

    return forecastResponse.list().stream()
      .filter(Objects::nonNull)
      .filter(item -> item.dt() >= nowEpochSeconds && item.dt() <= endEpochSeconds)
      .sorted(Comparator.comparingLong(OpenWeatherForecastResponse.ForecastItem::dt))
      .map(item -> {
        Double temperature = null;
        if (item.main() != null) {
          double min = item.main().temp_min();
          double max = item.main().temp_max();
          if (!Double.isNaN(min) && !Double.isNaN(max)) {
            temperature = (min + max) / 2.0;
          } else if (!Double.isNaN(max)) {
            temperature = max;
          } else if (!Double.isNaN(min)) {
            temperature = min;
          }
        }

        String description = null;
        String icon = null;
        if (item.weather() != null && !item.weather().isEmpty() && item.weather().getFirst() != null) {
          description = item.weather().getFirst().description();
          icon = item.weather().getFirst().icon();
        }

        LocalDateTime localDateTime = LocalDateTime.ofInstant(Instant.ofEpochSecond(item.dt()), zoneOffset);
        String timeLabel = hourFormatter.format(localDateTime);

        return new WeatherForecastHour(item.dt(), timeLabel, temperature, icon, description);
      })
      .toList();
  }

  private Double fetchUvIndex(OpenWeatherCurrentResponse.Coord coord) {
    if (coord == null) return null;

    try {
      OpenWeatherOneCallResponse oneCall = oneCallClient.get()
        .uri(
          "/onecall?lat={lat}&lon={lon}&appid={key}&units=metric&exclude=minutely,hourly,daily,alerts",
          coord.lat(),
          coord.lon(),
          apiKey
        )
        .retrieve()
        .body(OpenWeatherOneCallResponse.class);

      if (oneCall == null || oneCall.current() == null) return null;
      return oneCall.current().uvi();
    } catch (RestClientResponseException ex) {
      return null;
    }
  }
}

