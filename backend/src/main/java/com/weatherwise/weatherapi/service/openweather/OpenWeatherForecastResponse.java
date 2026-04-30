/* Author: Nandar Lin */
package com.weatherwise.weatherapi.service.openweather;

import java.util.List;

public record OpenWeatherForecastResponse(
  City city,
  List<ForecastItem> list
) {
  public record City(int timezone) {}

  public record ForecastItem(
    long dt,
    Main main,
    java.util.List<Weather> weather,
    Double pop,
    String dt_txt
  ) {}

  public record Main(double temp_min, double temp_max) {}

  public record Weather(String description, String icon) {}
}

