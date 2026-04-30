/* Author: Nandar Lin */
package com.weatherwise.weatherapi.service.openweather;

public record OpenWeatherOneCallResponse(
  Current current
) {
  public record Current(Double uvi) {}
}

