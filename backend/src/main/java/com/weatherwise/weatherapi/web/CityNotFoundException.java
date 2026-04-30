/* Author: Nandar Lin */
package com.weatherwise.weatherapi.web;

public class CityNotFoundException extends RuntimeException {
  private final String city;

  public CityNotFoundException(String city) {
    super("City not found");
    this.city = city;
  }

  public String getCity() {
    return city;
  }
}

