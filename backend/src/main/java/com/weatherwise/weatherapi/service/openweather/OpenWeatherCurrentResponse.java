/* Author: Nandar Lin */
package com.weatherwise.weatherapi.service.openweather;

import java.util.List;

public record OpenWeatherCurrentResponse(
  String name,
  Coord coord,
  Main main,
  Integer visibility,
  Wind wind,
  Sys sys,
  Clouds clouds,
  List<Weather> weather,
  /** Shift in seconds from UTC (OpenWeather `timezone`). */
  Integer timezone
) {
  public record Coord(double lat, double lon) {}
  public record Main(double temp, int humidity) {}
  public record Wind(Double speed) {}
  public record Sys(long sunrise, long sunset) {}
  public record Clouds(int all) {}
  /** OpenWeather condition group, e.g. {@code Clear}, {@code Clouds}, {@code Rain}. */
  public record Weather(String main, String description, String icon) {}
}

